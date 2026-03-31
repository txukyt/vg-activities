/**
 * FilterPanel.js
 * Componente que renderiza todos los filtros (Sección B).
 * Incluye 5 filtros: Actividad, Centro, Día Semana, Horario, Idioma.
 */

import { store } from '../store.js';
import { FacetsService } from '../services/FacetsService.js';
import { FilterItem } from './FilterItem.js';

export class FilterPanel {
  constructor(onFilterChange) {
    this.onFilterChange = onFilterChange;
    this.filterItems = {};
    this.containerElement = null; // Para almacenar la referencia al contenedor
    this.previousFormCenterId = null; // Para rastrear cambios en el centro del formulario
    this.previousFormActivityId = null; // Para rastrear cambios en la actividad del formulario
    
    // Rastrear facetas previas de forma independiente para detectar cambios
    this.previousCenterFacets = null;      // Faceta de Centro (libreInt01)
    this.previousActivityFacets = null;    // Faceta de Actividad (libreStr01)
    this.previousDayOfWeekFacets = null;   // Faceta de Día Semana (libre2)
    this.previousTimeSlotFacets = null;    // Faceta de Horario (libre1)
    this.previousLanguageFacets = null;    // Faceta de Idioma (idiomaCelebracion)
  }

  /**
   * Renderiza el FilterPanel completo.
   * @returns {HTMLElement} Contenedor de filtros
   */
  async render() {
    const state = store.getState();
    
    // Comprobar que facetas y filtros no sean nulos
    if (!state.facets || !state.filters) {
      console.warn('[FilterPanel] render: facetas o filtros son nulos', { facets: state.facets, filters: state.filters });
    }
    
    const facets = state.facets || {}; // Validar que facets no sea null
    const filters = state.filters || {}; // Validar que filters no sea null

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
        this.#createCenterFilter(facets.center, filters.center)
      );

      // 2. Programa
     filtersContainer.appendChild(
       this.#createProgramFilter(facets.program, filters.program)
     );
     
     // 3. Actividad
     filtersContainer.appendChild(
       this.#createActivityFilter(facets.activity, filters.activity)
     );

     // 4. Día Semana (con A/B Testing)
     filtersContainer.appendChild(
       this.#createDayOfWeekFilter(facets.dayOfWeek, filters.dayOfWeek)
     );

     // 5. Horario
     filtersContainer.appendChild(
       this.#createTimeSlotFilter(facets.schedule, filters.schedule)
     );

     // 6. Idioma
    filtersContainer.appendChild(
      this.#createLanguageFilter(facets.language, filters.language)
    );

    // Botón limpiar filtros
    filtersContainer.appendChild(this.#createClearFiltersButton());

    container.appendChild(header);
    container.appendChild(filtersContainer);

    return container;
  }

  /**
   * Actualiza todos los filtros cuando sus facetas cambian.
   * Detecta cambios de forma independiente para cada faceta:
   * - Centro (libreInt01)
   * - Actividad (libreStr01)
   * - Día de Semana (libre2)
   * - Horario (libre1)
   * - Idioma (idiomaCelebracion)
   * @private
   */
  #updateFacets() {
    const state = store.getState();
    const facets = store.getFacets();

    if (!facets) return; // No hay facetas disponibles

    const filtersContainer = document.getElementById('filters-container');
    if (!filtersContainer) return;

    // Comparar cada faceta de forma independiente y actualizar si cambió
    
    // 1. Centro
    if (JSON.stringify(facets.center) !== JSON.stringify(this.previousCenterFacets)) {
      console.log('[FilterPanel] #updateActivityAndCenterFilters: Centro cambió');
      const centerFilterElement = filtersContainer.querySelector('[data-filter-id="center"]');
      if (centerFilterElement) {
        centerFilterElement.replaceWith(this.#createCenterFilter(facets.center, state.filters.center));
      }
      this.previousCenterFacets = facets.center ? JSON.parse(JSON.stringify(facets.center)) : null;
    }

    // 2. Programa
    if (JSON.stringify(facets.program) !== JSON.stringify(this.previousProgramFacets)) {
      console.log('[FilterPanel] #updateActivityAndCenterFilters: Programa cambió');
      const programFilterElement = filtersContainer.querySelector('[data-filter-id="program"]');
      if (programFilterElement) {
        programFilterElement.replaceWith(this.#createProgramFilter(facets.program, state.filters.program));
      }
      this.previousProgramFacets = facets.program ? JSON.parse(JSON.stringify(facets.program)) : null;
    }

    // 3. Actividad
    if (JSON.stringify(facets.activity) !== JSON.stringify(this.previousActivityFacets)) {
      console.log('[FilterPanel] #updateActivityAndCenterFilters: Actividad cambió');
      const activityFilterElement = filtersContainer.querySelector('[data-filter-id="activity"]');
      if (activityFilterElement) {
        activityFilterElement.replaceWith(this.#createActivityFilter(facets.activity, state.filters.activity));
      }
      this.previousActivityFacets = facets.activity ? JSON.parse(JSON.stringify(facets.activity)) : null;
    }

    // 3. Día de Semana
    if (JSON.stringify(facets.dayOfWeek) !== JSON.stringify(this.previousDayOfWeekFacets)) {
      console.log('[FilterPanel] #updateActivityAndCenterFilters: Día de Semana cambió');
      const dayOfWeekFilterElement = filtersContainer.querySelector('[data-filter-id="dayOfWeek"]');
      if (dayOfWeekFilterElement) {
        dayOfWeekFilterElement.replaceWith(this.#createDayOfWeekFilter(facets.dayOfWeek, state.filters.dayOfWeek));
      }
      this.previousDayOfWeekFacets = facets.dayOfWeek ? JSON.parse(JSON.stringify(facets.dayOfWeek)) : null;
    }

    // 4. Horario
    if (JSON.stringify(facets.schedule) !== JSON.stringify(this.previousTimeSlotFacets)) {
      console.log('[FilterPanel] #updateActivityAndCenterFilters: Horario cambió');
      const timeSlotFilterElement = filtersContainer.querySelector('[data-filter-id="timeSlot"]');
      if (timeSlotFilterElement) {
        timeSlotFilterElement.replaceWith(this.#createTimeSlotFilter(facets.schedule, state.filters.schedule));
      }
      this.previousTimeSlotFacets = facets.schedule ? JSON.parse(JSON.stringify(facets.schedule)) : null;
    }

    // 5. Idioma
    if (JSON.stringify(facets.language) !== JSON.stringify(this.previousLanguageFacets)) {
      console.log('[FilterPanel] #updateActivityAndCenterFilters: Idioma cambió');
      const languageFilterElement = filtersContainer.querySelector('[data-filter-id="language"]');
      if (languageFilterElement) {
        languageFilterElement.replaceWith(this.#createLanguageFilter(facets.language, state.filters.language));
      }
      this.previousLanguageFacets = facets.language ? JSON.parse(JSON.stringify(facets.language)) : null;
    }
  }

  /**
   * Crea el filtro de Actividad.
   * Si viene desde una ruta /activity/:id, solo muestra esa actividad fija.
   * @private
   */
      #createActivityFilter(facet, filter) {
        let activityOptions = [];

        if (facet) {
          // Usar facetas dinámicas transformadas por FacetsService
          activityOptions = FacetsService.transformActivityFacetsToOptions(facet);
        }

       const filterItem = new FilterItem({
         id: 'activity',
         label: 'Actividad',
         options: activityOptions,
         selectedValues: filter || [],
         onSelect: () => this.onFilterChange(),
         hasSearchBox: true,
       });

       this.filterItems['activity'] = filterItem;
       const element = filterItem.render();
       element.setAttribute('data-filter-id', 'activity');

       return element;
     }

     /**
   * Crea el filtro de Programa
   * @private
   */
      #createProgramFilter(facet, filter) {
        let programOptions = [];

        if (facet) {
          // Usar facetas dinámicas transformadas por FacetsService
          programOptions = FacetsService.transformProgramFacetsToOptions(facet);
        }

       const filterItem = new FilterItem({
         id: 'program',
         label: 'Programa',
         options: programOptions,
         selectedValues: filter || [],
         onSelect: () => this.onFilterChange(),
         hasSearchBox: true,
       });

       this.filterItems['program'] = filterItem;
       const element = filterItem.render();
       element.setAttribute('data-filter-id', 'program');

       return element;
     }

    /**
     * Crea el filtro de Centro.
     * Si viene desde una ruta /center/:id, solo muestra ese centro fijo.
     * @private
     */
      #createCenterFilter(facet, filter) {
        let centerOptions = [];

        if (facet) {
          // Usar facetas dinámicas transformadas por FacetsService
          centerOptions = FacetsService.transformCenterFacetsToOptions(facet);
        }

        const filterItem = new FilterItem({
          id: 'center',
          label: 'Centro',
          options: centerOptions,
          selectedValues: filter || [],
          onSelect: () => this.onFilterChange(),
          hasSearchBox: true,
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
      const element = filterItem.render();
      element.setAttribute('data-filter-id', 'dayOfWeek');
      return element;
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
      const element = filterItem.render();
      element.setAttribute('data-filter-id', 'timeSlot');
      return element;
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
      const element = filterItem.render();
      element.setAttribute('data-filter-id', 'language');
      return element;
    }

  /**
   * Crea el botón limpiar filtros (Sección B solo).
   * Si hay filtros fijos desde ruta, estos NO se limpian.
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

      // Desmarcar checkboxes EXCEPTO los del filtro fijo
      document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(cb => {
        if (!cb.disabled) { // Solo desmarcar si no está deshabilitado
          cb.checked = false;
        }
      });

      this.onFilterChange();
    });

    buttonGroup.appendChild(button);
    return buttonGroup;
  }

  /**
   * Actualiza las facetas
   * Este método debe ser llamado desde SearchComponent cuando detecta cambios en el estado.
   */
  updateFormFacets() {
    this.#updateFacets();
  }
}
