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
    * 3. Agrupa por Centro → Actividad → Sesiones
    * REGLA DE NEGOCIO CRÍTICA: SIEMPRE agrupa por centro y actividad.
    * Soporta infinite scroll con offset y limit.
    *
    * @param {Object} filters - Objeto con los filtros aplicados
    * @param {string} filters.searchText - Texto libre de búsqueda
    * @param {Array} filters.activity - IDs de actividades (vacío si no seleccionado)
    * @param {Array} filters.center - IDs de centros (vacío si no seleccionado)
    * @param {Array} filters.dayOfWeek - Días de la semana
    * @param {Array} filters.timeSlot - Horarios
    * @param {Array} filters.language - Idiomas
    * @param {number} filters.maxAge - Edad máxima (opcional)
    * @param {boolean} filters.hasAvailableSpots - Solo mostrar actividades con plazas libres
    * @param {number} offset - Items a saltar para infinite scroll (default: 0)
    * @param {number} limit - Máximo items a devolver (default: 10)
    *
    * @returns {Promise<Object>} { data, viewMode, totalItems, hasMore, offset, limit }
    */
  static async search(filters = {}, offset = 0, limit = 10) {
    try {
      console.log('[SearchService] Iniciando búsqueda contra backend SOLR', {
        filters: JSON.stringify(filters),
        offset,
        limit
      });

      // PASO 1: Consultar el backend SOLR
      const solrResponse = await SolrGateway.search(filters, offset, limit);

       console.log('[SearchService] Respuesta recibida del backend', {
         resultsCount: solrResponse.results?.length || 0,
         totalCount: solrResponse.totalCount || 0,
         hasFacets: !!solrResponse.facets
       });

       // PASO 2: Procesar facetas y guardar en store
       // Las facetas permitirán actualizar dinámicamente el panel de filtros
       const facets = FacetsService.parseFacetsFromBackend(solrResponse);
       if (facets) {
         console.log('[SearchService] Guardando facetas en store', {
           facetTypes: Object.keys(facets).join(', ')
         });
         store.setFacets(facets);
       }

       // PASO 3: Transformar respuesta SOLR según estructura
       // La estructura de solrResponse dependerá de cómo el backend retorne los datos.
       // Soportar múltiples formatos genéricamente:
       // - { results: [...], totalCount, facets, ... }
       // - { docs: [...], numFound, facets_counts, ... }
       const results = this.#extractResults(solrResponse);
       const totalCount = this.#extractTotalCount(solrResponse);

      console.log('[SearchService] Datos extraídos de respuesta SOLR', {
        extractedResults: results.length,
        extractedTotalCount: totalCount
      });

        // PASO 4: Transformar resultados al formato esperado si es necesario
        // Si el backend retorna estructura plana (con sessionId), enriquecer y agrupar
        const enrichedSessions = this.#transformResults(results);

        console.log('[SearchService] Sesiones enriquecidas', {
          totalSessions: enrichedSessions.length
        });

        // PASO 5: REGLA DE NEGOCIO CRÍTICA: Agrupar por Centro → Actividad → Sesiones
       if (enrichedSessions.length > 0) {
         const groupedData = this.#groupByCenter(enrichedSessions);

        console.log('[SearchService] Datos agrupados por centro', {
          totalCenters: groupedData.length,
          centerNames: groupedData.map(g => g.center.name)
        });

        return {
          data: groupedData,
          viewMode: 'grouped',
          totalItems: totalCount,
          hasMore: offset + limit < totalCount,
          offset,
          limit,
          facets: solrResponse.facets || solrResponse.facets_counts || null
         };
       } else {
         return {
           data: enrichedSessions,
           viewMode: 'list',
           totalItems: totalCount,
           hasMore: offset + limit < totalCount,
           offset,
           limit,
           facets: solrResponse.facets || solrResponse.facets_counts || null
         };
       }
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
     return solrResponse.results || solrResponse.docs || [];
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
       const center = centers.find(c => c.id === session.centerId);
       const activity = activities.find(a => a.id === session.activityId);

       // Si no existen, registrar warning pero retornar sesión sin enriquecer
       if (!center || !activity) {
         console.warn('[SearchService] Centro o actividad no encontrados al enriquecer sesión', {
           sessionId: session.sessionId,
           centerId: session.centerId,
           activityId: session.activityId,
           centerFound: !!center,
           activityFound: !!activity
         });
         return session; // Retornar original
       }

       // Enriquecer con nombres
       return {
         ...session,
         centerName: center.name,
         activityName: activity.title
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
    return solrResponse.totalCount || solrResponse.numFound || 0;
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

     const firstResult = results[0];

     // Detectar si es formato plano (con sessionId)
     const isFlatFormat = firstResult.sessionId !== undefined;

     if (isFlatFormat) {
       // Detectar sesiones mínimas (tienen IDs pero no nombres enriquecidos)
       const isMinimalFormat =
         firstResult.sessionId &&
         firstResult.activityId &&
         firstResult.centerId &&
         !firstResult.centerName; // No enriquecido aún

       if (isMinimalFormat) {
         // NUEVO FORMATO: Enriquecer cada sesión con nombres desde store
         console.log('[SearchService] Detectado formato mínimo. Enriqueciendo sesiones...', {
           totalSessions: results.length
         });

         return results.map((session, index) => {
           const enriched = this.#enrichSessionData(session);
           if (index === 0) {
             console.log('[SearchService] Sesión enriquecida (muestra):', {
               original: { sessionId: session.sessionId, activityId: session.activityId, centerId: session.centerId },
               enriched: { centerName: enriched.centerName, activityName: enriched.activityName }
             });
           }
           return enriched;
         });
       } else {
         // Formato plano ya enriquecido, retornar como está
         return results;
       }
     } else if (firstResult.sessions && Array.isArray(firstResult.sessions)) {
       // Formato anidado: expandir sesiones
       return this.#flattenActivitiesWithSessions(results);
     } else {
       // Formato desconocido, retornar as is
       return results;
     }
   }

  /**
   * Expande actividades con sesiones a formato plano (sesión por item).
   * @private
   */
  static #flattenActivitiesWithSessions(activities) {
    const flatArray = [];

    activities.forEach(activity => {
      if (activity.sessions && Array.isArray(activity.sessions)) {
        activity.sessions.forEach(session => {
          flatArray.push({
            id: activity.id,
            sessionId: session.id,
            title: activity.title,
            center: activity.center,
            centerName: activity.centerName,
            centerType: activity.centerType,
            description: activity.description,
            image: activity.image,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            dayOfWeek: session.dayOfWeek,
            timeSlot: session.timeSlot,
            schedule: session.schedule,
            format: session.format,
            audience: session.audience,
            language: session.language,
            age: session.age,
            availableSpots: session.availableSpots,
            totalSpots: session.totalSpots
          });
        });
      }
    });

    return flatArray;
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
         id: sessions[0].sessionId,
         centerId: sessions[0].centerId,
         activityId: sessions[0].activityId,
         hasEnrichedNames: !!sessions[0].centerName && !!sessions[0].activityName
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
         const centerId = item.center || item.centerId || 'unknown';
         const centerName = item.centerName || item.center || 'Unknown Center';

         if (!centerMap.has(centerId)) {
           centerMap.set(centerId, {
             center: {
               id: centerId,
               name: centerName
             },
             activities: []
           });
         }

         centerMap.get(centerId).activities.push(item);
       });
     }

      // PASO 5: Convertir Map a Array y ordenar
      const result = Array.from(centerMap.values());

      // Ordenar por nombre de centro (con safe check para undefined)
      result.sort((a, b) => {
        const nameA = a.center?.name || '';
        const nameB = b.center?.name || '';
        return nameA.localeCompare(nameB);
      });

     console.log('[SearchService] Agrupación completada', {
       totalCenters: result.length,
       totalActivities: result.reduce((sum, g) => sum + g.activities.length, 0),
       totalSessions: result.reduce((sum, g) => sum + g.activities.reduce((subsum, a) => subsum + a.sessions.length, 0), 0)
     });

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
