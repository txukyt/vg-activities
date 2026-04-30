import { SearchComponent } from '@/components/SearchComponent.js';
import { store } from '@/store.js';

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
