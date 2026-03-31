/**
 * ActivitySearchComponent.js
 * Componente que muestra SearchComponent con filtro de actividad fijo y obligatorio.
 * El usuario no puede borrar el filtro de la actividad especificada en la ruta.
 *
 * Además, en el panel de filtros SOLO muestra la actividad AOVM seleccionada,
 * no todas las actividades disponibles.
 */

import { SearchComponent } from './SearchComponent.js';
import { store } from '../store.js';

export class ActivitySearchComponent extends SearchComponent {
  constructor(router = null, params = {}) {
    super(router, params);
    this.activityId = params.activityId || null;
  }

  async render() {

    const currentFilters = store.getState().filters;
    store.setState({
      filters: {
        ...currentFilters,
        activity: [this.activityId]
      },
    });

    return super.render();
  }
}
