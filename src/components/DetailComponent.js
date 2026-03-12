/**
 * DetailComponent.js
 * Componente para mostrar los detalles completos de una actividad.
 */

import { store } from '../store.js';
import { SearchService } from '../services/SearchService.js';
import { ScheduleGridComponent } from './ScheduleGridComponent.js';

export class DetailComponent {
   constructor(router = null, params = {}) {
     this.activityId = params.id;
     this.router = router;
     this.activity = null;
   }

  /**
   * Renderiza el componente de detalle.
   * @returns {HTMLElement} Elemento del componente
   */
  async render() {
    const container = document.createElement('div');
    container.className = 'detail-component';

    // Intentar cargar la actividad
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

      store.setCurrentActivity(this.activity);

      // Crear header con botón volver
      const header = this.#createHeader();
      container.appendChild(header);

      // Crear contenido del detalle
      const content = this.#createContent();
      container.appendChild(content);

    } catch (error) {
      console.error('Error cargando actividad:', error);
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
    title.textContent = this.#escapeHtml(activity.title);

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
}
