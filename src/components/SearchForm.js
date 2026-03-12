/**
 * SearchForm.js
 * Componente que renderiza el formulario de búsqueda (Sección A).
 * Incluye: búsqueda libre, checkbox plazas libres, edad máxima.
 */

import { store } from '../store.js';

export class SearchForm {
  constructor(onSearch) {
    this.onSearch = onSearch;
  }

  /**
    * Renderiza el formulario de búsqueda.
    * @returns {Promise<HTMLElement>} Elemento form
    */
  async render() {
    const form = document.createElement('form');
    form.className = 'search-form';
    form.setAttribute('role', 'search');

    // Contenedor de controles
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'search-controls';

    // 1. Búsqueda Libre
    controlsContainer.appendChild(this.#createSearchTextField());

    // 2. Checkbox Plazas Libres
    controlsContainer.appendChild(this.#createAvailableSpotsCheckbox());

    // 3. Edad Máxima
    controlsContainer.appendChild(this.#createMaxAgeField());

    // Botón limpiar
    controlsContainer.appendChild(this.#createClearButton());

    form.appendChild(controlsContainer);
    return form;
  }

   /**
    * Crea el campo de búsqueda libre.
    * @private
    */
   #createSearchTextField() {
     const group = document.createElement('div');
     group.className = 'form-group';

     const label = document.createElement('label');
     label.htmlFor = 'search-text';
     label.textContent = 'Búsqueda Libre:';

     const input = document.createElement('input');
     input.type = 'text';
     input.id = 'search-text';
     input.placeholder = 'Ej: Yoga, Guitarra, Pintura...';
     input.setAttribute('aria-label', 'Buscar en actividades');
     input.setAttribute('aria-describedby', 'search-text-help');
     input.value = store.getState().filters.searchText || '';

     input.addEventListener('input', (e) => {
       store.setFilters({ searchText: e.target.value });
       this.onSearch();
     });

     const help = document.createElement('small');
     help.id = 'search-text-help';
     help.textContent = 'Busca por nombre o descripción de la actividad';

     group.appendChild(label);
     group.appendChild(input);
     group.appendChild(help);

     return group;
   }



  /**
   * Crea el checkbox de plazas libres.
   * @private
   */
  #createAvailableSpotsCheckbox() {
    const group = document.createElement('div');
    group.className = 'form-group checkbox-group';

    const container = document.createElement('div');
    container.className = 'checkbox-container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'available-spots';
    checkbox.setAttribute('aria-label', 'Mostrar solo actividades con plazas libres');
    checkbox.checked = store.getState().filters.hasAvailableSpots;

    checkbox.addEventListener('change', (e) => {
      store.setFilters({ hasAvailableSpots: e.target.checked });
      this.onSearch();
    });

    const label = document.createElement('label');
    label.htmlFor = 'available-spots';
    label.textContent = 'Plazas Libres';

    container.appendChild(checkbox);
    container.appendChild(label);
    group.appendChild(container);

    return group;
  }

  /**
   * Crea el campo de edad máxima.
   * @private
   */
  #createMaxAgeField() {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.htmlFor = 'max-age';
    label.textContent = 'Edad Máxima:';

    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'max-age';
    input.min = '0';
    input.max = '120';
    input.placeholder = 'Dejar en blanco para sin límite';
    input.setAttribute('aria-label', 'Edad máxima permitida');
    input.setAttribute('aria-describedby', 'max-age-help');
    
    const state = store.getState();
    if (state.filters.maxAge !== undefined) {
      input.value = state.filters.maxAge;
    }

    input.addEventListener('change', (e) => {
      const value = e.target.value ? parseInt(e.target.value) : undefined;
      store.setFilters({ maxAge: value });
      this.onSearch();
    });

    const help = document.createElement('small');
    help.id = 'max-age-help';
    help.textContent = 'Filtra actividades apropiadas para tu edad';

    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(help);

    return group;
  }

   /**
    * Crea el botón limpiar búsqueda.
    * @private
    */
   #createClearButton() {
     const buttonGroup = document.createElement('div');
     buttonGroup.className = 'form-group button-group';

     const button = document.createElement('button');
     button.type = 'button';
     button.className = 'btn btn-secondary';
     button.textContent = 'Limpiar Búsqueda';
     button.setAttribute('aria-label', 'Limpiar todos los campos del formulario de búsqueda');

      button.addEventListener('click', () => {
        // Limpiar solo Sección A (searchForm)
        store.setFilters({
          searchText: '',
          hasAvailableSpots: true,
          maxAge: undefined
        });
        
        // Actualizar inputs visuales
        const searchInput = document.getElementById('search-text');
        const spotsCheckbox = document.getElementById('available-spots');
        const maxAgeInput = document.getElementById('max-age');

        if (searchInput) searchInput.value = '';
        if (spotsCheckbox) spotsCheckbox.checked = true;
        if (maxAgeInput) maxAgeInput.value = '';

        this.onSearch();
      });

     buttonGroup.appendChild(button);
     return buttonGroup;
   }
}
