/**
 * DetailComponent.js
 * Componente para mostrar los detalles completos de una actividad.
 * 
 * MEJORA v4: Backend-First Strategy
 * - PRIMERO: Mostrar indicador de carga inicial
 * - SEGUNDO: Llamar al backend para obtener datos de la actividad
 * - SI BACKEND DEVUELVE: Enriquecer con datos del centro y renderizar
 * - SI FALLA: Mostrar error al usuario
 * - NO CACHE: Ya no se usa cache como fuente principal de datos
 * - LINEAL: Flujo secuencial y predecible para mejor UX
 */

import { store } from '../store.js';
import { SearchService } from '../services/SearchService.js';
import { ScheduleGridComponent } from './ScheduleGridComponent.js';

export class DetailComponent {
    constructor(router = null, params = {}) {
      this.centerId = params.centerId;
      this.activityId = params.activityId;
      this.router = router;
      this.activity = null;
    }

  /**
   * Renderiza el componente de detalle.
   * FLUJO BACKEND-FIRST:
   * 1. Mostrar indicador de carga inicial
   * 2. Llamar al backend para obtener la actividad
   * 3. Si backend devuelve → Enriquecer con datos del centro y renderizar
   * 4. Si backend falla → Mostrar error al usuario
   * 
   * @returns {HTMLElement} Elemento del componente
   */
  async render() {
    const container = document.createElement('div');
    container.className = 'detail-component';

    try {
      // PASO 1: Mostrar indicador de carga inicial
      console.log('[DetailComponent] Iniciando renderizado (Backend-First)', {
        activityId: this.activityId
      });
      
      this.#showInitialLoadingIndicator(container);

      // PASO 2: Obtener actividad del backend
      const backendActivity = await this.#loadActivityFromBackend();

      if (backendActivity) {
        // ===== ÉXITO: Backend devolvió la actividad =====
        console.log('[DetailComponent] Actividad obtenida del backend', {
          activityId: this.activityId,
          title: backendActivity.name,
          sessionsCount: backendActivity.sessions?.length || 0
        });

        this.activity = backendActivity;
        store.setCurrentActivity(this.activity);

        // Ocultar indicador de carga
        this.#hideInitialLoadingIndicator(container);

        // Renderizar con datos del backend
        const header = this.#createHeader();
        container.appendChild(header);

        const content = this.#createContent();
        container.appendChild(content);

        // Restaurar scroll al inicio del componente
        this.#resetScroll();

      } else {
        // ===== ERROR: Backend no devolvió la actividad =====
        console.error('[DetailComponent] No se encontró actividad en backend', {
          activityId: this.activityId
        });

        this.#hideInitialLoadingIndicator(container);

        container.innerHTML = `
          <div class="error">
            <p>Actividad no encontrada</p>
            <button class="btn btn-primary" onclick="window.history.back()">Volver</button>
          </div>
        `;
      }

    } catch (error) {
      console.error('[DetailComponent] Error renderizando actividad:', error);
      this.#hideInitialLoadingIndicator(container);

      container.innerHTML = `
        <div class="error">
          <p>Error al cargar la actividad</p>
          <button class="btn btn-primary" onclick="window.history.back()">Volver</button>
        </div>
      `;
    }

    return container;
  }

  /**
   * Restaura el scroll al inicio del componente después de renderizar.
   * Se ejecuta con un pequeño delay para asegurar que la UI esté lista.
   * @private
   */
  #resetScroll() {
    // Usar requestAnimationFrame para ejecutar después del repaint
    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }

/**
   * Crea el header con botón de volver.
   * @private
   */
  #createHeader() {
    const header = document.createElement('header');
    header.className = 'detail-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.textContent = '← Volver a resultados';
    backButton.addEventListener('click', () => {
      if (this.router) {
        this.router.navigate('/');
      } else {
        window.history.back();
      }
    });

    header.appendChild(backButton);
    return header;
  }

  /**
   * Crea el contenido del detalle de la actividad.
   * @private
   */
  #createContent() {
    const content = document.createElement('article');
    content.className = 'detail-content';

    const schedules = this.activity;

    // Info principal
    const infoDiv = document.createElement('div');
    infoDiv.className = 'detail-info';

    const title = document.createElement('h1');
    title.className = 'detail-title';
    title.textContent = this.#escapeHtml(schedules.activity.name);

    const centerBadge = document.createElement('div');
    centerBadge.className = 'center-badge';
    centerBadge.textContent = this.#escapeHtml(schedules.center.name);

    const description = document.createElement('p');
    description.className = 'detail-description';
    description.textContent = this.#escapeHtml(schedules.activity.description);

    infoDiv.appendChild(title);
    infoDiv.appendChild(centerBadge);
    infoDiv.appendChild(description);

    // Grid de horarios (si tiene sesiones)
    let scheduleGrid = null;
     if (schedules.schedules && schedules.schedules.length > 0) {
      const scheduleComponent = new ScheduleGridComponent(
        schedules.schedules,
        (schedule) => this.#handleSessionClick(schedule)
      );
      scheduleGrid = scheduleComponent.render();
    }

    // Agrupar todo
    const wrapper = document.createElement('div');
    wrapper.className = 'detail-wrapper';

    wrapper.appendChild(infoDiv);
    
    // Agregar grid de horarios si existe
    if (scheduleGrid) {
      wrapper.appendChild(scheduleGrid);
    }

    content.appendChild(wrapper);
    return content;
  }

  /**
   * Maneja el clic en el botón de ver detalle de una sesión.
   * @private
   * @param {Object} session - Sesión seleccionada
   */
  #handleSessionClick(session) {
    if (this.router) {
      this.router.navigate('/center/:centerId/activity/:activityId/schedule/:sessionId', {
        centerId: this.centerId,
        activityId: this.activityId,
        sessionId: session.id
      });
    }
  }

  /**
   * Formatea una fecha.
   * @private
   */
  #formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
     * Obtiene una actividad del backend.
     * FLUJO Backend-First:
     * 1. SearchService.getActivityById() consulta SolrGateway.searchDetail()
     * 2. SolrGateway envía petición POST al backend SOLR
     * 3. Backend devuelve { activity, sessions }
     * 4. SearchService enriquece la actividad con datos del centro
     * 5. DetailComponent recibe actividad lista para renderizar
     *
     * @private
     * @returns {Promise<Object|null>} Actividad enriquecida o null si falla
     */
    async #loadActivityFromBackend() {
      try {
        console.log('[DetailComponent] Iniciando carga de actividad desde backend', {
          activityId: this.activityId,
          centerId: this.centerId
        });

        // NOTA: SearchService.getActivityById() ya se encarga de:
        // - Llamar a SolrGateway.searchDetail()
        // - Enriquecer con datos del centro
        // Por lo que recibimos la actividad lista para usar
        const filters = {
          searchType: 'detail',
          center: [this.centerId],
          activity: [this.activityId]
        };

        const activity = await SearchService.getActivityById(filters, 0, -1);

        if (!activity) {
          console.warn('[DetailComponent] Backend no devolvió actividad', {
            activityId: this.activityId,
            centerId: this.centerId
          });
          return null;
        }

        console.log('[DetailComponent] Actividad obtenida correctamente', {
          activityId: this.activityId,
          title: activity.name,
          centerName: activity.centerName,
          sessionsCount: activity.sessions?.length || 0
        });

        return activity;

      } catch (error) {
        console.error('[DetailComponent] Error obteniendo actividad del backend:', {
          activityId: this.activityId,
          centerId: this.centerId,
          error: error.message
        });
        return null;
      }
    }
    
    /**
     * Muestra un indicador visual de "cargando actividad".
     * Se muestra mientras se intenta cargar del backend en el flujo Backend-First.
     * 
     * @private
     * @param {HTMLElement} container - Contenedor del componente
     */
    #showInitialLoadingIndicator(container) {
     // No mostrar si ya existe
     if (container.querySelector('.initial-loading-indicator')) {
       return;
     }

     const indicator = document.createElement('div');
     indicator.className = 'initial-loading-indicator';
     indicator.innerHTML = `
       <div class="loading-spinner"></div>
       <p class="loading-text">Cargando actividad...</p>
     `;

     container.appendChild(indicator);
   }

   /**
    * Oculta el indicador inicial de "cargando actividad".
    * @private
    * @param {HTMLElement} container - Contenedor del componente
    */
   #hideInitialLoadingIndicator(container) {
     const indicator = container.querySelector('.initial-loading-indicator');
     if (indicator) {
       // Transición suave de salida
       indicator.style.opacity = '0';
       indicator.style.transition = 'opacity 0.3s ease-out';
       
       setTimeout(() => {
         if (indicator.parentElement) {
           indicator.remove();
         }
       }, 300);
     }
   }


}
