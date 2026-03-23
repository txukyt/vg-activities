/**
 * main.js
 * Punto de entrada de la aplicación SPA.
 * Inicializa el router, registra las páginas y monta la aplicación.
 */

import { Router } from './router.js';
import { SearchComponent } from './components/SearchComponent.js';
import { CenterSearchComponent } from './components/CenterSearchComponent.js';
import { ActivitySearchComponent } from './components/ActivitySearchComponent.js';
import { DetailComponent } from './components/DetailComponent.js';
import { SessionDetailComponent } from './components/SessionDetailComponent.js';
import { store } from './store.js';
import { FilterService } from './services/FilterService.js';

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
  router.registerPage('/center/:centerId/activity/:activityId', DetailComponent);
  router.registerPage('/center/:centerId/activity/:activityId/schedule/:sessionId', SessionDetailComponent);

   // Inicializar datos (centros y actividades)
   try {
     const initData = await FilterService.getInitData();
     store.setCenters(initData.centers);
     store.setActivities(initData.activities);
     
     console.info('Datos iniciales cargados:', {
       centersCount: initData.centers.length,
       activitiesCount: initData.activities.length,
       serverTimestamp: initData.serverTimestamp
     });
   } catch (error) {
     console.error('Error inicializando datos:', error);
   }

  // Obtener ruta actual
  const { path, params } = Router.getCurrentRouteFromUrl();

  // Renderizar página inicial
  await router.renderInitial(path, params);
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
