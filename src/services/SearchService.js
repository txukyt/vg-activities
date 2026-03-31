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

       // Calcular si hay más resultados
       const hasMore = offset + limit < totalCount;
       
       console.log('[SearchService] Resultado de búsqueda finalizado', {
         totalCenters: results.length,
         totalItems: totalCount,
         hasMore,
         offset,
         limit,
         nextOffsetWould: offset + limit,
         comparacion: `${offset + limit} < ${totalCount} = ${hasMore}`
       });

       // Retornar siempre estructura agrupada (aunque esté vacía)
       return {
         data: results,
         totalItems: totalCount,
         hasMore: hasMore,
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
   * Extrae el total de items de la respuesta SOLR.
   * @private
   */
  static #extractTotalCount(solrResponse) {
    return solrResponse.totalCount || 0;
  }

   /**
    * Obtiene una actividad específica por su ID desde el backend SOLR.
    * Backend-First Strategy: Consulta el backend para obtener la actividad completa
    * con todas sus sesiones, agrupadas por día.
    *
    * FLUJO:
    * 1. Llamar a SolrGateway.searchDetail() con activityId y centerId
    * 2. Procesar respuesta del backend: { results, totalCount }
    * 3. Extraer primera actividad del array results
    * 4. Agrupar sesiones por día de la semana
    * 5. Enriquecer con información del centro
    * 6. Retornar actividad enriquecida con sesiones agrupadas
    *
    * @param {string} activityId - ID de la actividad
    * @param {string} centerId - ID del centro
    * @returns {Promise<Object|null>} Actividad enriquecida con sessionsByDay
    */
   static async getActivityById(newFilters = {}, offset = 0, limit = 10) {
     try {

        const state = store.getState();
      const filters = state.filters;

      // PASO 1: Consultar backend SOLR para obtener la actividad
      const response = await SolrGateway.searchDetail({
        ...filters,
        ...newFilters },
        offset,
        limit);

       if (!response || !response.results || response.results.length === 0) {
         console.warn('[SearchService] Backend no devolvió actividad', {
           responseStructure: response ? Object.keys(response) : 'null'
         });
         return null;
       }

       // PASO 2: Extraer la actividad del array results
       // El backend retorna { results: [...], totalCount: n }
       // Cada elemento en results es una actividad con sus sesiones
       const rawActivity = response.results;

       if (!rawActivity) {
         console.warn('[SearchService] Primer resultado vacío', {
         });
         return null;
       }

       console.log('[SearchService] Actividad obtenida del backend', {
         name: rawActivity.name,
         sessionsCount: rawActivity.sessions?.length || 0
       });

       return rawActivity;

     } catch (error) {
       console.error('[SearchService] Error obteniendo actividad del backend:', {
         error: error.message
       });
       return null;
     }
   }
}
