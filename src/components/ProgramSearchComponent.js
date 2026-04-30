import { SearchComponent } from '@/components/SearchComponent.js';
import { store } from '@/store.js';

export class ProgramSearchComponent extends SearchComponent {
  constructor(router = null, params = {}) {
    super(router, params);
  }

  async render() {
      const currentFilters = store.getState().filters;
      store.setState({
        filters: {
          ...currentFilters,
          program: [this.params.programId]
        },
      });

    return super.render();
  }
}
