import { SearchComponent } from '@/components/SearchComponent.js';
import { store } from '@/store.js';

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
