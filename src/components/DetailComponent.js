/**
 * DetailComponent.js
 * Componente para mostrar los detalles completos de una actividad.
 * 
 * MEJORA v2: Cache-First Strategy
 * - Muestra sesiones cacheadas del último search INMEDIATAMENTE
 * - Fetch del backend EN PARALELO para datos actualizados
 * - Indicador visual de "actualizando" mientras se obtienen datos frescos
 * - Si backend falla, mantiene datos cacheados
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
   * FLUJO CACHE-FIRST:
   * 1. Busca actividad en cache (state.results) → Renderiza INMEDIATO
   * 2. Si no existe → Mostrar error
   * 3. Si existe → Inicia fetch del backend EN PARALELO
   * 4. Backend responde → Actualiza sesiones suavemente
   * 
   * @returns {HTMLElement} Elemento del componente
   */
  async render() {
    const container = document.createElement('div');
    container.className = 'detail-component';

    try {
      // PASO 1: Intentar obtener del cache (INMEDIATO - sin bloquear UI)
      this.activity = this.#getActivityFromCache(this.activityId);

      if (!this.activity) {
        console.warn('[DetailComponent] Actividad no encontrada en cache', { 
          activityId: this.activityId 
        });
        container.innerHTML = `
          <div class="error">
            <p>Actividad no encontrada</p>
            <button class="btn btn-primary" onclick="window.history.back()">Volver</button>
          </div>
        `;
        return container;
      }

      console.log('[DetailComponent] Actividad encontrada en cache', {
        activityId: this.activityId,
        title: this.activity.title,
        sessionsCount: this.activity.sessions?.length || 0
      });

      store.setCurrentActivity(this.activity);

      // PASO 2: Renderizar con datos del cache (MUY RÁPIDO)
      const header = this.#createHeader();
      container.appendChild(header);

      const content = this.#createContent();
      container.appendChild(content);

      // PASO 3: Fetch del backend EN PARALELO (sin bloquear UI)
      // Esto actualizará las sesiones si hay datos nuevos
      this.#fetchUpdatedActivityData(container);

    } catch (error) {
      console.error('[DetailComponent] Error renderizando actividad:', error);
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
