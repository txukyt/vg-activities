/**
 * SearchService.js (v3 - Sesiones + Enriquecimiento desde Store)
 * Orquestador de búsqueda que consulta el backend SOLR.
 * - Recibe sesiones mínimas (sessionId, activityId, centerId)
 * - Enriquece con nombres (centerName, activityName) desde el store
 * - Agrupa por Centro → Actividad → Sesiones (jerárquico)
 * Patrón: Service Layer + Repository Pattern
 */

import { SolrGateway } from './SolrGateway.js';
import { FacetsService } from './FacetsService.js';
import { store } from '../store.js';

export class SearchService {
   /**
    * Ejecuta una búsqueda contra el backend SOLR.
    * FLUJO:
    * 1. Consulta sesiones mínimas al backend
    * 2. Enriquece con centerName y activityName desde el store
    * 3. Agrupa por Centro → Actividad → Sesiones (SIEMPRE)
    * Soporta infinite scroll con offset y limit.
    *
    * @param {Object} filters - Objeto con los filtros aplicados
    * @param {string} filters.searchText - Texto libre de búsqueda
    * @param {Array} filters.activity - IDs de actividades (vacío si no seleccionado)
    * @param {Array} filters.center - IDs de centros (vacío si no seleccionado)
    * @param {Array} filters.dayOfWeek - Días de la semana
    * @param {Array} filters.timeSlot - Horarios
    * @param {Array} filters.language - Idiomas
    * @param {number} filters.age - Edad (opcional)
    * @param {boolean} filters.hasAvailableSpots - Solo mostrar actividades con plazas libres
    * @param {number} offset - Items a saltar para infinite scroll (default: 0)
    * @param {number} limit - Máximo items a devolver (default: 10)
    *
    * @returns {Promise<Object>} { data, totalItems, hasMore, offset, limit }
    */
  static async search(filters = {}, offset = 0, limit = 10) {
    try {
      console.log('[SearchService] Iniciando búsqueda contra backend SOLR', {
        filters: JSON.stringify(filters),
        offset,
        limit
      });

      const solrResponse = await SolrGateway.search(filters, offset, limit);

      console.log('[SearchService] Respuesta recibida del backend', {
        resultsCount: solrResponse.results?.length || 0,
        totalCount: solrResponse.totalCount || 0,
        hasFacets: !!solrResponse.facets
      });
      
      const totalCount = this.#extractTotalCount(solrResponse);
      const facets = FacetsService.parseFacetsFromBackend(solrResponse);
      const results = this.#extractResults(solrResponse);

      const enrichedSessions = this.#transformResults(results);

        console.log('[SearchService] Sesiones enriquecidas', {
          totalSessions: enrichedSessions.length
        });

        // PASO 5: REGLA DE NEGOCIO CRÍTICA: Agrupar por Centro → Actividad → Sesiones (SIEMPRE)
       const groupedData = this.#groupByCenter(enrichedSessions);

       console.log('[SearchService] Datos agrupados por centro', {
         totalCenters: groupedData.length,
         centerNames: groupedData.map(g => g.center.name)
       });

       // Retornar siempre estructura agrupada (aunque esté vacía)
       return {
         data: groupedData,
         totalItems: totalCount,
         hasMore: offset + limit < totalCount,
         offset,
         limit,
         facets: facets
       };
    } catch (error) {
      console.error('[SearchService] Error en búsqueda', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

   /**
    * Extrae los resultados de la respuesta SOLR.
    * Soporta múltiples formatos de respuesta.
    * @private
    */
   static #extractResults(solrResponse) {
     // Soportar múltiples formatos de respuesta
     return solrResponse.results || [];
   }

   /**
    * Enriquece una sesión mínima agregando nombres desde el store.
    * Busca el nombre del centro y título de la actividad.
    * 
    * @param {Object} session - Sesión con estructura mínima (IDs)
    * @returns {Object} Sesión enriquecida con centerName y activityName
    * @private
    */
   static #enrichSessionData(session) {
     try {
       const centers = store.getCenters();
       const activities = store.getActivities();

       // Buscar centro y actividad por ID
       const center = centers.find(c => Number(c.id) === session.center.id);
       const activity = activities.find(a => a.id === session.activity.id);

       // Si no existen, registrar warning pero retornar sesión sin enriquecer
       if (!center || !activity) {
         console.warn('[SearchService] Centro o actividad no encontrados al enriquecer sesión', {
           sessionId: session.id,
           centerId: session.center.id,
           activityId: session.activity.id,
           centerFound: !!center,
           activityFound: !!activity
         });
         return session; // Retornar original
       }

       // Enriquecer con nombres
       return {
         ...session,
         center: {
          ...session.center,
          name: center.name 
        },
         activity: {
          ...session.activity,
          name: activity.name 
        }
       };
     } catch (error) {
       console.error('[SearchService] Error enriqueciendo sesión', {
         sessionId: session.sessionId,
         error: error.message
       });
       return session; // Retornar original en caso de error
     }
   }

  /**
   * Extrae el total de items de la respuesta SOLR.
   * @private
   */
  static #extractTotalCount(solrResponse) {
    return solrResponse.totalCount || 0;
  }

   /**
    * Transforma los resultados recibidos del backend al formato esperado.
    * Si son sesiones mínimas (solo IDs), enriquece con nombres desde el store.
    * Si son estructura plana ya enriquecida, mantiene como está.
    * Si son anidados (cada item es una actividad con sesiones), expande si es necesario.
    * @private
    */
   static #transformResults(results) {
    if (results.length === 0) return [];

     
    return results.map((session, index) => {
      const enriched = this.#enrichSessionData(session);
      if (index === 0) {
        console.log('[SearchService] Sesión enriquecida (muestra):', {
          original: { sessionId: session.id, activityId: session.activity.id, centerId: session.center.id },
          enriched: { centerName: enriched.center.name, activityName: enriched.activity.name }
        });
      }
      return enriched;
    });
   }

   /**
    * Agrupa sesiones por Centro y luego por Actividad.
    * Estructura jerárquica: Centro → Actividades → Sesiones
    * @private
    */
   static #groupByCenter(sessions) {
     console.log('[SearchService] Iniciando agrupación por centro y actividad', {
       totalSessions: sessions.length,
       sampleSession: sessions.length > 0 ? {
         id: sessions[0].id,
         centerId: sessions[0].center.id,
         activityId: sessions[0].activity.id,
         hasEnrichedNames: !!sessions[0].center.name && !!sessions[0].activity.name
       } : null
     });

     // Detectar si es formato plano (con sessionId)
     const isFlatFormat = sessions.length > 0 && sessions[0].sessionId !== undefined;

     console.log('[SearchService] Formato detectado:', isFlatFormat ? 'PLANO (SESIONES)' : 'ANIDADO (ACTIVIDADES)');

     const centerMap = new Map();

     if (isFlatFormat) {
       // ===== FORMATO PLANO: Cada item es una sesión individual =====
       // Jerarquía: Centro → Actividad → Sesiones

       sessions.forEach(session => {
         // Saltar sesiones sin plazas disponibles (si aplica)
         if (session.availableSpots !== undefined && session.availableSpots <= 0) {
           return;
         }

         const { centerId, centerName, activityId, activityName } = session;

         // PASO 1: Asegurar estructura de Centro
         if (!centerMap.has(centerId)) {
           centerMap.set(centerId, {
             center: {
               id: centerId,
               name: centerName
             },
             activitiesMap: new Map() // Mapa temporal para agrupar actividades
           });
         }

         const centerGroup = centerMap.get(centerId);

         // PASO 2: Asegurar estructura de Actividad dentro del Centro
         if (!centerGroup.activitiesMap.has(activityId)) {
           centerGroup.activitiesMap.set(activityId, {
             id: activityId,
             title: activityName,
             centerName: centerName,  // Preservar nombre del centro
             description: session.description || '',  // Preservar descripción
             sessions: []
           });
         }

         // PASO 3: Agregar Sesión a la Actividad
         const activity = centerGroup.activitiesMap.get(activityId);
         activity.sessions.push(session);
       });

       // PASO 4: Convertir Maps a Arrays
       Array.from(centerMap.values()).forEach(centerGroup => {
         centerGroup.activities = Array.from(centerGroup.activitiesMap.values());
         delete centerGroup.activitiesMap; // Limpiar mapa temporal
       });
     } else {
       // ===== FORMATO ANIDADO O GENÉRICO =====
       // Si las sesiones ya vienen como estructura anidada, procesarlas diferentemente
       sessions.forEach(item => {

        const { center, activity } = item;

         if (!centerMap.has(center.id)) {
           centerMap.set(center.id, {
             center: {
               id: center.id,
               name: center.name
             },
             activitiesMap: new Map() 
           });
         }

         const centerAux = centerMap.get(center.id);

         if (!centerAux.activitiesMap.has(activity.id)) {
           centerAux.activitiesMap.set(activity.id, {
             id: activity.id,
             name: activity.name,
             description: activity.description,
             sessions: []
           });
         }

         const activityAux = centerAux.activitiesMap.get(activity.id);

         activityAux.sessions.push(item);      
         
        });
        Array.from(centerMap.values()).forEach(centerGroup => {
          centerGroup.activities = Array.from(centerGroup.activitiesMap.values());
          delete centerGroup.activitiesMap; // Limpiar mapa temporal
        });
     }

      // PASO 5: Convertir Map a Array y ordenar
      const result = Array.from(centerMap.values());


     return result;
   }

  /**
   * Obtiene una actividad específica por su ID desde el store.
   * NOTA: Por ahora usa el store. Cuando el backend exponga un endpoint
   * /m01-10s/api/activity/{id}, adaptar para consultar allí.
   * 
   * @param {number} id - ID de la actividad
   * @returns {Promise<Object|null>} Actividad o null si no existe
   */
  static async getActivityById(id) {
    try {
      console.log('[SearchService] Obteniendo actividad por ID', { id });

      // Por ahora, obtener del store (datos ya cargados)
      const activities = store.getActivities();
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      const activity = activities.find(a => a.id === numId);

      console.log('[SearchService] Actividad encontrada:', {
        id,
        found: !!activity
      });

      return activity || null;
    } catch (error) {
      console.error('[SearchService] Error obteniendo actividad:', {
        error: error.message
      });
      throw error;
    }
  }
}
