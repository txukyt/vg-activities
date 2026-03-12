/**
 * router.js
 * Router SPA para manejar rutas.
 * Rutas: / (Búsqueda) y /activity/:id (Detalle)
 * Soporta popstate para conservar resultados y scroll al volver.
 */

import { store } from './store.js';

export class Router {
  constructor(appElement) {
    this.appElement = appElement;
    this.routes = new Map();
    this.currentRoute = null;
    this.pageComponents = {};

    this.#setupEventListeners();
  }

  /**
   * Registra un componente de página por ruta.
   * @param {string} path - Ruta (ej: '/', '/activity/:id')
   * @param {Function} componentClass - Clase del componente
   */
  registerPage(path, componentClass) {
    this.routes.set(path, componentClass);
  }

  /**
   * Navega a una ruta específica.
   * @param {string} path - Ruta de destino
   * @param {Object} params - Parámetros de la ruta
   */
  async navigate(path, params = {}) {
    // Guardar posición del scroll antes de navegar
    if (this.currentRoute === '/') {
      store.saveScrollPosition(window.scrollY);
    }

    // Actualizar historial del navegador
    const url = this.#buildUrl(path, params);
    window.history.pushState(
      { path, params },
      '',
      url
    );

    await this.#render(path, params);
  }

  /**
   * Renderiza una ruta sin actualizar el historial (para inicialización).
   * @param {string} path - Ruta de destino
   * @param {Object} params - Parámetros de la ruta
   */
  async renderInitial(path, params = {}) {
    await this.#render(path, params);
  }

  /**
   * Vuelve a renderizar la ruta actual (útil para cambios de estado).
   */
  async refresh() {
    if (this.currentRoute) {
      await this.#render(this.currentRoute);
    }
  }

  /**
   * Configura los event listeners para navegación.
   * @private
   */
  #setupEventListeners() {
    // Manejar botón atrás del navegador
    window.addEventListener('popstate', async (event) => {
      const { path = '/', params = {} } = event.state || {};
      
      await this.#render(path, params);

      // Restaurar scroll si volvemos a la página de búsqueda (después del render)
      if (path === '/') {
        setTimeout(() => {
          const scrollPos = store.getScrollPosition();
          if (scrollPos > 0) {
            window.scrollTo(0, scrollPos);
          }
        }, 150);
      }
    });
  }

  /**
   * Renderiza una ruta especificada.
   * @private
   * @param {string} path - Ruta a renderizar
   * @param {Object} params - Parámetros de la ruta
   */
  async #render(path, params = {}) {
    const componentClass = this.routes.get(path);

    if (!componentClass) {
      console.error(`Ruta no encontrada: ${path}`);
      return;
    }

    // Limpiar contenedor
    this.appElement.innerHTML = '';

    // Instanciar y montar componente
    const component = new componentClass(this, params);
    const element = await component.render();
    
    // Verificar que element es un nodo válido
    if (element instanceof Node) {
      this.appElement.appendChild(element);
    } else {
      console.error('El componente no retornó un Node válido');
    }

    this.currentRoute = path;
  }

  /**
   * Construye una URL a partir de la ruta y parámetros.
   * @private
   * @param {string} path - Ruta base
   * @param {Object} params - Parámetros
   * @returns {string} URL completa
   */
  #buildUrl(path, params) {
    let url = path;
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
    return url;
  }

  /**
   * Obtiene la ruta inicial desde la URL del navegador.
   * @returns {{ path: string, params: Object }} Ruta y parámetros
   */
  static getCurrentRouteFromUrl() {
    const pathname = window.location.pathname;

    // Detectar patrón /activity/:id/schedule/:sessionId
    const scheduleMatch = pathname.match(/^\/activity\/(\d+)\/schedule\/(.+)$/);
    if (scheduleMatch) {
      return {
        path: '/activity/:id/schedule/:sessionId',
        params: { id: parseInt(scheduleMatch[1]), sessionId: scheduleMatch[2] }
      };
    }

    // Detectar patrón /activity/:id
    const activityMatch = pathname.match(/^\/activity\/(\d+)$/);
    if (activityMatch) {
      return {
        path: '/activity/:id',
        params: { id: parseInt(activityMatch[1]) }
      };
    }

    // Ruta default
    return {
      path: '/',
      params: {}
    };
  }
}
