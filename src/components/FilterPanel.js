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
    this.dayWeekViewMode = 'grouped'; // Para A/B Testing
    this.previousFilters = { center: [], activity: [] }; // Para detectar cambios
    this.containerElement = null; // Para almacenar la referencia al contenedor
    this.previousFormCenterId = null; // Para rastrear cambios en el centro del formulario
    this.previousFormActivityId = null; // Para rastrear cambios en la actividad del formulario
  }

  /**
   * Renderiza el FilterPanel completo.
   * @returns {HTMLElement} Contenedor de filtros
   */
  async render() {
    // Obtener actividades del store
    this.activities = store.getActivities();

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
     const centerFilter = this.#createCenterFilter();
     if (centerFilter) {
       filtersContainer.appendChild(centerFilter);
     }
     
     // 2. Actividad
     filtersContainer.appendChild(
       this.#createActivityFilter()
     );

     // 3. Día Semana (con A/B Testing)
     filtersContainer.appendChild(
       this.#createDayOfWeekFilter()
     );

     // 4. Horario
     filtersContainer.appendChild(
       this.#createTimeSlotFilter()
     );

     // 5. Idioma
    filtersContainer.appendChild(
      this.#createLanguageFilter()
    );

    // Botón limpiar filtros
    filtersContainer.appendChild(this.#createClearFiltersButton());

    container.appendChild(header);
    container.appendChild(filtersContainer);

    // Guardar estado actual de filtros para detectar cambios
    const state = store.getState();
    this.previousFilters = {
      center: [...(state.filters.center || [])],
      activity: [...(state.filters.activity || [])]
    };

    return container;
  }

  /**
   * Actualiza los filtros de Centro y Actividad cuando cambian.
   * @private
   */
  #updateActivityAndCenterFilters() {
    const state = store.getState();
    
    // Detectar si cambió el centro o la actividad
    const centerChanged = JSON.stringify(state.filters.center) !== JSON.stringify(this.previousFilters.center);
    const activityChanged = JSON.stringify(state.filters.activity) !== JSON.stringify(this.previousFilters.activity);

    if (!centerChanged && !activityChanged) return;

    // Actualizar referencias de estado
    this.previousFilters = {
      center: [...(state.filters.center || [])],
      activity: [...(state.filters.activity || [])]
    };

    const filtersContainer = document.getElementById('filters-container');
    if (!filtersContainer) return;

    // Actualizar filtro de Actividad si cambió
    if (activityChanged || centerChanged) {
      const activityFilterElement = filtersContainer.querySelector('[data-filter-id="activity"]');
      if (activityFilterElement) {
        activityFilterElement.replaceWith(this.#createActivityFilter());
      }
    }

    // Actualizar filtro de Centro si cambió
    if (centerChanged || activityChanged) {
      const centerFilterElement = filtersContainer.querySelector('[data-filter-id="center"]');
      if (centerFilterElement) {
        centerFilterElement.replaceWith(this.#createCenterFilter());
      }
    }
  }

  /**
   * Crea el filtro de Actividad.
   * @private
   */
      #createActivityFilter() {
        const state = store.getState();
        
        // Obtener facetas del store si existen
        const facets = store.getFacets();
        let activityOptions = [];

        if (facets && facets.libreStr01) {
          // Usar facetas dinámicas transformadas por FacetsService
          activityOptions = FacetsService.transformActivityFacetsToOptions(facets.libreStr01);
          console.log('[FilterPanel] Usando facetas para actividades. Opciones:', activityOptions.length);
        } else {
          // Fallback: usar todas las actividades disponibles mediante FilterService
          activityOptions = FilterService.getActivityNames(this.activities);
          console.log('[FilterPanel] Sin facetas. Usando todas las actividades. Opciones:', activityOptions.length);
        }

       const filterItem = new FilterItem({
         id: 'activity',
         label: 'Actividad',
         options: activityOptions,
         selectedValues: state.filters.activity || [],
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
      #createCenterFilter() {
        const state = store.getState();
        
        // Obtener facetas del store si existen
        const facets = store.getFacets();
        let centerOptions = [];

        if (facets && facets.libreInt01) {
          // Usar facetas dinámicas transformadas por FacetsService
          centerOptions = FacetsService.transformCenterFacetsToOptions(facets.libreInt01);
          console.log('[FilterPanel] Usando facetas para centros. Opciones:', centerOptions.length);
        } else {
          // Fallback: usar todos los centros disponibles mediante FilterService
          const allCenters = store.getCenters();
          centerOptions = allCenters.map(center => ({
            name: center.name,
            id: center.id
          }));
          console.log('[FilterPanel] Sin facetas. Usando todos los centros. Opciones:', centerOptions.length);
        }

        const filterItem = new FilterItem({
          id: 'center',
          label: 'Centro',
          options: centerOptions,
          selectedValues: state.filters.center || [],
          onSelect: () => this.onFilterChange(),
          hasSearchBox: true
        });

        this.filterItems['center'] = filterItem;
        const element = filterItem.render();
        element.setAttribute('data-filter-id', 'center');

        return element;
      }



  /**
   * Crea el filtro de Día de la Semana (A/B Testing).
   * @private
   */
  #createDayOfWeekFilter() {
    const filterContainer = document.createElement('details');
    filterContainer.className = 'filter-item day-week-filter details-bar';
    filterContainer.setAttribute('data-filter-id', 'dayOfWeek');
    filterContainer.open = true;

    // Header (dentro de summary)
    const header = document.createElement('summary');
    header.className = 'filter-item-header';

    const label = document.createElement('span');
    label.className = 'filter-label';
    label.textContent = 'Día de la Semana';

    header.appendChild(label);
    filterContainer.appendChild(header);

    // Contenido desplegable
    const detailsContent = document.createElement('div');
    detailsContent.className = 'details-content';

    // Toggle de vista (dentro del contenido, no en el summary)
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'day-week-toggle';

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'toggle-label';
    toggleLabel.textContent = 'Vista: ';

    const toggleSwitch = document.createElement('button');
    toggleSwitch.type = 'button';
    toggleSwitch.className = 'toggle-switch';
    toggleSwitch.setAttribute('aria-label', 'Alternar entre vista agrupada y desglosada');
    toggleSwitch.setAttribute('data-mode', 'grouped');
    toggleSwitch.textContent = 'Agrupado';

    toggleSwitch.addEventListener('click', () => {
      this.dayWeekViewMode = this.dayWeekViewMode === 'grouped' ? 'list' : 'grouped';
      toggleSwitch.setAttribute('data-mode', this.dayWeekViewMode);
      toggleSwitch.textContent = this.dayWeekViewMode === 'grouped' ? 'Agrupado' : 'Desglosado';
      
      // Actualizar store
      store.setFilters({ dayOfWeekViewMode: this.dayWeekViewMode });

       // Re-renderizar opciones
       const optionsContainer = detailsContent.querySelector('.filter-options');
       optionsContainer.innerHTML = '';
       
       // Obtener facetas del store si existen
        const facets = store.getFacets();
        const days = facets && facets.dayOfWeek
          ? FacetsService.transformDayOfWeekFacetsToOptions(facets.dayOfWeek)
          : FilterService.getDaysOfWeek(this.activities);
      
      if (this.dayWeekViewMode === 'grouped') {
        optionsContainer.appendChild(this.#renderGroupedDays(days));
      } else {
        optionsContainer.appendChild(this.#renderFlatDays(days));
      }

      // Reaplicar selecciones
      const selectedDays = store.getState().filters.dayOfWeek;
      selectedDays.forEach(day => {
        const checkbox = filterContainer.querySelector(`input[value="${day}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });

      this.onFilterChange();
    });

    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggleSwitch);
    detailsContent.appendChild(toggleContainer);

     // Opciones
     const optionsContainer = document.createElement('div');
     optionsContainer.className = 'filter-options';
     optionsContainer.id = 'filter-options-dayOfWeek';

       // Obtener facetas del store si existen
        const facets = store.getFacets();
        const days = facets && facets.dayOfWeek
          ? FacetsService.transformDayOfWeekFacetsToOptions(facets.dayOfWeek)
          : FilterService.getDaysOfWeek(this.activities);
     
     optionsContainer.appendChild(this.#renderGroupedDays(days)); // Default grouped

    detailsContent.appendChild(optionsContainer);
    filterContainer.appendChild(detailsContent);

    // Listeners para cambios
    filterContainer.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const selectedValues = Array.from(
          filterContainer.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        store.setFilters({ dayOfWeek: selectedValues });
        this.onFilterChange();
      }
    });

    return filterContainer;
  }

  /**
   * Renderiza días agrupados.
   * @private
   */
  #renderGroupedDays(days) {
    const container = document.createElement('div');
    container.className = 'filter-options-grouped day-week-grouped';

    const groups = [
      { label: 'L-X', days: ['lunes', 'martes', 'miércoles'] },
      { label: 'M-J', days: ['martes', 'miércoles', 'jueves'] },
      { label: 'V-S', days: ['viernes', 'sábado'] },
      { label: 'D', days: ['domingo'] }
    ];

    groups.forEach(group => {
      const filteredDays = group.days.filter(d => days.includes(d));
      if (filteredDays.length > 0) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'filter-option-group';

        const groupTitle = document.createElement('div');
        groupTitle.className = 'filter-option-group-title';
        groupTitle.textContent = group.label;
        groupDiv.appendChild(groupTitle);

        const groupContent = document.createElement('div');
        groupContent.className = 'filter-option-group-content';

        filteredDays.forEach(day => {
          const optionDiv = document.createElement('div');
          optionDiv.className = 'filter-option';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `dayOfWeek-${day}`;
          checkbox.value = day;

          const label = document.createElement('label');
          label.htmlFor = `dayOfWeek-${day}`;
          label.textContent = day.charAt(0).toUpperCase() + day.slice(1);

          optionDiv.appendChild(checkbox);
          optionDiv.appendChild(label);
          groupContent.appendChild(optionDiv);
        });

        groupDiv.appendChild(groupContent);
        container.appendChild(groupDiv);
      }
    });

    return container;
  }

  /**
   * Renderiza días desglosados.
   * @private
   */
  #renderFlatDays(days) {
    const container = document.createElement('div');
    container.className = 'filter-options-list day-week-list';

    days.forEach(day => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'filter-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `dayOfWeek-${day}`;
      checkbox.value = day;

      const label = document.createElement('label');
      label.htmlFor = `dayOfWeek-${day}`;
      label.textContent = day.charAt(0).toUpperCase() + day.slice(1);

      optionDiv.appendChild(checkbox);
      optionDiv.appendChild(label);
      container.appendChild(optionDiv);
    });

    return container;
  }

  /**
   * Crea el filtro de Horario.
   * @private
   */
    #createTimeSlotFilter() {
      const state = store.getState();
      
      // Obtener facetas del store si existen
      const facets = store.getFacets();
      let timeSlotOptions = [];

      if (facets && facets.timeSlot) {
        // Usar facetas dinámicas transformadas por FacetsService
        timeSlotOptions = FacetsService.transformTimeSlotFacetsToOptions(facets.timeSlot);
        console.log('[FilterPanel] Usando facetas para horarios. Opciones:', timeSlotOptions.length);
      } else {
        // Fallback: usar todos los horarios disponibles mediante FilterService
        timeSlotOptions = FilterService.getTimeSlots(this.activities);
        console.log('[FilterPanel] Sin facetas. Usando todos los horarios. Opciones:', timeSlotOptions.length);
      }

      const filterItem = new FilterItem({
        id: 'timeSlot',
        label: 'Horario',
        options: timeSlotOptions,
        selectedValues: state.filters.timeSlot.map(slot => {
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
    #createLanguageFilter() {
      const state = store.getState();
      
      // Obtener facetas del store si existen
      const facets = store.getFacets();
      let languageOptions = [];

      if (facets && facets.language) {
        // Usar facetas dinámicas transformadas por FacetsService
        languageOptions = FacetsService.transformLanguageFacetsToOptions(facets.language);
        console.log('[FilterPanel] Usando facetas para idiomas. Opciones:', languageOptions.length);
      } else {
        // Fallback: usar todos los idiomas disponibles mediante FilterService
        languageOptions = FilterService.getLanguages(this.activities);
        console.log('[FilterPanel] Sin facetas. Usando todos los idiomas. Opciones:', languageOptions.length);
      }

      const filterItem = new FilterItem({
        id: 'language',
        label: 'Idioma',
        options: languageOptions,
        selectedValues: state.filters.language,
        onSelect: () => this.onFilterChange(),
        hasSearchBox: true
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
      store.setFilters({
        activity: [],
        center: [],
        dayOfWeek: [],
        timeSlot: [],
        language: [],
        dayOfWeekViewMode: 'grouped'
      });

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

      this.dayWeekViewMode = 'grouped';
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
