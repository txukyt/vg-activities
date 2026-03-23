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
    this.fixedCenterId = params.centerId || null;
    this.isFixedCenter = true;  // Marcar filtro como fijo
  }

  async render() {
    // Pre-aplicar filtro de centro fijo antes de renderizar
    // Los filtros de center/activity son arrays en el store
    if (this.fixedCenterId) {
      // Hacer ambos cambios en una sola actualización para consistencia
      const currentFilters = store.getState().filters;
      store.setState({
        filters: {
          ...currentFilters,
          center: [this.fixedCenterId]
        },
        fixedCenterFilterFromRoute: this.fixedCenterId
      });
    }
    
    // Renderizar SearchComponent normalmente
    return super.render();
  }
}
