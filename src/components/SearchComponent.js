/**
 * SearchComponent.js
 * Componente de búsqueda y visualización de resultados.
 * Orquesta la búsqueda, obtiene datos del SearchService, actualiza el Store,
 * y renderiza resultados con ResultsRenderer.
 */

import { store } from '../store.js';
import { SearchService } from '../services/SearchService.js';
import { FilterService } from '../services/FilterService.js';
import { ResultsRenderer } from './ResultsRenderer.js';
import { SearchForm } from './SearchForm.js';
import { FilterPanel } from './FilterPanel.js';
import { SelectedFiltersBar } from './SelectedFiltersBar.js';

export class SearchComponent {
   constructor(router = null, params = {}) {
      this.router = router;
      this.params = params;
      this.unsubscribe = null;
      this.searchForm = null;
      this.filterPanel = null;
      this.selectedFiltersBar = null;
      this.intersectionObserver = null;  // Para infinite scroll
      this.previousFiltersJson = null;   // JSON string anterior para comparar
    }

   /**
    * Actualiza la visibilidad del drawer de filtros.
    * @private
    */
   #updateFiltersDrawerVisibility() {
     const state = store.getState();
     const filtersSidebar = document.querySelector('.filters-sidebar');
     const overlayElement = document.getElementById('filters-drawer-overlay');

     if (!filtersSidebar) return;

     // Mostrar/ocultar overlay (solo visible cuando drawer está abierto)
     if (overlayElement) {
       if (state.filtersDrawerOpen) {
         overlayElement.classList.add('active');
       } else {
         overlayElement.classList.remove('active');
       }
     }

     // Añadir/remover clase de abierto para drawer
     if (state.filtersDrawerOpen) {
       filtersSidebar.classList.add('drawer-open');
     } else {
       filtersSidebar.classList.remove('drawer-open');
     }
   }

   /**
    * Renderiza el componente completo.
    * @returns {HTMLElement} Elemento del componente
    */
   async render() {
     const container = document.createElement('div');
     container.className = 'search-component';

     // CRÍTICO: Suscribirse PRIMERO, antes de cualquier búsqueda
     // De lo contrario, la búsqueda inicial no dispara #updateResults()
     this.unsubscribe = store.subscribe(() => {
       this.#updateResults();
     });

     // Realizar una búsqueda general sin filtros al inicio si no hay resultados
      let state = store.getState();
      if (state.results.length === 0 && !state.loading && !state.error) {
       await this.#performSearch();
       state = store.getState();
     }

     // Header
     const header = document.createElement('header');
     header.className = 'search-header';
     header.innerHTML = `
       <h1>Inscripción de Actividades</h1>
       <p>Busca e inscríbete en las actividades de nuestros centros cívicos</p>
     `;
     container.appendChild(header);

     // Contenedor de layout 2 columnas (main + aside)
     const layoutContainer = document.createElement('div');
     layoutContainer.className = 'search-layout';

     // Columna 1: <main> con formulario + resultados
     const mainElement = document.createElement('main');
     mainElement.className = 'search-main';

     // Formulario de búsqueda (dentro de main)
     this.searchForm = new SearchForm(() => this.#performSearch());
     mainElement.appendChild(await this.searchForm.render());

     // Barra de filtros seleccionados (entre formulario y resultados)
     this.selectedFiltersBar = new SelectedFiltersBar(() => this.#performSearch());
     mainElement.appendChild(await this.selectedFiltersBar.render());

     // Resultados (dentro de main)
     const resultsWrapper = document.createElement('div');
     resultsWrapper.className = 'results-wrapper';
     resultsWrapper.id = 'results-wrapper';

     if (state.loading) {
       resultsWrapper.innerHTML = `
         <div class="loading">
           <p>Cargando resultados...</p>
         </div>
       `;
     } else if (state.error) {
       resultsWrapper.innerHTML = `
         <div class="error">
           <p>${this.#escapeHtml(state.error)}</p>
         </div>
       `;
     } else if (state.results.length > 0) {
       const resultsElement = ResultsRenderer.render(
         state.results,
         state.viewMode,
         (activityId) => this.#handleActivityClick(activityId)
       );
       resultsWrapper.appendChild(resultsElement);
     } else {
       resultsWrapper.innerHTML = `
         <div class="no-results">
           <p>Realiza una búsqueda para ver los resultados</p>
         </div>
       `;
     }

     mainElement.appendChild(resultsWrapper);
     layoutContainer.appendChild(mainElement);

     // Columna 2: Filtros en aside
     const filtersSidebar = document.createElement('aside');
     filtersSidebar.className = 'filters-sidebar';

     this.filterPanel = new FilterPanel(() => this.#performSearch());
     const filterPanelElement = await this.filterPanel.render();
     filtersSidebar.appendChild(filterPanelElement);

     layoutContainer.appendChild(filtersSidebar);
     container.appendChild(layoutContainer);

     // Overlay para cerrar drawer al hacer click afuera (móvil)
     const overlayElement = document.createElement('div');
     overlayElement.id = 'filters-drawer-overlay';
     overlayElement.className = 'filters-drawer-overlay';
     overlayElement.addEventListener('click', () => {
       store.setFiltersDrawerOpen(false);
       this.#updateFiltersDrawerVisibility();
     });
     container.appendChild(overlayElement);

     // Botón toggle de filtros (solo visible en móvil) - Posicionado al final para mayor z-index
     const filtersToggleContainer = document.createElement('div');
     filtersToggleContainer.className = 'filters-toggle-container';
     const filtersToggleButton = document.createElement('button');
     filtersToggleButton.className = 'btn-filters-toggle';
     filtersToggleButton.textContent = '📋 Filtros';
     filtersToggleButton.addEventListener('click', (e) => {
       e.stopPropagation(); // Evitar que el click se propague
       store.toggleFiltersDrawer();
       this.#updateFiltersDrawerVisibility();
     });
     filtersToggleContainer.appendChild(filtersToggleButton);
     container.appendChild(filtersToggleContainer);

     return container;
   }



  /**
   * Ejecuta una búsqueda con los filtros actuales.
   * Detecta cambios de filtros automáticamente.
   * Si es nueva búsqueda (filtros cambiados), reemplaza resultados.
   * Si es infinit scroll (scroll hacia abajo), acumula resultados.
   * @private
   * @param {boolean} isLoadingMore - true si es carga infinita, false si es búsqueda nueva
   */
  async #performSearch(isLoadingMore = false) {
    try {
      const state = store.getState();
      const filters = state.filters;
      const { offset, limit } = state.pagination;
      const currentFiltersJson = JSON.stringify(filters);

      console.log('[SearchComponent] #performSearch llamado. isLoadingMore:', isLoadingMore, 'offset:', offset, 'limit:', limit);

      // Detectar si cambió el filtro
      const filtersChanged = this.previousFiltersJson &&
        this.previousFiltersJson !== currentFiltersJson;

      if (filtersChanged) {
        console.log('[SearchComponent] Filtros cambiaron, reseteando offset a 0');
        // CRÍTICO: Desconectar observer ANTES de cambiar estado para evitar race conditions
        this.#disconnectInfiniteScroll();
        // Filtros cambiaron: nueva búsqueda desde offset 0
        isLoadingMore = false;
        store.setPaginationOffset(0);
      }

      if (!isLoadingMore) {
        // Nueva búsqueda: marcar que cargando
        store.setLoading(true);
      } else {
        // Infinite scroll: marcar que cargando más
        store.setIsLoadingMore(true);
      }

      const result = await SearchService.search(
        filters,
        isLoadingMore ? offset : 0,  // usar 0 para búsqueda nueva
        limit
      );

      if (isLoadingMore) {
        // Acumular resultados: merge inteligente de grupos por centro
        const existingResults = store.getState().results;
        const newResults = result.data;
        
        let mergedResults;
        if (result.viewMode === 'grouped') {
          // Modo agrupado: fusionar centros
          const centerMap = new Map();
          
          // Agregar centros existentes
          existingResults.forEach(centerGroup => {
            centerMap.set(centerGroup.center.id, {
              center: centerGroup.center,
              activities: [...centerGroup.activities]
            });
          });
          
          // Agregar nuevos centros / actividades
          newResults.forEach(newCenterGroup => {
            const centerId = newCenterGroup.center.id;
            if (centerMap.has(centerId)) {
              // Centro existe: agregar actividades nuevas
              const existingGroup = centerMap.get(centerId);
              newCenterGroup.activities.forEach(newActivity => {
                // No agregar si ya existe con el mismo ID
                if (!existingGroup.activities.some(a => a.id === newActivity.id)) {
                  existingGroup.activities.push(newActivity);
                }
              });
            } else {
              // Centro nuevo
              centerMap.set(centerId, newCenterGroup);
            }
          });
          
          // Convertir map a array ordenado
          mergedResults = Array.from(centerMap.values())
            .sort((a, b) => a.center.name.localeCompare(b.center.name));
        } else {
          // Modo lista: concatenar directamente
          mergedResults = [...existingResults, ...newResults];
        }
        
        // IMPORTANTE: Un solo setState para evitar múltiples re-renders
        store.setState({
          results: mergedResults,
          viewMode: result.viewMode,
          pagination: {
            offset: result.offset + result.limit,
            limit: result.limit,
            totalItems: result.totalItems,
            hasMore: result.hasMore,
            isLoadingMore: false
          }
        });
      } else {
        // Reemplazar resultados (nueva búsqueda)
        // CRÍTICO: Consolidar en UN ÚNICO setState() para evitar múltiples disparos de listeners
        console.log('[SearchComponent] Actualizando paginación. totalItems:', result.totalItems, 'hasMore:', result.hasMore, 'offset:', result.offset, 'limit:', result.limit);
        store.setState({
          results: result.data,
          viewMode: result.viewMode,
          pagination: {
            offset: result.offset + result.limit,
            limit: result.limit,
            totalItems: result.totalItems,
            hasMore: result.hasMore,
            isLoadingMore: false
          },
          loading: false
        });
      }

      // Guardar filtros actuales para próxima comparación
      this.previousFiltersJson = currentFiltersJson;
      
      const newState = store.getState();
      console.log('[SearchComponent] Estado actualizado. pagination:', newState.pagination);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      store.setError('Error al realizar la búsqueda');
      store.setState({ loading: false });
      store.setIsLoadingMore(false);
    }
  }

  /**
   * Actualiza los resultados cuando cambia el estado.
   * Implementa infinite scroll con Intersection Observer.
   * @private
   */
  #updateResults() {
    const state = store.getState();
    const resultsWrapper = document.getElementById('results-wrapper');

    console.log('[SearchComponent] #updateResults DISPARADO. loading:', state.loading, 'results:', state.results.length, 'hasMore:', state.pagination.hasMore);

    // Desconectar observer anterior INMEDIATAMENTE para evitar que interfiera
    this.#disconnectInfiniteScroll();

    // Actualizar filtros de Centro y Actividad en el panel de filtros
    if (this.filterPanel) {
      this.filterPanel.updateFormFilters();
    }

    // Actualizar barra de filtros seleccionados
    if (this.selectedFiltersBar) {
      this.selectedFiltersBar.update();
    }

    // Actualizar visibilidad del drawer
    this.#updateFiltersDrawerVisibility();

    if (!resultsWrapper) return;

    resultsWrapper.innerHTML = '';

    if (state.loading && state.results.length === 0) {
      // Primera búsqueda cargando
      resultsWrapper.innerHTML = `
        <div class="loading">
          <p>Cargando resultados...</p>
        </div>
      `;
    } else if (state.error && state.results.length === 0) {
      // Error en búsqueda sin resultados previos
      resultsWrapper.innerHTML = `
        <div class="error">
          <p>${this.#escapeHtml(state.error)}</p>
        </div>
      `;
    } else if (state.results.length > 0) {
      // Renderizar resultados
      console.log('[SearchComponent] Renderizando', state.results.length, 'resultados. hasMore:', state.pagination.hasMore);
      const resultsElement = ResultsRenderer.render(
        state.results,
        state.viewMode,
        (activityId) => this.#handleActivityClick(activityId)
      );
      resultsWrapper.appendChild(resultsElement);

      // Agregar sentinel para infinite scroll (al final de resultados)
      const sentinel = document.createElement('div');
      sentinel.id = 'infinite-scroll-sentinel';
      sentinel.className = 'infinite-scroll-sentinel';
      resultsWrapper.appendChild(sentinel);

      // Si hay más resultados, configurar observer para carga infinita
      if (state.pagination.hasMore && !state.pagination.isLoadingMore) {
        console.log('[SearchComponent] Configurando infinite scroll. Offset:', state.pagination.offset, 'Total:', state.pagination.totalItems);
        this.#setupInfiniteScroll(sentinel);
      } else {
        console.log('[SearchComponent] NO se configura infinite scroll. hasMore:', state.pagination.hasMore, 'isLoadingMore:', state.pagination.isLoadingMore);
      }

      // Indicador de carga infinita
      if (state.pagination.isLoadingMore) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-more';
        loadingIndicator.innerHTML = '<p>Cargando más resultados...</p>';
        resultsWrapper.appendChild(loadingIndicator);
      }
    } else {
      // Sin resultados
      resultsWrapper.innerHTML = `
        <div class="no-results">
          <p>No se encontraron resultados para tu búsqueda</p>
        </div>
      `;
    }
  }

  /**
   * Desconecta el Intersection Observer del infinite scroll.
   * Se llama cuando cambios de filtros para limpiar el observer anterior.
   * @private
   */
  #disconnectInfiniteScroll() {
    if (this.intersectionObserver) {
      console.log('[InfiniteScroll] Desconectando observer anterior');
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  /**
   * Configura Intersection Observer para infinite scroll.
   * Cuando el sentinel es visible, carga más resultados.
   * @private
   */
  #setupInfiniteScroll(sentinel) {
    console.log('[InfiniteScroll] === INICIANDO #setupInfiniteScroll ===');
    
    // Desconectar observer anterior si existe (siempre hacerlo al inicio)
    if (this.intersectionObserver) {
      console.log('[InfiniteScroll] Desconectando observer anterior');
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Crear nuevo observer
    console.log('[InfiniteScroll] CREANDO nuevo IntersectionObserver');
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Cuando el sentinel entra en viewport, cargar más
          if (entry.isIntersecting) {
            const state = store.getState();
            console.log('[InfiniteScroll] Sentinel visible. hasMore:', state.pagination.hasMore, 'isLoadingMore:', state.pagination.isLoadingMore);
            if (state.pagination.hasMore && !state.pagination.isLoadingMore) {
              console.log('[InfiniteScroll] Cargando más resultados...');
              this.#performSearch(true);  // true = infinite scroll
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '200px',  // Empezar a cargar 200px antes de llegar al final
        threshold: 0
      }
    );

    // Observar el sentinel
    console.log('[InfiniteScroll] ✓✓✓ OBSERVANDO NUEVO SENTINEL ✓✓✓');
    this.intersectionObserver.observe(sentinel);
    console.log('[InfiniteScroll] === #setupInfiniteScroll COMPLETADO ===');
  }

  /**
   * Maneja el click en una actividad.
   * @private
   */
  async #handleActivityClick(activityId) {
    if (this.router) {
      await this.router.navigate('/activity/:id', { id: activityId });
    }
  }

  /**
   * Escapa caracteres HTML.
   * @private
   */
  #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Limpia los listeners cuando el componente se desmonta.
   */
  destroy() {
    // Desconectar observer
    this.#disconnectInfiniteScroll();
    
    // Desuscribirse del store
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
