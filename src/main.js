/**
 * main.js
 * Punto de entrada de la aplicación SPA.
 * Inicializa el router, registra las páginas y monta la aplicación.
 */

import { Router } from '@/router.js';
import { SearchComponent } from '@/components/SearchComponent.js';
import { CenterSearchComponent } from '@/components/CenterSearchComponent.js';
import { ActivitySearchComponent } from '@/components/ActivitySearchComponent.js';
import { ProgramSearchComponent } from '@/components/ProgramSearchComponent.js';
import { DetailComponent } from '@/components/DetailComponent.js';
import { SessionDetailComponent } from '@/components/SessionDetailComponent.js';

/**
 * Inicializa la aplicación SPA.
 */
async function initApp() {
  // Obtener elemento raíz
  const appElement = document.getElementById('app');

  if (!appElement) {
    console.error('No se encontró elemento #app en el HTML');
    return;
  }

  // Crear router
  const router = new Router(appElement);

  // Registrar páginas
  router.registerPage('/', SearchComponent);
  router.registerPage('/center/:centerId', CenterSearchComponent);
  router.registerPage('/activity/:activityId', ActivitySearchComponent);
  router.registerPage('/program/:programId', ProgramSearchComponent);
  router.registerPage('/center/:centerId/activity/:activityId', DetailComponent);
  router.registerPage('/center/:centerId/activity/:activityId/schedule/:sessionId', SessionDetailComponent);

  // Obtener ruta actual
  const { path, params } = Router.getCurrentRouteFromUrl(router);

  // Renderizar página inicial
  await router.renderInitial(path, params);
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
