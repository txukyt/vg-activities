/**
 * SessionDetailComponent.js
 * Componente para mostrar los detalles de una sesión específica de una actividad.
 */

import { store } from '../store.js';
import { SearchService } from '../services/SearchService.js';
import { ScheduleService } from '../services/ScheduleService.js';

export class SessionDetailComponent {
  constructor(router = null, params = {}) {
    this.activityId = params.id;
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
      this.activity = await SearchService.getActivityById(this.activityId);
      
      if (!this.activity) {
        container.innerHTML = `
          <div class="error">
            <p>Actividad no encontrada</p>
            <button class="btn btn-primary" onclick="window.history.back()">Volver</button>
          </div>
        `;
        return container;
      }

      // Buscar la sesión por sessionId
      this.session = this.activity.sessions.find(s => s.id === this.sessionId);
      
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
        this.router.navigate('/activity/:id', { id: this.activityId });
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
    title.textContent = this.#escapeHtml(activity.title);

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
    grid.className = 'session-details-grid';

    const activity = this.activity;
    const session = this.session;

    const details = [
      {
        label: 'Fecha de sesión',
        value: ScheduleService.formatDate(session.date),
        icon: '📅'
      },
      {
        label: 'Horario',
        value: ScheduleService.formatTimeRange(session.startTime, session.endTime),
        icon: '🕐'
      },
      {
        label: 'Rango de edad',
        value: `${session.age.min}-${session.age.max} años`,
        icon: '👥'
      },
      {
        label: 'Plazas disponibles',
        value: `${session.availableSpots} de ${session.totalSpots}`,
        icon: '📍',
        className: session.availableSpots > 0 ? 'available' : 'full'
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
      detailItem.className = `session-detail-item ${detail.className || ''}`;

      const icon = document.createElement('span');
      icon.className = 'session-detail-icon';
      icon.textContent = detail.icon;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'session-detail-label';
      labelSpan.textContent = detail.label;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'session-detail-value';
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
   * Escapa caracteres HTML.
   * @private
   */
  #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
