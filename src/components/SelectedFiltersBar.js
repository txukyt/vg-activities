/**
 * SelectedFiltersBar.js
 * Componente que muestra todos los filtros seleccionados como chips removibles.
 * Ubicado entre el formulario de búsqueda y los resultados.
 */

import { store } from '../store.js';
import { FilterService } from '../services/FilterService.js';

export class SelectedFiltersBar {
  constructor(onFilterChange) {
    this.onFilterChange = onFilterChange;
    this.activities = [];
    this.centers = [];
    this.element = null;
  }

  /**
   * Renderiza la barra de filtros seleccionados.
   * @returns {HTMLElement} Elemento de la barra
   */
  async render() {
    // Obtener actividades y centros del store para mapear IDs a nombres
    this.activities = store.getActivities();
    this.centers = store.getCenters();

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

    // Botón limpiar todos
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
      // Crear mapa de IDs a nombres desde this.centers (del store)
      const centerMap = new Map(
        this.centers.map(c => [c.id, c.name])
      );
      filters.center.forEach(centerId => {
        selected.push({
          type: 'center',
          typeLabel: 'Centro',
          value: centerId,
          label: centerMap.get(centerId) || centerId
        });
      });
    }

    // Actividad
    if (filters.activity && filters.activity.length > 0) {
      // Crear mapa de IDs a nombres usando FilterService
      const activityMap = new Map(
        FilterService.getActivityNames(this.activities).map(a => [a.id, a.name])
      );
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
      filters.dayOfWeek.forEach(day => {
        selected.push({
          type: 'dayOfWeek',
          typeLabel: 'Día',
          value: day,
          label: day.charAt(0).toUpperCase() + day.slice(1)
        });
      });
    }

    // Horario
    if (filters.timeSlot && filters.timeSlot.length > 0) {
      filters.timeSlot.forEach(slot => {
        selected.push({
          type: 'timeSlot',
          typeLabel: 'Horario',
          value: slot,
          label: slot
        });
      });
    }

    // Idioma
    if (filters.language && filters.language.length > 0) {
      filters.language.forEach(lang => {
        selected.push({
          type: 'language',
          typeLabel: 'Idioma',
          value: lang,
          label: lang
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
    const isFixedCenter = state.fixedCenterFilterFromRoute && filter.type === 'center' && filter.value === state.fixedCenterFilterFromRoute;
    const isFixedActivity = state.fixedActivityFilterFromRoute && filter.type === 'activity' && filter.value === state.fixedActivityFilterFromRoute;
    const isFixed = isFixedCenter || isFixedActivity;
    
    const chip = document.createElement('div');
    chip.className = 'selected-filter-chip';
    chip.setAttribute('data-filter-type', filter.type);
    chip.setAttribute('data-filter-value', filter.value);
    
    // Añadir clase si es fijo
    if (isFixed) {
      chip.classList.add('chip-fixed');
    }

    const label = document.createElement('span');
    label.className = 'chip-text';
    label.textContent = filter.label;
    label.title = isFixed
      ? `${filter.typeLabel}: ${filter.label} (obligatorio)`
      : `${filter.typeLabel}: ${filter.label}`;

    chip.appendChild(label);
    
    // Mostrar botón × SOLO si NO es un filtro fijo
    if (!isFixed) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'chip-remove-btn';
      removeBtn.innerHTML = '×';
      removeBtn.setAttribute('aria-label', `Eliminar filtro ${filter.label}`);
      removeBtn.addEventListener('click', () => this.#removeFilter(filter));
      chip.appendChild(removeBtn);
    }

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
   * @private
   */
  #clearAllFilters() {
    const state = store.getState();
    const fixedActivityId = state.fixedActivityFilterFromRoute;
    const fixedCenterId = state.fixedCenterFilterFromRoute;
    
    store.setFilters({
      center: fixedCenterId ? [fixedCenterId] : [],
      activity: fixedActivityId ? [fixedActivityId] : [],
      dayOfWeek: [],
      timeSlot: [],
      language: [],
      schedule: []
    });
    this.onFilterChange();
  }

  /**
   * Actualiza la barra cuando cambian los filtros.
   */
  update() {
    this.#renderContent();
  }
}
