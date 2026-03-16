/**
 * FilterItem.js
 * Componente reutilizable para cada filtro en la Sección B.
 * Incluye caja de búsqueda interna y opciones seleccionables.
 */

import { store } from '../store.js';
import { FilterService } from '../services/FilterService.js';

export class FilterItem {
  /**
   * Constructor del FilterItem.
   * @param {Object} config - Configuración del filtro
   *   - {string} id - Identificador único del filtro
   *   - {string} label - Etiqueta visible
   *   - {Array} options - Array de opciones
   *   - {Array} selectedValues - Valores ya seleccionados
   *   - {Function} onSelect - Callback cuando cambia selección
   *   - {boolean} hasSearchBox - Mostrar caja de búsqueda (default: true)
   *   - {Function} renderOption - Función para renderizar cada opción (opcional)
   *   - {boolean} isGrouped - Si las opciones están agrupadas (default: false)
   *   - {Object} groups - Grupos de opciones si isGrouped=true
   */
  constructor(config) {
    this.id = config.id;
    this.label = config.label;
    this.options = config.options || [];
    this.selectedValues = config.selectedValues || [];
    this.onSelect = config.onSelect || (() => {});
    this.hasSearchBox = config.hasSearchBox !== false;
    this.renderOption = config.renderOption;
    this.isGrouped = config.isGrouped || false;
    this.groups = config.groups || {};
    this.maxInitialOptions = config.maxInitialOptions || Infinity;
    this.searchText = '';
    this.element = null;
    this.isExpanded = false; // Estado de paginación
  }

  /**
   * Renderiza el FilterItem completo.
   * @returns {HTMLElement} Elemento del filtro
   */
  render() {
    const container = document.createElement('details');
    container.className = 'filter-item details-bar';
    container.setAttribute('data-filter-id', this.id);
    // Por defecto los filtros están expandidos
    container.open = true;

    // Header solo con el label (dentro de summary)
    container.appendChild(this.#createSummaryHeader());

    // Contenedor de contenido desplegable
    const detailsContent = document.createElement('div');
    detailsContent.className = 'details-content';

    // Caja de búsqueda (fuera del summary, dentro del contenido)
    if (this.hasSearchBox) {
      detailsContent.appendChild(this.#createSearchBox());
    }

    // Contenedor de opciones
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'filter-options';
    optionsContainer.id = `filter-options-${this.id}`;

    if (this.isGrouped && Object.keys(this.groups).length > 0) {
      optionsContainer.appendChild(this.#renderGrouped());
    } else {
      optionsContainer.appendChild(this.#renderFlat());
    }

    detailsContent.appendChild(optionsContainer);
    container.appendChild(detailsContent);
    this.element = container;

    return container;
  }

  /**
   * Crea el header con label y caja de búsqueda.
   * @private
   */
  #createSummaryHeader() {
    const header = document.createElement('summary');
    header.className = 'filter-item-header';

    const label = document.createElement('span');
    label.className = 'filter-label';
    label.textContent = this.label;
    label.setAttribute('aria-label', this.label);

    header.appendChild(label);
    return header;
  }

  #createSearchBox() {
    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.id = `filter-search-${this.id}`;
    searchBox.className = 'filter-search-box';
    searchBox.placeholder = 'Filtrar...';
    searchBox.setAttribute('aria-label', `Filtrar opciones de ${this.label}`);

    searchBox.addEventListener('input', (e) => {
      this.searchText = e.target.value;
      this.#updateOptionsDisplay();
    });

    return searchBox;
  }

  /**
   * Crea un header simple sin búsqueda.
   * @private
   */

  /**
   * Renderiza opciones en vista plana.
   * Implementa paginación lazy si hay más opciones que maxInitialOptions.
   * @private
   */
  #renderFlat() {
    const container = document.createElement('div');
    container.className = 'filter-options-list';

    const filteredOptions = FilterService.filterOptions(this.options, this.searchText);

    if (filteredOptions.length === 0) {
      const noResults = document.createElement('p');
      noResults.className = 'no-options';
      noResults.textContent = 'Sin resultados';
      container.appendChild(noResults);
      return container;
    }

    // Determinar cuántas opciones mostrar
    let optionsToShow = filteredOptions;
    let hasMoreButton = false;

    if (filteredOptions.length > this.maxInitialOptions && !this.isExpanded && this.searchText.trim() === '') {
      // Si hay búsqueda activa o está expandido, mostrar todas
      optionsToShow = filteredOptions.slice(0, this.maxInitialOptions);
      hasMoreButton = false;
    }

    // Renderizar opciones visibles
    optionsToShow.forEach(option => {
      const optionElement = this.#renderOptionElement(option);
      container.appendChild(optionElement);
    });

    // Agregar botón "Ver más" si es necesario
    if (hasMoreButton) {
      const remaining = filteredOptions.length - this.maxInitialOptions;
      const moreButton = this.#renderMoreButton(remaining, container, filteredOptions);
      container.appendChild(moreButton);
    }

    return container;
  }

  /**
   * Renderiza opciones en vista agrupada.
   * @private
   */
  #renderGrouped() {
    const container = document.createElement('div');
    container.className = 'filter-options-grouped';

    if (this.searchText.trim() !== '') {
      // Si hay búsqueda, mostrar vista plana
      return this.#renderFlat();
    }

    Object.entries(this.groups).forEach(([groupName, groupOptions]) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'filter-option-group';

      const groupTitle = document.createElement('div');
      groupTitle.className = 'filter-option-group-title';
      groupTitle.textContent = groupName;
      groupDiv.appendChild(groupTitle);

      const groupContent = document.createElement('div');
      groupContent.className = 'filter-option-group-content';

      groupOptions.forEach(option => {
        const optionElement = this.#renderOptionElement(option);
        groupContent.appendChild(optionElement);
      });

      groupDiv.appendChild(groupContent);
      container.appendChild(groupDiv);
    });

    return container;
  }

  /**
   * Renderiza un elemento de opción individual.
   * @private
   */
  #renderOptionElement(option) {
    const optionValue = typeof option === 'string' ? option : option.id || option.name;
    const optionLabel = typeof option === 'string' ? option : option.name;
    const isSelected = this.selectedValues.includes(optionValue);

    if (this.renderOption) {
      return this.renderOption(option, isSelected, (value) => this.#toggleOption(value));
    }

    const optionDiv = document.createElement('div');
    optionDiv.className = 'filter-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.id}-${optionValue}`;
    checkbox.value = optionValue;
    checkbox.checked = isSelected;
    checkbox.setAttribute('aria-label', `${optionLabel}`);

    checkbox.addEventListener('change', () => {
      this.#toggleOption(optionValue);
    });

    const label = document.createElement('label');
    label.htmlFor = `${this.id}-${optionValue}`;
    label.textContent = optionLabel;

    optionDiv.appendChild(checkbox);
    optionDiv.appendChild(label);

    return optionDiv;
  }

  /**
   * Alterna la selección de una opción.
   * @private
   */
  #toggleOption(value) {
    const index = this.selectedValues.indexOf(value);
    if (index > -1) {
      this.selectedValues.splice(index, 1);
    } else {
      this.selectedValues.push(value);
    }

    // Actualizar store
    store.setFilters({ [this.id]: this.selectedValues });

    // Callback
    this.onSelect(this.selectedValues);

    // Re-renderizar el filtro
    this.#updateCheckboxes();
  }

  /**
   * Actualiza la visualización de opciones según búsqueda.
   * @private
   */
  #updateOptionsDisplay() {
    if (!this.element) return;

    const detailsContent = this.element.querySelector('.details-content');
    const optionsContainer = detailsContent ? detailsContent.querySelector('.filter-options') : this.element.querySelector('.filter-options');
    if (!optionsContainer) return;
    
    optionsContainer.innerHTML = '';

    if (this.isGrouped && Object.keys(this.groups).length > 0) {
      optionsContainer.appendChild(this.#renderGrouped());
    } else {
      optionsContainer.appendChild(this.#renderFlat());
    }

    // Re-aplicar estados de checkboxes seleccionados
    this.#updateCheckboxes();
  }

  /**
   * Actualiza los checkboxes para reflejar estado actual.
   * @private
   */
  #updateCheckboxes() {
    this.selectedValues.forEach(value => {
      const checkbox = this.element.querySelector(`input[value="${value}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  }

  /**
   * Actualiza las opciones del filtro.
   * @param {Array} newOptions - Nuevas opciones
   * @param {Object} newGroups - Nuevos grupos (si aplica)
   */
  updateOptions(newOptions, newGroups = null) {
    this.options = newOptions;
    if (newGroups) {
      this.groups = newGroups;
    }

    if (this.element) {
      const detailsContent = this.element.querySelector('.details-content');
      const optionsContainer = detailsContent ? detailsContent.querySelector('.filter-options') : this.element.querySelector('.filter-options');
      if (!optionsContainer) return;
      
      optionsContainer.innerHTML = '';

      if (this.isGrouped && Object.keys(this.groups).length > 0) {
        optionsContainer.appendChild(this.#renderGrouped());
      } else {
        optionsContainer.appendChild(this.#renderFlat());
      }

      this.#updateCheckboxes();
    }
  }

  /**
   * Renderiza el botón "Ver más" / "Ver menos".
   * @private
   */
  #renderMoreButton(remaining, container, allOptions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-more-button';
    button.setAttribute('aria-label', `Ver ${remaining} opciones más`);
    button.textContent = `▼ Ver más (${remaining})`;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.isExpanded = !this.isExpanded;

      if (this.isExpanded) {
        // Mostrar todas las opciones
        button.textContent = '▲ Ver menos';
        
        // Limpiar contenedor y renderizar todo
        const startIdx = this.maxInitialOptions;
        const additionalOptions = allOptions.slice(startIdx);
        additionalOptions.forEach(option => {
          const optionElement = this.#renderOptionElement(option);
          container.insertBefore(optionElement, button);
        });
      } else {
        // Contraer a opciones iniciales
        button.textContent = `▼ Ver más (${remaining})`;
        
        // Remover opciones adicionales
        const allCheckboxes = container.querySelectorAll('.filter-option');
        for (let i = this.maxInitialOptions; i < allCheckboxes.length; i++) {
          allCheckboxes[i].remove();
        }
      }
    });

    return button;
  }

  /**
   * Obtiene los valores seleccionados.
   * @returns {Array} Array de valores seleccionados
   */
  getSelectedValues() {
    return [...this.selectedValues];
  }

  /**
   * Resetea la selección.
   */
  reset() {
    this.selectedValues = [];
    this.searchText = '';
    this.isExpanded = false;

    if (this.element) {
      const detailsContent = this.element.querySelector('.details-content');
      const searchBox = detailsContent
        ? detailsContent.querySelector('.filter-search-box')
        : this.element.querySelector('.filter-search-box');
      if (searchBox) {
        searchBox.value = '';
      }

      const checkboxes = this.element.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = false;
      });
    }
  }
}
