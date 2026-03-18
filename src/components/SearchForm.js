/**
 * SearchForm.js
 * Componente que renderiza el formulario de búsqueda (Sección A).
 * Incluye: búsqueda libre, checkbox plazas libres, edad.
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

    controlsContainer.appendChild(this.#createSearchTextField());
    
    controlsContainer.appendChild(this.#createAgeField());

    controlsContainer.appendChild(this.#createAvailableSpotsCheckbox());


    // controlsContainer.appendChild(this.#createClearButton());

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
   * Crea el campo de edad.
   * @private
   */
  #createAgeField() {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.htmlFor = 'age';
    label.textContent = 'Edad:';

    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'age';
    input.min = '0';
    input.max = '120';
    input.placeholder = 'Dejar en blanco para sin límite';
    input.setAttribute('aria-label', 'Edad permitida');
    input.setAttribute('aria-describedby', 'age-help');
    
    const state = store.getState();
    if (state.filters.age !== undefined) {
      input.value = state.filters.age;
    }

    input.addEventListener('change', (e) => {
      const value = e.target.value ? parseInt(e.target.value) : undefined;
      store.setFilters({ age: value });
      this.onSearch();
    });

    const help = document.createElement('small');
    help.id = 'age-help';
    help.textContent = 'Filtra actividades apropiadas para tu edad';

    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(help);

    return group;
  }

    /**
     * Crea el botón de búsqueda.
     * Ejecuta una búsqueda con los filtros actuales y aplica efecto visual de repintado.
     * @private
     */
    #createClearButton() {
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'form-group button-group';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.textContent = 'Buscar';
      button.setAttribute('aria-label', 'Ejecutar búsqueda con los filtros actuales');

      button.addEventListener('click', () => {
        console.log('[SearchForm] Botón "Buscar" pulsado');
        
        // Aplicar efecto visual de fade a los resultados
        const resultsWrapper = document.getElementById('results-wrapper');
        if (resultsWrapper) {
          // Guardar opacidad original
          const originalOpacity = window.getComputedStyle(resultsWrapper).opacity;
          
          // Efecto fade: desvanecimiento a 0 y vuelta a 1
          resultsWrapper.style.transition = 'opacity 0.3s ease';
          resultsWrapper.style.opacity = '0';
          
          // Después de desvanecerse, volver a mostrar
          setTimeout(() => {
            resultsWrapper.style.opacity = '1';
            // Limpiar inline styles después de la animación
            setTimeout(() => {
              resultsWrapper.style.transition = '';
              resultsWrapper.style.opacity = '';
            }, 300);
          }, 300);
        }
        
        // Ejecutar búsqueda con los filtros actuales
        console.log('[SearchForm] Ejecutando búsqueda');
        this.onSearch();
      });

      buttonGroup.appendChild(button);
      return buttonGroup;
    }
}
