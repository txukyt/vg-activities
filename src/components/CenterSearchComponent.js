/**
 * CenterSearchComponent.js
 * Componente que muestra SearchComponent con filtro de centro fijo y obligatorio.
 * El usuario no puede borrar el filtro del centro especificado en la ruta.
 *
 * Además, en el panel de filtros SOLO muestra el centro seleccionado,
 * no todos los centros disponibles.
 */

import { SearchComponent } from './SearchComponent.js';
import { store } from '../store.js';

export class CenterSearchComponent extends SearchComponent {
  constructor(router = null, params = {}) {
    super(router, params);
    this.centerId = params.centerId || null;
  }

  async render() {
      const currentFilters = store.getState().filters;
      store.setState({
        filters: {
          ...currentFilters,
          center: [this.centerId]
        },
      });

    return super.render();
  }
}
