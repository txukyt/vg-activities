/**
 * store.js
 * Gestor de estado global (Store pattern).
 * Centraliza el estado de la aplicación.
 */

import { FilterService } from './services/FilterService.js';

class Store {
   constructor() {
       this.state = {
         filters: FilterService.getDefaultFilters(),
         results: [],
         viewMode: 'grouped', // 'grouped' o 'list'
         loading: false,
         error: null,
         currentActivity: null,
         scrollPosition: 0,
         centers: [],
         activities: [],
         filtersDrawerOpen: false,  // Control de visibilidad del drawer de filtros en móvil
         pagination: {
           offset: 0,                // Número de items saltados
           limit: 10,               // Items por request (SOLR limit)
           totalItems: 0,            // Total descubierto
           hasMore: true,            // ¿Hay más resultados?
           isLoadingMore: false      // ¿Cargando más resultados?
         }
       };

       this.listeners = new Set();
     }

  /**
   * Obtiene una copia del estado actual.
   * @returns {Object} Copia del estado
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Actualiza el estado de forma reactividad.
   * @param {Object} newState - Objeto con las propiedades a actualizar
   * @emits change
   */
  setState(newState) {
    this.state = {
      ...this.state,
      ...newState
    };
    this.#notifyListeners();
  }

  /**
   * Actualiza solo los filtros, preservando el resto del estado.
   * @param {Object} newFilters - Objeto con los filtros a actualizar
   */
  setFilters(newFilters) {
    this.setState({
      filters: {
        ...this.state.filters,
        ...newFilters
      }
    });
  }

  /**
   * Actualiza los resultados de búsqueda.
   * @param {Array|Object} results - Resultados (puede ser array o estructura agrupada)
   * @param {string} viewMode - Modo de visualización ('grouped' o 'list')
   */
  setResults(results, viewMode = 'list') {
    this.setState({
      results,
      viewMode,
      error: null
    });
  }

  /**
   * Establece el estado de carga.
   * @param {boolean} loading - true si está cargando
   */
  setLoading(loading) {
    this.setState({ loading });
  }

  /**
   * Establece un error en el estado.
   * @param {string|null} error - Mensaje de error o null
   */
  setError(error) {
    this.setState({ error });
  }

  /**
   * Establece la actividad actual (cuando se visita el detalle).
   * @param {Object|null} activity - Actividad o null
   */
  setCurrentActivity(activity) {
    this.setState({ currentActivity: activity });
  }

  /**
   * Guarda la posición del scroll para restaurarla después.
   * @param {number} position - Posición del scroll
   */
  saveScrollPosition(position) {
    this.state.scrollPosition = position; // No notifica cambios
  }

  /**
   * Obtiene la posición del scroll guardada.
   * @returns {number} Posición del scroll
   */
  getScrollPosition() {
    return this.state.scrollPosition;
  }

   /**
    * Establece la lista de centros disponibles.
    * @param {Array} centers - Array de centros
    */
   setCenters(centers) {
     this.setState({ centers });
   }

   /**
    * Establece la lista de actividades disponibles.
    * @param {Array} activities - Array de actividades
    */
   setActivities(activities) {
     this.setState({ activities });
   }

  /**
   * Establece el estado de visibilidad del drawer de filtros en móvil.
   * @param {boolean} isOpen - true para abrir, false para cerrar
   */
  setFiltersDrawerOpen(isOpen) {
    this.setState({ filtersDrawerOpen: isOpen });
  }

  /**
   * Obtiene el estado de visibilidad del drawer de filtros.
   * @returns {boolean} true si el drawer está abierto
   */
  getFiltersDrawerOpen() {
    return this.state.filtersDrawerOpen;
  }

  /**
   * Obtiene la lista de centros disponibles.
   * @returns {Array} Array de centros
   */
  getCenters() {
    return this.state.centers;
  }

  /**
   * Obtiene la lista de actividades disponibles.
   * @returns {Array} Array de actividades
   */
  getActivities() {
    return this.state.activities;
  }

  /**
   * Alterna el estado de visibilidad del drawer de filtros.
   */
  toggleFiltersDrawer() {
    this.setState({ filtersDrawerOpen: !this.state.filtersDrawerOpen });
  }

  /**
   * Reestablece los filtros a sus valores por defecto.
   */
  resetFilters() {
    this.setFilters(FilterService.getDefaultFilters());
    // Reset paginación cuando se limpian filtros
    this.setPaginationOffset(0);
  }

  /**
   * Establece el offset de paginación para infinite scroll.
   * @param {number} offset - Número de items a saltar
   */
  setPaginationOffset(offset) {
    this.setState({
      pagination: {
        ...this.state.pagination,
        offset
      }
    });
  }

  /**
   * Actualiza metadata de paginación (totalItems, hasMore).
   * @param {Object} paginationData - { totalItems, hasMore }
   */
  updatePaginationMetadata(paginationData) {
    this.setState({
      pagination: {
        ...this.state.pagination,
        ...paginationData
      }
    });
  }

  /**
   * Establece flag de carga de más resultados.
   * @param {boolean} isLoading
   */
  setIsLoadingMore(isLoading) {
    this.setState({
      pagination: {
        ...this.state.pagination,
        isLoadingMore: isLoading
      }
    });
  }

  /**
   * Se suscribe a cambios de estado.
   * @param {Function} listener - Función callback que se ejecutará en cada cambio
   * @returns {Function} Función para desuscribilnse
   */
  subscribe(listener) {
    this.listeners.add(listener);
    
    // Retornar función unsubscribe
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifica a todos los listeners de cambios de estado.
   * @private
   */
  #notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error en listener de Store:', error);
      }
    });
  }
}

// Exportar instancia singleton
export const store = new Store();
