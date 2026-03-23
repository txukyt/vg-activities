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
    this.fixedActivityId = params.activityId || null;
    this.isFixedActivity = true;  // Marcar filtro como fijo
  }

  async render() {
    // Pre-aplicar filtro de actividad fijo antes de renderizar
    // Los filtros de center/activity son arrays en el store
    if (this.fixedActivityId) {
      // Hacer ambos cambios en una sola actualización para consistencia
      const currentFilters = store.getState().filters;
      store.setState({
        filters: {
          ...currentFilters,
          activity: [this.fixedActivityId]
        },
        fixedActivityFilterFromRoute: this.fixedActivityId
      });
    }
    
    // Renderizar SearchComponent normalmente
    return super.render();
  }
}
