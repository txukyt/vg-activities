export class SolrGateway {
  /**
   * URL base del backend SOLR
   * @type {string}
   */
  static #BACKEND_URL = '/m01-10s/api/search.do';

  /**
   * Timeout para peticiones HTTP (ms)
   * @type {number}
   */
  static #REQUEST_TIMEOUT = 30000;

  /**
   * Realiza una búsqueda con filtros contra el backend SOLR.
   * Soporta dos tipos de búsqueda mediante filters.searchType:
   * - 'general': Búsqueda de actividades con filtros libres (default)
   * - 'detail': Búsqueda de detalle de una actividad específica
   *
   * @param {Object} filters - Objeto con los filtros aplicados
   * @param {string} filters.searchType - Tipo de búsqueda: 'general' o 'detail' (default: 'general')
   * @param {string} filters.searchText - Texto libre de búsqueda (búsqueda general)
   * @param {Array} filters.activity - IDs de actividades seleccionadas
   * @param {Array} filters.center - IDs de centros seleccionados
   * @param {Array} filters.dayOfWeek - Días de la semana seleccionados
   * @param {Array} filters.timeSlot - Horarios seleccionados
   * @param {Array} filters.language - Idiomas seleccionados
   * @param {number} filters.age - Edad (opcional)
   * @param {boolean} filters.hasAvailableSpots - Solo actividades con plazas libres
   * @param {string} filters.activityId - ID de la actividad (búsqueda detail)
   * @param {string} filters.centerId - ID del centro (búsqueda detail)
   * @param {number} offset - Items a saltar para paginación (default: 0)
   * @param {number} limit - Máximo items a devolver (default: 10)
   *
   * @returns {Promise<Object>} Respuesta del backend SOLR
   * @throws {Error} Si la petición falla
   *
   * @example
   * // Búsqueda general
   * const response = await SolrGateway.search(
   *   { searchType: 'general', searchText: 'yoga', center: ['bizan'], hasAvailableSpots: true },
   *   0,
   *   10
   * );
   *
   * @example
   * // Búsqueda de detalle
   * const response = await SolrGateway.search(
   *   { searchType: 'detail', activityId: 'ACT-123', centerId: 'CENTER-456' },
   *   0
   * );
   */
  static async search(filters = {}, offset = 0, limit = 10) {
    // Determinar el tipo de búsqueda
    const searchType = filters.searchType || 'general';
    
    const payload = {
      searchType,
      filters: {
        searchText: filters.searchText || '',
        activity: Array.isArray(filters.activity) ? filters.activity : [],
        center: Array.isArray(filters.center) ? filters.center : [],
        program: Array.isArray(filters.program) ? filters.program : [],
        dayOfWeek: Array.isArray(filters.dayOfWeek) ? filters.dayOfWeek : [],
        timeSlot: Array.isArray(filters.timeSlot) ? filters.timeSlot : [],
        language: Array.isArray(filters.language) ? filters.language : [],
        age: filters.age !== undefined ? filters.age : null,
        hasAvailableSpots: filters.hasAvailableSpots === true,
        // Campos para búsqueda de detalle
        activityId: filters.activityId || null,
        centerId: filters.centerId || null,
        scheduleId: filters.scheduleId || ''
      },
      pagination: {
        offset: Math.max(0, parseInt(offset, 10)) || 0,
        limit: (limit === -1) ? -1 : Math.max(1, Math.min(100, parseInt(limit, 10))) || 10
      }
    };

    console.log('[SolrGateway] Enviando búsqueda al backend', {
      url: this.#BACKEND_URL,
      payload
    });

    try {
      const response = await this.#fetchWithTimeout(
        this.#BACKEND_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        },
        this.#REQUEST_TIMEOUT
      );

      console.log('[SolrGateway] Respuesta recibida', {
        status: response.status,
        contentLength: response.headers?.get?.('content-length')
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('[SolrGateway] Datos parseados', {
        resultsCount: data.results?.length ||  0,
        totalCount: data.totalCount || 0,
        hasFacets: !!data.facets || false
      });

      return data;
    } catch (error) {
      console.error('[SolrGateway] Error en búsqueda', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Realiza una búsqueda de detalle para obtener una actividad específica y sus sesiones.
   * Es un wrapper sobre search() que pre-configura los parámetros para modo 'detail'.
   *
   * @param {string} activityId - ID de la actividad a obtener
   * @param {string} centerId - ID del centro (para validación/filtrado)
   * @returns {Promise<Object>} Respuesta del backend con estructura: { results, totalCount }
   * @throws {Error} Si la petición falla
   *
   * @example
   * const response = await SolrGateway.searchDetail('ACT-123', 'CENTER-456');
   * // Retorna: { results: [{activity con sesiones}], totalCount: 1 }
   */
  static async searchDetail(filters = {}, offset = 0, limit = 10) {
    try {
      console.log('[SolrGateway] Buscando detalle de actividad');

      const response = await this.search(filters, offset, limit);

      console.log('[SolrGateway] Respuesta de búsqueda de detalle', {
        resultsCount: response.results?.length || 0,
        totalCount: response.totalCount || 0
      });

      return response;
    } catch (error) {
      console.error('[SolrGateway] Error en búsqueda de detalle', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Realiza una petición HTTP con timeout.
   * @private
   * @param {string} url - URL a consultar
   * @param {Object} options - Opciones de fetch
   * @param {number} timeout - Timeout en ms
   * @returns {Promise<Response>}
   */
  static async #fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
