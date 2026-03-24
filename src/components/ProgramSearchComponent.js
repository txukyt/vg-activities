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

export class ProgramSearchComponent extends SearchComponent {
  constructor(router = null, params = {}) {
    super(router, params);
    this.fixedProgramId = params.programId || null;
    this.isFixedProgram = true;  // Marcar filtro como fijo
  }

  async render() {
    // Pre-aplicar filtro de programa fijo antes de renderizar
    // Los filtros de program son arrays en el store
    if (this.fixedProgramId) {
      // Hacer ambos cambios en una sola actualización para consistencia
      const currentFilters = store.getState().filters;
      store.setState({
        filters: {
          ...currentFilters,
          program: [this.fixedProgramId]
        },
        fixedProgramFilterFromRoute: this.fixedProgramId
      });
    }
    
    // Renderizar SearchComponent normalmente
    return super.render();
  }
}
