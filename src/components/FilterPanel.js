/**
 * FilterPanel.js
 * Componente que renderiza todos los filtros (Sección B).
 * Incluye 5 filtros: Actividad, Centro, Día Semana, Horario, Idioma.
 */

import { store } from '../store.js';
import { FilterService } from '../services/FilterService.js';
import { FacetsService } from '../services/FacetsService.js';
import { FilterItem } from './FilterItem.js';

export class FilterPanel {
  constructor(onFilterChange) {
    this.onFilterChange = onFilterChange;
    this.filterItems = {};
    this.activities = [];
    this.previousFilters = { center: [], activity: [] }; // Para detectar cambios
    this.previousFacets = null; // Para detectar cambios en facetas del backend
    this.containerElement = null; // Para almacenar la referencia al contenedor
    this.previousFormCenterId = null; // Para rastrear cambios en el centro del formulario
    this.previousFormActivityId = null; // Para rastrear cambios en la actividad del formulario
  }

  /**
   * Renderiza el FilterPanel completo.
   * @returns {HTMLElement} Contenedor de filtros
   */
  async render() {
    const state = store.getState();
    const facets = state.facets;
    const filters = state.filters;

    const container = document.createElement('section');
    container.className = 'filter-panel';
    container.setAttribute('aria-label', 'Filtros de búsqueda');
    this.containerElement = container; // Guardar referencia

    // Header del panel
    const header = document.createElement('h2');
    header.textContent = 'Filtros';
    header.className = 'filter-panel-header';

    // Contenedor de filtros
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'filters-container';
    filtersContainer.id = 'filters-container'; // Agregar ID para poder actualizar

    // 1. Centro
      filtersContainer.appendChild(
        this.#createCenterFilter(facets.libreInt01, filters.center)
      );
     
     // 2. Actividad
     filtersContainer.appendChild(
       this.#createActivityFilter(facets.libreStr01, filters.activity)
     );

     // 3. Día Semana (con A/B Testing)
     filtersContainer.appendChild(
       this.#createDayOfWeekFilter(facets.libre2, filters.dayOfWeek)
     );

     // 4. Horario
     filtersContainer.appendChild(
       this.#createTimeSlotFilter(facets.libre1, filters.schedule)
     );

     // 5. Idioma
    filtersContainer.appendChild(
      this.#createLanguageFilter(facets.idiomaCelebracion, filters.language)
    );

    // Botón limpiar filtros
    filtersContainer.appendChild(this.#createClearFiltersButton());

    container.appendChild(header);
    container.appendChild(filtersContainer);

    // Guardar estado actual de filtros para detectar cambios
    this.previousFilters = {
      center: [...(state.filters.center || [])],
      activity: [...(state.filters.activity || [])]
    };

    return container;
  }

  /**
   * Actualiza los filtros de Centro y Actividad cuando cambian.
   * Detecta cambios tanto en los filtros seleccionados como en las facetas del backend.
   * @private
   */
  #updateActivityAndCenterFilters() {
    const state = store.getState();
    const currentFacets = store.getFacets();
    
    // Detectar si cambió el centro o la actividad (filtros seleccionados)
    const centerChanged = JSON.stringify(state.filters.center) !== JSON.stringify(this.previousFilters.center);
    const activityChanged = JSON.stringify(state.filters.activity) !== JSON.stringify(this.previousFilters.activity);

    // Detectar si cambiaron las facetas disponibles del backend
    const facetsChanged = JSON.stringify(currentFacets) !== JSON.stringify(this.previousFacets);

    // Si no hay cambios en filtros NI en facetas, no hacer nada
    if (!centerChanged && !activityChanged && !facetsChanged) {
      return;
    }

    console.log('[FilterPanel] #updateActivityAndCenterFilters: centerChanged=', centerChanged, ' activityChanged=', activityChanged, ' facetsChanged=', facetsChanged);

    // Actualizar referencias de estado
    this.previousFilters = {
      center: [...(state.filters.center || [])],
      activity: [...(state.filters.activity || [])]
    };
    
    // Actualizar referencia de facetas para próxima comparación
    this.previousFacets = currentFacets ? JSON.parse(JSON.stringify(currentFacets)) : null;

    const filtersContainer = document.getElementById('filters-container');
    if (!filtersContainer) return;

    // Actualizar filtro de Actividad si cambió el filtro seleccionado O si cambiaron las facetas
    if (activityChanged || centerChanged || facetsChanged) {
      const activityFilterElement = filtersContainer.querySelector('[data-filter-id="activity"]');
      if (activityFilterElement) {
        console.log('[FilterPanel] Actualizando filtro de ACTIVIDAD');
        activityFilterElement.replaceWith(this.#createActivityFilter());
      }
    }

    // Actualizar filtro de Centro si cambió el filtro seleccionado O si cambiaron las facetas
    if (centerChanged || activityChanged || facetsChanged) {
      const centerFilterElement = filtersContainer.querySelector('[data-filter-id="center"]');
      if (centerFilterElement) {
        console.log('[FilterPanel] Actualizando filtro de CENTRO');
        centerFilterElement.replaceWith(this.#createCenterFilter());
      }
    }
  }

  /**
   * Crea el filtro de Actividad.
   * @private
   */
      #createActivityFilter(facet, filter) {
        let activityOptions = [];

        if (facet) {
          // Usar facetas dinámicas transformadas por FacetsService
          activityOptions = FacetsService.transformActivityFacetsToOptions(facet);
          console.log('[FilterPanel] Usando facetas para actividades. Opciones:', activityOptions.length);
        }

       const filterItem = new FilterItem({
         id: 'activity',
         label: 'Actividad',
         options: activityOptions,
         selectedValues: filter || [],
         onSelect: () => this.onFilterChange(),
         hasSearchBox: true
       });

       this.filterItems['activity'] = filterItem;
       const element = filterItem.render();
       element.setAttribute('data-filter-id', 'activity');

       return element;
     }

    /**
     * Crea el filtro de Centro.
     * Si hay un centro seleccionado, no muestra el filtro de centros.
     * @private
     */
      #createCenterFilter(facet, filter) {
        let centerOptions = [];

        if (facet) {
          // Usar facetas dinámicas transformadas por FacetsService
          centerOptions = FacetsService.transformCenterFacetsToOptions(facet);
          console.log('[FilterPanel] Usando facetas para centros. Opciones:', centerOptions.length);
        }

        const filterItem = new FilterItem({
          id: 'center',
          label: 'Centro',
          options: centerOptions,
          selectedValues: filter || [],
          onSelect: () => this.onFilterChange(),
          hasSearchBox: true
        });

        this.filterItems['center'] = filterItem;
        const element = filterItem.render();
        element.setAttribute('data-filter-id', 'center');

        return element;
      }



  /**
   * Crea el filtro de Día de la Semana.
   * Muestra una lista simple de días sin agrupación.
   * @private
   */
  #createDayOfWeekFilter(facet, filter) {
    let dayOptions = [];

      if (facet) {
        // Usar facetas dinámicas transformadas por FacetsService
        dayOptions = FacetsService.transformDayOfWeekFacetsToOptions(facet);
        console.log('[FilterPanel] Usando facetas para días de la semana. Opciones:', dayOptions.length);
      }

      const filterItem = new FilterItem({
        id: 'dayOfWeek',
        label: 'Día de la Semana',
        options: dayOptions,
        selectedValues: filter,
        onSelect: () => this.onFilterChange(),
        hasSearchBox: false
      });

      this.filterItems['dayOfWeek'] = filterItem;
      return filterItem.render();
  }

  /**
   * Crea el filtro de Horario.
   * @private
   */
    #createTimeSlotFilter(facet, filter) {
      let timeSlotOptions = [];

      if (facet) {
        // Usar facetas dinámicas transformadas por FacetsService
        timeSlotOptions = FacetsService.transformTimeSlotFacetsToOptions(facet);
        console.log('[FilterPanel] Usando facetas para horarios. Opciones:', timeSlotOptions.length);
      } 

      const filterItem = new FilterItem({
        id: 'timeSlot',
        label: 'Horario',
        options: timeSlotOptions,
        selectedValues: filter.map(slot => {
          const slotMap = { 'Mañana': 'manana', 'Tarde': 'tarde', 'Mañana y Tarde': 'manana_y_tarde' };
          return Object.keys(slotMap).includes(slot) ? slotMap[slot] : slot;
        }),
        onSelect: () => this.onFilterChange(),
        hasSearchBox: false
      });

      this.filterItems['timeSlot'] = filterItem;
      return filterItem.render();
    }

  /**
   * Crea el filtro de Idioma.
   * @private
   */
    #createLanguageFilter(facet, filter) {
      let languageOptions = [];

      if (facet) {
        // Usar facetas dinámicas transformadas por FacetsService
        languageOptions = FacetsService.transformLanguageFacetsToOptions(facet);
        console.log('[FilterPanel] Usando facetas para idiomas. Opciones:', languageOptions.length);
      }

      const filterItem = new FilterItem({
        id: 'language',
        label: 'Idioma',
        options: languageOptions,
        selectedValues: filter,
        onSelect: () => this.onFilterChange(),
        hasSearchBox: false
      });

      this.filterItems['language'] = filterItem;
      return filterItem.render();
    }

  /**
   * Crea el botón limpiar filtros (Sección B solo).
   * @private
   */
  #createClearFiltersButton() {
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'form-group button-group';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.textContent = 'Limpiar Filtros';
    button.setAttribute('aria-label', 'Limpiar todos los filtros');

    button.addEventListener('click', () => {
      // Resetear solo Sección B (filtros)
      store.resetFilters();

      // Limpiar inputs
      Object.values(this.filterItems).forEach(filterItem => {
        filterItem.reset();
      });

      // Limpiar búsqueda de centro
      const centerSearch = document.getElementById('filter-search-center');
      if (centerSearch) {
        centerSearch.value = '';
      }

      // Desmarcar checkboxes
      document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });

      this.onFilterChange();
    });

    buttonGroup.appendChild(button);
    return buttonGroup;
  }

  /**
   * Actualiza los filtros de Centro y Actividad cuando cambian en el formulario.
   * Este método debe ser llamado desde SearchComponent cuando detecta cambios en el estado.
   */
  updateFormFilters() {
    this.#updateActivityAndCenterFilters();
  }
}
