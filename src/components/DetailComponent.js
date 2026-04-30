import { store } from '@/store.js';
import { SearchService } from '@/services/SearchService.js';
import { ScheduleGridComponent } from '@/components/ScheduleGridComponent.js';

export class DetailComponent {
    constructor(router = null, params = {}) {
      this.centerId = params.centerId;
      this.activityId = params.activityId;
      this.router = router;
      this.activity = null;
    }

  async render() {
    const container = document.createElement('div');
    container.className = 'detail-component';

    try {
      console.log('[DetailComponent] Iniciando renderizado con Skeleton Loading', {
        activityId: this.activityId
      });
      
      // PASO 1: Mostrar SKELETON inmediatamente (estructura visual sin datos)
      const skeletonElement = this.#createSkeletonLoading();
      container.appendChild(this.#createHeader());
      container.appendChild(skeletonElement);

      // PASO 2: Obtener actividad del backend EN PARALELO (no bloqueante)
      this.#loadActivityFromBackend()
        .then((backendActivity) => {
          if (backendActivity) {
            // ===== ÉXITO: Backend devolvió la actividad =====
            console.log('[DetailComponent] Actividad obtenida del backend', {
              activityId: this.activityId,
              title: backendActivity.name,
              sessionsCount: backendActivity.sessions?.length || 0
            });

            this.activity = backendActivity;
            store.setCurrentActivity(this.activity);

            // Reemplazar skeleton con contenido real
            this.#replaceSkeletonWithContent(container, skeletonElement);

            // Restaurar scroll al inicio del componente
            this.#resetScroll();

          } else {
            // ===== ERROR: Backend no devolvió la actividad =====
            console.error('[DetailComponent] No se encontró actividad en backend', {
              activityId: this.activityId
            });

            this.#replaceSkeletonWithError(container, skeletonElement, 'Actividad no encontrada');
          }
        })
        .catch((error) => {
          console.error('[DetailComponent] Error obteniendo actividad:', error);
          this.#replaceSkeletonWithError(container, skeletonElement, 'Error al cargar la actividad');
        });

    } catch (error) {
      console.error('[DetailComponent] Error renderizando componente:', error);
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
      * Crea el skeleton loading (estructura visual sin datos reales).
      * Se muestra INMEDIATAMENTE para dar feedback visual al usuario.
      * Simula la estructura final: header, título, badge, descripción, grid de horarios.
      * @private
      * @returns {HTMLElement} Elemento del skeleton
      */
     #createSkeletonLoading() {
       const skeleton = document.createElement('article');
       skeleton.className = 'detail-content detail-skeleton';

       const wrapper = document.createElement('div');
       wrapper.className = 'detail-wrapper';

       // Info skeleton
       const infoDiv = document.createElement('div');
       infoDiv.className = 'detail-info';

       // Skeleton de título
       const titleSkeleton = document.createElement('div');
       titleSkeleton.className = 'skeleton skeleton-title';
       infoDiv.appendChild(titleSkeleton);

       // Skeleton de badge
       const badgeSkeleton = document.createElement('div');
       badgeSkeleton.className = 'skeleton skeleton-badge';
       infoDiv.appendChild(badgeSkeleton);

       // Skeleton de descripción (3 líneas)
       const descSkeleton = document.createElement('div');
       descSkeleton.className = 'skeleton-description';
       for (let i = 0; i < 3; i++) {
         const line = document.createElement('div');
         line.className = 'skeleton skeleton-text';
         if (i === 2) line.style.width = '60%'; // Última línea más corta
         descSkeleton.appendChild(line);
       }
       infoDiv.appendChild(descSkeleton);

       wrapper.appendChild(infoDiv);

       // Skeleton de grid de horarios
       const scheduleSkeletonDiv = document.createElement('div');
       scheduleSkeletonDiv.className = 'schedule-skeleton';

       // Grid con 6 items de skeleton
       const skeletonGrid = document.createElement('div');
       skeletonGrid.className = 'skeleton-grid';
       for (let i = 0; i < 6; i++) {
         const skeletonItem = document.createElement('div');
         skeletonItem.className = 'skeleton-item';
         skeletonItem.innerHTML = `
           <div class="skeleton skeleton-schedule-date"></div>
           <div class="skeleton skeleton-schedule-time"></div>
           <div class="skeleton skeleton-schedule-status" style="width: 70%;"></div>
         `;
         skeletonGrid.appendChild(skeletonItem);
       }
       scheduleSkeletonDiv.appendChild(skeletonGrid);
       wrapper.appendChild(scheduleSkeletonDiv);

       skeleton.appendChild(wrapper);
       return skeleton;
     }

     /**
      * Reemplaza el skeleton con el contenido real con transición suave.
      * @private
      * @param {HTMLElement} container - Contenedor principal
      * @param {HTMLElement} skeletonElement - Elemento skeleton a reemplazar
      */
     #replaceSkeletonWithContent(container, skeletonElement) {
       const contentElement = this.#createContent();
       
       // Transición: fade out skeleton
       skeletonElement.style.opacity = '1';
       skeletonElement.style.transition = 'opacity 0.3s ease-out';
       
       setTimeout(() => {
         skeletonElement.style.opacity = '0';
         
         setTimeout(() => {
           skeletonElement.replaceWith(contentElement);
         }, 300);
       }, 100);
     }

     /**
      * Reemplaza el skeleton con un mensaje de error.
      * @private
      * @param {HTMLElement} container - Contenedor principal
      * @param {HTMLElement} skeletonElement - Elemento skeleton a reemplazar
      * @param {string} errorMessage - Mensaje de error a mostrar
      */
     #replaceSkeletonWithError(container, skeletonElement, errorMessage) {
       const errorElement = document.createElement('div');
       errorElement.className = 'error';
       errorElement.innerHTML = `
         <p>${this.#escapeHtml(errorMessage)}</p>
         <button class="btn btn-primary" onclick="window.history.back()">Volver</button>
       `;

       skeletonElement.style.opacity = '1';
       skeletonElement.style.transition = 'opacity 0.3s ease-out';
       
       setTimeout(() => {
         skeletonElement.style.opacity = '0';
         
         setTimeout(() => {
           skeletonElement.replaceWith(errorElement);
         }, 300);
       }, 100);
     }

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
    * Desuscribirse y limpiar recursos.
    * Se llama desde router.js cuando se navega a otra ruta.
    * DetailComponent no tiene suscripciones activas actualmente,
    * pero este método aquí sirve como placeholder para consistencia.
    * @public
    */
   destroy() {
     console.log('[DetailComponent] 🗑️ Destruyendo componente');
   }

}
