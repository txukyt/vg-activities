/**
 * SolrGateway.js
 * Gateway para comunicación con el backend SOLR en /m01-10s/api/search.do
 * Abstrae las llamadas HTTP y proporciona métodos para búsqueda con filtros.
 * 
 * NOTA: Esta clase es agnóstica al formato exacto de la respuesta SOLR.
 * Cuando el contrato backend esté definido, adaptar según estructura real.
 */

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
   * 
   * @param {Object} filters - Objeto con los filtros aplicados
   * @param {string} filters.searchText - Texto libre de búsqueda
   * @param {Array} filters.activity - IDs de actividades seleccionadas
   * @param {Array} filters.center - IDs de centros seleccionados
   * @param {Array} filters.dayOfWeek - Días de la semana seleccionados
   * @param {Array} filters.timeSlot - Horarios seleccionados
   * @param {Array} filters.language - Idiomas seleccionados
   * @param {number} filters.maxAge - Edad máxima (opcional)
   * @param {boolean} filters.hasAvailableSpots - Solo actividades con plazas libres
   * @param {number} offset - Items a saltar para paginación (default: 0)
   * @param {number} limit - Máximo items a devolver (default: 10)
   * 
   * @returns {Promise<Object>} Respuesta del backend SOLR
   * @throws {Error} Si la petición falla
   * 
   * @example
   * const response = await SolrGateway.search(
   *   { searchText: 'yoga', center: ['bizan'], hasAvailableSpots: true },
   *   0,
   *   10
   * );
   */
  static async search(filters = {}, offset = 0, limit = 10) {
    const payload = {
      filters: {
        searchText: filters.searchText || '',
        activity: Array.isArray(filters.activity) ? filters.activity : [],
        center: Array.isArray(filters.center) ? filters.center : [],
        dayOfWeek: Array.isArray(filters.dayOfWeek) ? filters.dayOfWeek : [],
        timeSlot: Array.isArray(filters.timeSlot) ? filters.timeSlot : [],
        language: Array.isArray(filters.language) ? filters.language : [],
        maxAge: filters.maxAge !== undefined ? filters.maxAge : null,
        hasAvailableSpots: filters.hasAvailableSpots === true
      },
      pagination: {
        offset: Math.max(0, parseInt(offset, 10)) || 0,
        limit: Math.max(1, Math.min(100, parseInt(limit, 10))) || 10
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
