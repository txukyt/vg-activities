import { store } from '@/store.js';
import { SearchService } from '@/services/SearchService.js';
import { ScheduleService } from '@/services/ScheduleService.js';

export class SessionDetailComponent {
  constructor(router = null, params = {}) {
    this.centerId = params.centerId;
    this.activityId = params.activityId;
    this.sessionId = params.sessionId;
    this.router = router;
    this.activity = null;
    this.session = null;
  }

  /**
   * Renderiza el componente de detalle de sesión.
   * @returns {HTMLElement} Elemento del componente
   */
  async render() {
    const container = document.createElement('div');
    container.className = 'session-detail-component';

    // Intentar cargar la actividad y la sesión
    try {
      // ESTRATEGIA OPTIMIZADA CON CACHÉ:
      // 1. Intentar obtener sesión desde store (guardada al hacer click desde DetailComponent)
      // 2. Si no existe en cache, obtener desde backend

      let sessionFromCache = store.getCurrentSession();
      let sessionFromBackend = null;

      console.log('[SessionDetailComponent] Iniciando carga de sesión', {
        sessionId: this.sessionId,
        sessionInCache: !!sessionFromCache
      });

      // PASO 1: Intentar usar sesión del cache
      if (sessionFromCache && sessionFromCache.id === this.sessionId) {
        console.log('[SessionDetailComponent] Sesión encontrada en cache', {
          sessionId: this.sessionId,
          fromCache: true
        });
        this.session = sessionFromCache;
        
        // Obtener actividad del cache
        this.activity = this.#getActivityFromCache(this.activityId);
        
        if (!this.activity) {
          // Actividad no en cache, obtener del backend
          console.log('[SessionDetailComponent] Actividad no en cache, consultando backend', {
            activityId: this.activityId
          });
          sessionFromBackend = await this.#loadActivityFromBackend(this.activityId);
          if (sessionFromBackend) {
            this.activity = sessionFromBackend;
          }
        }
      } else {
        // PASO 2: Sesión no en cache, obtener actividad completa del backend
        console.log('[SessionDetailComponent] Sesión no en cache, consultando backend', {
          sessionId: this.sessionId,
          fromCache: false
        });
        
        sessionFromBackend = await this.#loadActivityFromBackend(this.activityId);
        
        if (sessionFromBackend && sessionFromBackend.schedules) {
          // Buscar la sesión específica en la respuesta del backend
          this.session = sessionFromBackend.schedules.find(s => s.id === this.sessionId);
          this.activity = sessionFromBackend.activity;
          
          // Guardar sesión en store para futuros accesos
          if (this.session) {
            store.setCurrentSession(this.session);
            console.log('[SessionDetailComponent] Sesión guardada en cache desde backend', {
              sessionId: this.sessionId
            });
          }
        }
      }

      // Validaciones finales
      if (!this.activity) {
        container.innerHTML = `
          <div class="error">
            <p>Actividad no encontrada</p>
            <button class="btn btn-primary" onclick="window.history.back()">Volver</button>
          </div>
        `;
        return container;
      }

      if (!this.session) {
        container.innerHTML = `
          <div class="error">
            <p>Sesión no encontrada</p>
            <button class="btn btn-primary" onclick="window.history.back()">Volver</button>
          </div>
        `;
        return container;
      }

      store.setCurrentActivity(this.activity);

      // Crear header con botón volver
      const header = this.#createHeader();
      container.appendChild(header);

      // Crear contenido del detalle
      const content = this.#createContent();
      container.appendChild(content);

      // Crear sección de inscripción
      const enrollSection = this.#createEnrollSection();
      container.appendChild(enrollSection);

      // Restaurar scroll al inicio del componente
      this.#resetScroll();

    } catch (error) {
      console.error('Error cargando sesión:', error);
      container.innerHTML = `
        <div class="error">
          <p>Error al cargar la sesión</p>
          <button class="btn btn-primary" onclick="window.history.back()">Volver</button>
        </div>
      `;
    }

    return container;
  }

  /**
   * Restaura el scroll al inicio del componente después de renderizar.
   * Se ejecuta con requestAnimationFrame para asegurar que la UI esté lista.
   * @private
   */
  #resetScroll() {
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
    header.className = 'session-detail-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.textContent = '← Volver al detalle';
    backButton.addEventListener('click', () => {
      if (this.router) {
        this.router.navigate('/center/:centerId/activity/:activityId', { centerId: this.centerId, activityId: this.activityId });
      } else {
        window.history.back();
      }
    });

    header.appendChild(backButton);
    return header;
  }

  /**
   * Crea el contenido del detalle de la sesión.
   * @private
   */
  #createContent() {
    const content = document.createElement('article');
    content.className = 'session-detail-content';

    const activity = this.activity;
    const session = this.session;

    // Info principal
    const infoDiv = document.createElement('div');
    infoDiv.className = 'session-detail-info';

    const title = document.createElement('h1');
    title.className = 'session-detail-title';
    title.textContent = this.#escapeHtml(activity.name);

    const centerBadge = document.createElement('div');
    centerBadge.className = 'center-badge';
    centerBadge.textContent = this.#escapeHtml(activity.centerName);

    const description = document.createElement('p');
    description.className = 'session-detail-description';
    description.textContent = this.#escapeHtml(activity.description);

    infoDiv.appendChild(title);
    infoDiv.appendChild(centerBadge);
    infoDiv.appendChild(description);

    // Detalles en grid (con datos de la sesión)
    const detailsGrid = this.#createDetailsGrid();

    // Agrupar todo
    const wrapper = document.createElement('div');
    wrapper.className = 'session-detail-wrapper';

    wrapper.appendChild(infoDiv);
    wrapper.appendChild(detailsGrid);

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
    const session = this.session;

    const details = [
      {
        label: 'Fecha de sesión',
        value: this.#formatDateWithDay(session.date),
        icon: '📅'
      },
      {
        label: 'Horario',
        value: ScheduleService.formatTimeRange(session.startTime, session.endTime),
        icon: '🕐'
      },
      {
        label: 'Rango de edad',
        value: `${session.registration.ageLimits.min}-${session.registration.ageLimits.max} años`,
        icon: '👥'
      },
      {
        label: 'Plazas disponibles',
        value: `${session.hasAvailableSpots ? 'Sí' : 'No'}`,
        icon: '📍',
        className: session.hasAvailableSpots ? 'available' : 'full'
      },
      {
        label: 'Formato',
        value: session.format,
        icon: '📺'
      },
      {
        label: 'Idioma',
        value: session.language,
        icon: '🌍'
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
   * Crea la sección de inscripción.
   * @private
   */
  #createEnrollSection() {
    const section = document.createElement('section');
    section.className = 'session-enroll-section';

    const isAvailable = ScheduleService.hasAvailableSpots(this.session);

    const button = document.createElement('button');
    button.className = `btn btn-primary btn-enroll ${isAvailable ? 'available' : 'full'}`;
    button.disabled = !isAvailable;
    button.textContent = isAvailable ? 'Inscribirse en esta sesión' : 'Sesión completa';

    if (isAvailable) {
      button.addEventListener('click', () => {
        this.#handleEnrollClick();
      });
    }

    section.appendChild(button);
    return section;
  }

  /**
   * Maneja el clic en el botón de inscripción.
   * @private
   */
  #handleEnrollClick() {
    const message = `Te has inscrito en ${this.#escapeHtml(this.activity.title)} para la sesión del ${ScheduleService.formatDate(this.session.date)} a las ${this.session.startTime}. ¡Gracias por tu participación!`;
    
    alert(message);
    
    // Aquí se podría hacer una petición al backend para guardar la inscripción
    // Por ahora, solo mostramos un mensaje de confirmación
  }

  /**
   * Formatea una fecha mostrando el día de la semana.
   * Ejemplo: "viernes, 1 de febrero de 2026"
   * @private
   */
  #formatDateWithDay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
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
   * Obtiene una actividad del backend con todas sus sesiones.
   * Se utiliza como fallback cuando la sesión no está en cache del store.
   *
   * @private
   * @param {string} activityId - ID de la actividad a obtener
   * @returns {Promise<Object|null>} Actividad con sesiones o null si falla
   */
  async #loadActivityFromBackend() {
    try {
      console.log('[SessionDetailComponent] Obteniendo actividad desde backend', {
      });


      const filters = {
        searchType: 'detail',
        center: [this.centerId],
        activity: [this.activityId],
        scheduleId: this.sessionId
      };

      // Utilizar SearchService para obtener la actividad con todas sus sesiones
      const activity = await SearchService.getActivityById(filters, 0, 1);

      if (!activity) {
        console.warn('[SessionDetailComponent] Backend no devolvió actividad', {
        });
        return null;
      }

      console.log('[SessionDetailComponent] Actividad obtenida del backend exitosamente', {
        name: activity.name,
        sessionsCount: activity.sessions?.length || 0
      });

      return activity;
    } catch (error) {
      console.error('[SessionDetailComponent] Error obteniendo actividad del backend:', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Desuscribirse y limpiar recursos.
   * Se llama desde router.js cuando se navega a otra ruta.
   * SessionDetailComponent no tiene suscripciones activas actualmente,
   * pero este método aquí sirve como placeholder para consistencia.
   * @public
   */
  destroy() {
    console.log('[SessionDetailComponent] 🗑️ Destruyendo componente');
    // No hay suscripciones activas en SessionDetailComponent actualmente
    // Pero mantener este método para consistencia de patrón
  }

}
