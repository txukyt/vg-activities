/**
 * DetailComponent.js
 * Componente para mostrar los detalles completos de una actividad.
 * 
 * MEJORA v3: Cache-First Con Fallback A Backend
 * - PRIMERO: Busca actividad en cache (state.results) → Renderiza INMEDIATAMENTE
 * - SI NO EN CACHE: Muestra indicador de carga e intenta obtener del backend
 * - SI BACKEND DEVUELVE: Enriquece datos y renderiza
 * - SI FALLA TODO: Mostrar error (no mostrar error si backend estaba cargando)
 * - PARALELO: Fetch del backend para actualizar sesiones (igual que v2)
 * - Indicador visual de "actualizando" mientras se obtienen datos frescos
 * - Si backend falla en carga paralela, mantiene datos cacheados/actuales
 */

import { store } from '../store.js';
import { SearchService } from '../services/SearchService.js';
import { ScheduleGridComponent } from './ScheduleGridComponent.js';

export class DetailComponent {
   constructor(router = null, params = {}) {
     this.activityId = params.id;
     this.router = router;
     this.activity = null;
     this.isUpdatingFromBackend = false;
   }

  /**
   * Renderiza el componente de detalle.
   * FLUJO CACHE-FIRST CON FALLBACK A BACKEND:
   * 1. Busca actividad en cache (state.results) → Renderiza INMEDIATO
   * 2. Si no existe → Mostrar indicador "cargando..." e intentar backend
   * 3. Si backend devuelve → Enriquecer y renderizar
   * 4. Si backend falla → Mostrar error
   * 5. En paralelo → Actualizar sesiones desde backend
   * 
   * @returns {HTMLElement} Elemento del componente
   */
  async render() {
    const container = document.createElement('div');
    container.className = 'detail-component';

    try {
      // PASO 1: Intentar obtener del cache (INMEDIATO - sin bloquear UI)
      this.activity = this.#getActivityFromCache(this.activityId);

      if (this.activity) {
        // ===== CASO 1: CACHE HIT → Renderizar inmediatamente =====
        console.log('[DetailComponent] Actividad encontrada en cache', {
          activityId: this.activityId,
          title: this.activity.title,
          sessionsCount: this.activity.sessions?.length || 0,
          source: 'CACHE'
        });

        store.setCurrentActivity(this.activity);

        // Renderizar inmediatamente
        const header = this.#createHeader();
        container.appendChild(header);

        const content = this.#createContent();
        container.appendChild(content);

        // Fetch del backend EN PARALELO para actualizar sesiones
        this.#fetchUpdatedActivityData(container);

      } else {
        // ===== CASO 2: CACHE MISS → Intentar backend =====
        console.warn('[DetailComponent] Actividad no encontrada en cache, intentando backend', { 
          activityId: this.activityId 
        });

        // Mostrar indicador de carga inicial
        this.#showInitialLoadingIndicator(container);

        // Intentar obtener del backend
        const backendActivity = await this.#loadActivityFromBackend();

        if (backendActivity) {
          // ===== CASO 2A: BACKEND HIT → Enriquecer y renderizar =====
          console.log('[DetailComponent] Actividad obtenida del backend', {
            activityId: this.activityId,
            title: backendActivity.name,
            source: 'BACKEND',
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

          // Fetch del backend EN PARALELO para actualizar/enriquecer sesiones
          this.#fetchUpdatedActivityData(container);

        } else {
          // ===== CASO 2B: BACKEND FAIL → Mostrar error =====
          console.error('[DetailComponent] No se encontró actividad en cache ni en backend', {
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

    const activity = this.activity;

    // Info principal
    const infoDiv = document.createElement('div');
    infoDiv.className = 'detail-info';

    const title = document.createElement('h1');
    title.className = 'detail-title';
    title.textContent = this.#escapeHtml(activity.name);

    const centerBadge = document.createElement('div');
    centerBadge.className = 'center-badge';
    centerBadge.textContent = this.#escapeHtml(activity.centerName);

    const description = document.createElement('p');
    description.className = 'detail-description';
    description.textContent = this.#escapeHtml(activity.description);

    infoDiv.appendChild(title);
    infoDiv.appendChild(centerBadge);
    infoDiv.appendChild(description);

    // Detalles en grid
    const detailsGrid = this.#createDetailsGrid();

    // Grid de horarios (si tiene sesiones)
    let scheduleGrid = null;
    if (activity.sessions && activity.sessions.length > 0) {
      const scheduleComponent = new ScheduleGridComponent(
        activity.sessions,
        (session) => this.#handleSessionClick(session)
      );
      scheduleGrid = scheduleComponent.render();
    }

    // Agrupar todo
    const wrapper = document.createElement('div');
    wrapper.className = 'detail-wrapper';

    wrapper.appendChild(infoDiv);
    wrapper.appendChild(detailsGrid);
    
    // Agregar grid de horarios si existe
    if (scheduleGrid) {
      wrapper.appendChild(scheduleGrid);
    }

    content.appendChild(wrapper);
    return content;
  }

  /**
   * Crea el grid de detalles.
   * @private
   */
  #createDetailsGrid() {
    const grid = document.createElement('div');
    grid.className = 'details-grid';

    const activity = this.activity;

    // Los metadatos ahora están en las sesiones, no en la actividad
    // Mostrar solo información básica de la actividad
    const details = [
      {
        label: 'Centro',
        value: this.#escapeHtml(activity.centerName),
        icon: '🏢'
      },
      {
        label: 'Tipo',
        value: this.#escapeHtml(activity.centerType),
        icon: '🏛'
      }
    ];

    details.forEach(detail => {
      const detailItem = document.createElement('div');
      detailItem.className = `detail-item ${detail.className || ''}`;

      const icon = document.createElement('span');
      icon.className = 'detail-icon';
      icon.textContent = detail.icon;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'detail-label';
      labelSpan.textContent = detail.label;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'detail-value';
      valueSpan.textContent = this.#escapeHtml(detail.value);

      detailItem.appendChild(icon);
      detailItem.appendChild(labelSpan);
      detailItem.appendChild(valueSpan);

      grid.appendChild(detailItem);
    });

    return grid;
  }

  /**
   * Maneja el clic en el botón de ver detalle de una sesión.
   * @private
   * @param {Object} session - Sesión seleccionada
   */
  #handleSessionClick(session) {
    if (this.router) {
      this.router.navigate('/activity/:id/schedule/:sessionId', {
        id: this.activityId,
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
    * Obtiene una actividad del backend cuando no está en cache.
    * Intenta cargar desde SearchService.getActivityById().
    * Enriquece con información del centro si es posible.
    * 
    * @private
    * @returns {Promise<Object|null>} Actividad enriquecida o null si falla
    */
   async #loadActivityFromBackend() {
     try {
       console.log('[DetailComponent] Iniciando búsqueda en backend', {
         activityId: this.activityId
       });

       // Obtener actividad del backend (SearchService obtiene del store.activities)
       const activity = await SearchService.getActivityById(this.activityId);

       if (!activity) {
         console.warn('[DetailComponent] Backend no devolvió actividad', {
           activityId: this.activityId
         });
         return null;
       }

       console.log('[DetailComponent] Actividad obtenida del backend', {
         activityId: this.activityId,
         title: activity.name,
         hasSessions: !!activity.sessions
       });

       // Intentar enriquecer con datos del centro
       // Buscar en state.results para obtener centerName y centerType
       const enrichedActivity = this.#enrichActivityWithCenterData(activity);

       return enrichedActivity;

     } catch (error) {
       console.error('[DetailComponent] Error obteniendo actividad del backend:', {
         activityId: this.activityId,
         error: error.message
       });
       return null; // No lanzar error, retornar null para que se muestre error genérico
     }
   }

   /**
    * Enriquece una actividad con datos del centro.
    * Busca el centerName y centerType en state.results.
    * 
    * @private
    * @param {Object} activity - Actividad base
    * @returns {Object} Actividad enriquecida
    */
   #enrichActivityWithCenterData(activity) {
     try {
       const state = store.getState();
       
       // Buscar la actividad en state.results para obtener datos del centro
       if (Array.isArray(state.results)) {
         for (const centerGroup of state.results) {
           if (centerGroup.activities) {
             const found = centerGroup.activities.find(a => a.id === activity.id);
             if (found) {
               // Devolver actividad con datos del centro
               return {
                 ...activity,
                 centerName: centerGroup.center?.name || 'Centro desconocido',
                 centerType: centerGroup.center?.type || 'Centro'
               };
             }
           }
         }
       }

       // Si no se encuentra en results, usar valores por defecto
       console.warn('[DetailComponent] No se encontraron datos del centro, usando valores por defecto', {
         activityId: activity.id
       });

       return {
         ...activity,
         centerName: 'Centro desconocido',
         centerType: 'Centro'
       };

     } catch (error) {
       console.error('[DetailComponent] Error enriqueciendo actividad:', error);
       return {
         ...activity,
         centerName: 'Centro desconocido',
         centerType: 'Centro'
       };
     }
   }

   /**
    * Extrae una actividad del cache (state.results).
    * Navega la estructura jerárquica: Centro → Actividades.
    * 
    * @private
    * @param {string} activityId - ID de la actividad a buscar
    * @returns {Object|null} Actividad con sesiones o null si no existe
    */
   #getActivityFromCache(activityId) {
    const state = store.getState();
    
    // state.results es un array de centros agrupados
    if (!Array.isArray(state.results) || state.results.length === 0) {
      console.warn('[DetailComponent] Cache vacío o inválido', {
        resultsType: typeof state.results,
        resultsLength: Array.isArray(state.results) ? state.results.length : 'N/A'
      });
      return null;
    }

    // Buscar la actividad en la estructura jerárquica
    for (const centerGroup of state.results) {
      if (centerGroup.activities && Array.isArray(centerGroup.activities)) {
        const activity = centerGroup.activities.find(a => a.id === activityId);
        
        if (activity) {
          // Enriquecer con información del centro
          return {
            ...activity,
            centerName: centerGroup.center?.name || 'Centro desconocido',
            centerType: centerGroup.center?.type || 'Centro'
          };
        }
      }
    }

    console.warn('[DetailComponent] Actividad no encontrada en cache', { 
      activityId,
      centersCount: state.results.length,
      activitiesInCache: state.results.reduce((sum, cg) => 
        sum + (cg.activities?.length || 0), 0
      )
    });
    return null;
  }

  /**
   * Obtiene datos actualizados del backend.
   * Ejecuta en paralelo sin bloquear la UI.
   * Actualiza las sesiones si hay cambios.
   * 
   * @private
   * @param {HTMLElement} container - Contenedor para agregar indicadores
   */
  async #fetchUpdatedActivityData(container) {
    // Evitar múltiples requests simultáneos
    if (this.isUpdatingFromBackend) {
      console.log('[DetailComponent] Ya hay un fetch en curso');
      return;
    }

    try {
      this.isUpdatingFromBackend = true;

      console.log('[DetailComponent] Iniciando fetch del backend', {
        activityId: this.activityId
      });

      // Mostrar indicador de actualización
      this.#showLoadingIndicator(container);

      // Fetch del backend (SearchService ahora obtiene del store)
      const updatedActivity = await SearchService.getActivityById(this.activityId);

      if (updatedActivity && updatedActivity.sessions) {
        console.log('[DetailComponent] Datos del backend recibidos', {
          activityId: this.activityId,
          oldSessionsCount: this.activity.sessions?.length || 0,
          newSessionsCount: updatedActivity.sessions.length
        });

        // Actualizar actividad
        this.activity = updatedActivity;
        store.setCurrentActivity(updatedActivity);

        // Actualizar solo las sesiones en la UI
        await this.#updateSessionsDisplay(container);
      } else {
        console.log('[DetailComponent] Backend devolvió data sin sesiones', {
          activityId: this.activityId
        });
      }

      // Ocultar indicador
      this.#hideLoadingIndicator(container);

    } catch (error) {
      console.error('[DetailComponent] Error en fetch del backend:', {
        activityId: this.activityId,
        error: error.message
      });

      // Si backend falla, mantener datos cacheados (no mostrar error)
      this.#hideLoadingIndicator(container);

    } finally {
      this.isUpdatingFromBackend = false;
    }
  }

  /**
   * Muestra un indicador visual de "actualizando".
   * @private
   * @param {HTMLElement} container - Contenedor del componente
   */
  #showLoadingIndicator(container) {
    // No mostrar si ya existe
    if (container.querySelector('.updating-indicator')) {
      return;
    }

    const indicator = document.createElement('div');
    indicator.className = 'updating-indicator';
    indicator.innerHTML = `
      <span class="updating-spinner">↻</span>
      <span class="updating-text">Actualizando sesiones...</span>
    `;

    // Agregar después del header
    const header = container.querySelector('.detail-header');
    if (header) {
      header.insertAdjacentElement('afterend', indicator);
    } else {
      container.insertBefore(indicator, container.firstChild);
    }
  }

   /**
    * Oculta el indicador visual de "actualizando".
    * @private
    * @param {HTMLElement} container - Contenedor del componente
    */
   #hideLoadingIndicator(container) {
     const indicator = container.querySelector('.updating-indicator');
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

   /**
    * Muestra un indicador visual de "cargando actividad" cuando no está en cache.
    * Se muestra mientras se intenta cargar del backend.
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

  /**
   * Actualiza el grid de sesiones sin re-renderizar todo el componente.
   * Reemplaza solo el ScheduleGrid con las nuevas sesiones.
   * 
   * @private
   * @param {HTMLElement} container - Contenedor del componente
   */
  async #updateSessionsDisplay(container) {
    try {
      // Buscar el grid de horarios actual
      const oldScheduleGrid = container.querySelector('.schedule-grid');
      
      if (!oldScheduleGrid) {
        console.log('[DetailComponent] No hay grid de sesiones para actualizar');
        return;
      }

      // Crear nuevo grid con sesiones actualizadas
      if (this.activity.sessions && this.activity.sessions.length > 0) {
        const scheduleComponent = new ScheduleGridComponent(
          this.activity.sessions,
          (session) => this.#handleSessionClick(session)
        );
        const newScheduleGrid = scheduleComponent.render();

        // Reemplazar con transición suave
        oldScheduleGrid.style.opacity = '0';
        oldScheduleGrid.style.transition = 'opacity 0.2s ease-out';

        setTimeout(() => {
          oldScheduleGrid.replaceWith(newScheduleGrid);
          
          // Fade-in del nuevo grid
          newScheduleGrid.style.opacity = '0';
          newScheduleGrid.style.transition = 'opacity 0.3s ease-in';
          
          // Trigger reflow para aplicar transición
          void newScheduleGrid.offsetHeight;
          newScheduleGrid.style.opacity = '1';
        }, 200);

        console.log('[DetailComponent] Grid de sesiones actualizado', {
          sessionsCount: this.activity.sessions.length
        });
      }

    } catch (error) {
      console.error('[DetailComponent] Error actualizando grid de sesiones:', error);
      // No lanzar error, mantener UI como está
    }
  }
}
