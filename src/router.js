/**
 * router.js
 * Router SPA para manejar rutas.
 * Soporta popstate para conservar resultados y scroll al volver.
 */

import { store } from './store.js';
import { BASE_PATH } from './config.js';

export class Router {
  constructor(appElement) {
    this.appElement = appElement;
    this.routes = new Map();
    this.currentRoute = null;

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
    // Agregar el base path desde config
    return BASE_PATH.replace(/\/$/, '') + url; // Evita doble barra al final
  }

  /**
   * Valida si una ruta está registrada en el router.
   * @private
   * @param {string} path - Ruta a validar
   * @returns {boolean} true si la ruta está registrada
   */
  #isValidRoute(path) {
    return this.routes.has(path);
  }

  /**
   * Obtiene la ruta inicial desde la URL del navegador.
   * Si detecta una URL inválida, realiza una redirección a la ruta base.
   * @param {Router} router - Instancia del router (para validar rutas)
   * @returns {{ path: string, params: Object }} Ruta y parámetros
   */
  static getCurrentRouteFromUrl(router) {
    let pathname = window.location.pathname;

    // Remover el base path si está presente
    if (BASE_PATH && BASE_PATH !== '/') {
      const basePath = BASE_PATH.replace(/\/$/, ''); // Remover barra final si existe
      if (pathname.startsWith(basePath)) {
        pathname = pathname.slice(basePath.length);
      }
    }

    // Asegurar que empieza con /
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }

    // Detectar patrón /center/:centerId/activity/:activityId/schedule/:sessionId
    const scheduleMatch = pathname.match(/^\/center\/([a-zA-Z0-9]+)\/activity\/([a-zA-Z0-9]+)\/schedule\/(.+)$/);
    if (scheduleMatch) {
      return {
        path: '/center/:centerId/activity/:activityId/schedule/:sessionId',
        params: { centerId: scheduleMatch[1], activityId: scheduleMatch[2], sessionId: scheduleMatch[3] }
      };
    }

    // Detectar patrón /center/:centerId/activity/:activityId
    const activityMatch = pathname.match(/^\/center\/([a-zA-Z0-9]+)\/activity\/([a-zA-Z0-9]+)$/);
    if (activityMatch) {
      return {
        path: "/center/:centerId/activity/:activityId",
        params: { centerId: activityMatch[1], activityId: activityMatch[2] }
      };
    }

    // Detectar patrón /center/:centerId (sin activity)
    const centerMatch = pathname.match(/^\/center\/([a-zA-Z0-9]+)$/);
    if (centerMatch) {
      return {
        path: '/center/:centerId',
        params: { centerId: centerMatch[1] }
      };
    }

    // Detectar patrón /activity/:activityId
    const singleActivityMatch = pathname.match(/^\/activity\/([a-zA-Z0-9]+)$/);
    if (singleActivityMatch) {
      return {
        path: '/activity/:activityId',
        params: { activityId: singleActivityMatch[1] }
      };
    }

     // Detectar patrón /program/:programId (sin activity)
    const programMatch = pathname.match(/^\/program\/([a-zA-Z0-9]+)$/);
    if (programMatch) {
      return {
        path: '/program/:programId',
        params: { programId: programMatch[1] }
      };
    }

    // Ruta default - pero primero verificar si es inválida
    // Si router está disponible y la URL actual no es válida, redirigir
    if (router && pathname !== '/' && !router.#isValidRoute(pathname)) {
      // Redireccionar la URL a la ruta base usando replaceState
      const baseUrl = BASE_PATH.replace(/\/$/, '') + '/';
      window.history.replaceState(
        { path: '/', params: {} },
        '',
        baseUrl
      );
    }

    return {
      path: '/',
      params: {}
    };
  }
}
