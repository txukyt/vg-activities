import { store } from '@/store.js';
import { FilterService } from '@/services/FilterService.js';

export class SelectedFiltersBar {
  constructor(onFilterChange, filterPanel = null) {
    this.onFilterChange = onFilterChange;
    this.filterPanel = filterPanel;
    this.activities = [];
    this.centers = [];
    this.programs = [];
    this.facets = null;
    this.element = null;
  }

  /**
   * Renderiza la barra de filtros seleccionados.
   * @returns {HTMLElement} Elemento de la barra
   */
  async render() {
    // Obtener actividades, centros y facetas del store
    this.activities = store.getActivities();
    this.centers = store.getCenters();
    this.programs = store.getPrograms();
    this.facets = store.getFacets();

    const container = document.createElement('div');
    container.className = 'selected-filters-bar';
    container.id = 'selected-filters-bar';

    this.element = container;
    this.#renderContent();

    return container;
  }

   /**
    * Actualiza el contenido de la barra según el estado actual.
    * @private
    */
   #renderContent() {
     if (!this.element) return;

     const state = store.getState();
     const filters = state.filters;

     // Limpiar contenido actual
     this.element.innerHTML = '';

     // Recopilar todos los filtros seleccionados
     const selectedFilters = this.#collectSelectedFilters(filters);

     // Si no hay filtros seleccionados, ocultar la barra
     if (selectedFilters.length === 0) {
       this.element.style.display = 'none';
       return;
     }

     this.element.style.display = 'flex';

     // Título
     const title = document.createElement('span');
     title.className = 'selected-filters-title';
     title.textContent = `Filtros activos (${selectedFilters.length}):`;
     this.element.appendChild(title);

     // Contenedor de chips
     const chipsContainer = document.createElement('div');
     chipsContainer.className = 'selected-filters-chips';

     selectedFilters.forEach(filter => {
       const chip = this.#createChip(filter);
       chipsContainer.appendChild(chip);
     });

    this.element.appendChild(chipsContainer);

     const clearAllBtn = document.createElement('button');
     clearAllBtn.className = 'clear-all-filters-btn';
     clearAllBtn.textContent = 'Limpiar todo';
     clearAllBtn.addEventListener('click', () => this.#clearAllFilters());
     this.element.appendChild(clearAllBtn);
   }

  /**
   * Recopila todos los filtros seleccionados en un array plano.
   * @private
   */
  #collectSelectedFilters(filters) {
    const selected = [];

    // Centro
    if (filters.center && filters.center.length > 0) {
      // Crear mapa de IDs a nombres desde facetas
      const centerMap = new Map();
      if (this.facets && this.facets.center) {
        this.facets.center.forEach(facet => {
          centerMap.set(facet.value, facet.name || facet.value);
        });
      }
      // Fallback a store.centers si no hay facetas
      if (centerMap.size === 0 && this.centers.length > 0) {
        this.centers.forEach(c => {
          centerMap.set(c.id, c.name);
        });
      }
      filters.center.forEach(centerId => {
        selected.push({
          type: 'center',
          typeLabel: 'Centro',
          value: centerId,
          label: centerMap.get(centerId) || centerId
        });
      });
    }

    // Programa
    if (filters.program && filters.program.length > 0) {
      // Crear mapa de IDs a nombres desde facetas
      const programMap = new Map();
      if (this.facets && this.facets.program) {
        this.facets.program.forEach(facet => {
          programMap.set(facet.value, facet.name || facet.value);
        });
      }
      // Fallback a store.programs si no hay facetas
      if (programMap.size === 0 && this.programs.length > 0) {
        this.programs.forEach(p => {
          programMap.set(p.id, p.name);
        });
      }
      filters.program.forEach(programId => {
        selected.push({
          type: 'program',
          typeLabel: 'Programa',
          value: programId,
          label: programMap.get(programId) || programId
        });
      });
    }

    // Actividad
    if (filters.activity && filters.activity.length > 0) {
      // Crear mapa de IDs a nombres desde facetas (la fuente única de la verdad)
      const activityMap = new Map();
      if (this.facets && this.facets.activity) {
        this.facets.activity.forEach(facet => {
          activityMap.set(facet.value, facet.name || facet.value);
        });
      }
      // Fallback a store.activities si no hay facetas
      if (activityMap.size === 0 && this.activities.length > 0) {
        this.activities.forEach(a => {
          activityMap.set(a.id, a.name);
        });
      }
      filters.activity.forEach(activityId => {
        selected.push({
          type: 'activity',
          typeLabel: 'Actividad',
          value: activityId,
          label: activityMap.get(activityId) || activityId
        });
      });
    }

    // Día de la Semana
    if (filters.dayOfWeek && filters.dayOfWeek.length > 0) {
      // Crear mapa de IDs a nombres desde facetas
      const dayMap = new Map();
      if (this.facets && this.facets.dayOfWeek) {
        this.facets.dayOfWeek.forEach(facet => {
          dayMap.set(facet.value, facet.name || facet.value);
        });
      }
      filters.dayOfWeek.forEach(day => {
        selected.push({
          type: 'dayOfWeek',
          typeLabel: 'Día',
          value: day,
          label: dayMap.get(day) || (day.charAt(0).toUpperCase() + day.slice(1))
        });
      });
    }

    // Horario
    if (filters.timeSlot && filters.timeSlot.length > 0) {
      // Crear mapa de IDs a nombres desde facetas
      const timeSlotMap = new Map();
      if (this.facets && this.facets.schedule) {
        this.facets.schedule.forEach(facet => {
          timeSlotMap.set(facet.value, facet.name || facet.value);
        });
      }
      filters.timeSlot.forEach(slot => {
        selected.push({
          type: 'timeSlot',
          typeLabel: 'Horario',
          value: slot,
          label: timeSlotMap.get(slot) || slot
        });
      });
    }

    // Idioma
    if (filters.language && filters.language.length > 0) {
      // Crear mapa de IDs a nombres desde facetas
      const languageMap = new Map();
      if (this.facets && this.facets.language) {
        this.facets.language.forEach(facet => {
          languageMap.set(facet.value, facet.name || facet.value);
        });
      }
      filters.language.forEach(lang => {
        selected.push({
          type: 'language',
          typeLabel: 'Idioma',
          value: lang,
          label: languageMap.get(lang) || lang
        });
      });
    }

    return selected;
  }

  /**
   * Crea un chip individual para un filtro seleccionado.
   * Oculta el botón × si el filtro es fijo desde ruta.
   * @private
   */
  #createChip(filter) {
    const state = store.getState();
    
    const chip = document.createElement('div');
    chip.className = 'selected-filter-chip';
    chip.setAttribute('data-filter-type', filter.type);
    chip.setAttribute('data-filter-value', filter.value);

    const label = document.createElement('span');
    label.className = 'chip-text';
    label.textContent = filter.label;
    label.title = `${filter.typeLabel}: ${filter.label}`;

    chip.appendChild(label);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'chip-remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', `Eliminar filtro ${filter.label}`);
    removeBtn.addEventListener('click', () => this.#removeFilter(filter));
    chip.appendChild(removeBtn);

    return chip;
  }

   /**
    * Elimina un filtro específico.
    * @private
    */
   #removeFilter(filter) {
     const state = store.getState();
     const currentFilters = state.filters[filter.type] || [];
     
     const updated = currentFilters.filter(value => value !== filter.value);
     store.setFilters({ [filter.type]: updated });
     
     this.onFilterChange();
   }

   /**
    * Elimina todos los filtros EXCEPTO los fijos desde ruta.
    * También desactiva los checkboxes en el FilterPanel si está disponible.
    * @private
    */
   #clearAllFilters() {
     const state = store.getState();
     
     store.setFilters({
       center: [],
       activity: [],
       program: [],
       dayOfWeek: [],
       timeSlot: [],
       language: [],
       schedule: []
     });
     
     // Limpiar checkboxes en el FilterPanel si existe la referencia
     if (this.filterPanel && this.filterPanel.filterItems) {
       Object.values(this.filterPanel.filterItems).forEach(filterItem => {
         filterItem.reset();
       });
     }
     
     this.onFilterChange();
   }

  /**
   * Actualiza la barra cuando cambian los filtros.
   * Obtiene las facetas actualizadas del store antes de renderizar.
   */
  update() {
    // Obtener facetas actualizadas del store
    this.facets = store.getFacets();
    this.#renderContent();
  }
}
