/**
 * CenterFilterObserver.js
 * Patrón Observer para el filtro de Centre.
 * Implementa la lógica de agrupación visual con búsqueda interna.
 */

import { FilterService } from './FilterService.js';

export class CenterFilterObserver {
  constructor() {
    this.observers = [];
    this.centersGrouped = {};
    this.centersFlat = [];
    this.searchText = '';
    this.viewMode = 'grouped'; // 'grouped' o 'flat'
  }

  /**
   * Inicializa el observer con las actividades disponibles.
   * @param {Array} activities - Array de actividades
   */
  initialize(activities) {
    this.centersGrouped = FilterService.getCentersGrouped(activities);
    this.centersFlat = FilterService.getCentersFlat(activities);
    this.notifyObservers();
  }

  /**
   * Establece el texto de búsqueda y notifica.
   * @param {string} text - Texto de búsqueda
   */
  setSearchText(text) {
    this.searchText = text;
    this._updateViewMode();
    this.notifyObservers();
  }

  /**
   * Actualiza el modo de vista según si hay búsqueda.
   * @private
   */
  _updateViewMode() {
    if (this.searchText.trim() === '') {
      this.viewMode = 'grouped';
    } else {
      this.viewMode = 'flat';
    }
  }

  /**
   * Obtiene las opciones a mostrar basada en el modo actual.
   * @returns {Object} { mode: 'grouped'|'flat', data: {...} o [...] }
   */
  getDisplayOptions() {
    if (this.viewMode === 'grouped') {
      return {
        mode: 'grouped',
        data: this.centersGrouped
      };
    } else {
      // Vista plana con búsqueda
      const filtered = FilterService.filterOptions(this.centersFlat, this.searchText);
      return {
        mode: 'flat',
        data: filtered
      };
    }
  }

  /**
   * Se suscribe a cambios del observer.
   * @param {Function} observer - Función callback
   * @returns {Function} Función para desuscribirse
   */
  subscribe(observer) {
    this.observers.push(observer);
    
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Notifica a todos los observers.
   * @private
   */
  notifyObservers() {
    const displayOptions = this.getDisplayOptions();
    this.observers.forEach(observer => {
      try {
        observer(displayOptions);
      } catch (error) {
        console.error('Error en CenterFilterObserver callback:', error);
      }
    });
  }

  /**
   * Obtiene un resumen del estado actual.
   * @returns {Object} Estado del observer
   */
  getState() {
    return {
      searchText: this.searchText,
      viewMode: this.viewMode,
      centersCount: this.centersFlat.length,
      displayOptions: this.getDisplayOptions()
    };
  }
}

// Exportar instancia singleton
export const centerFilterObserver = new CenterFilterObserver();
