/**
 * ScheduleGridComponent.js
 * Componente para mostrar un grid de horarios agrupados por fecha y franja horaria.
 */

import { ScheduleService } from '../services/ScheduleService.js';

export class ScheduleGridComponent {
   constructor(sessions = [], onSessionClick = null) {
     this.sessions = sessions;
     this.onSessionClick = onSessionClick;
     this.sortedDates = ScheduleService.getUniqueSortedDates(sessions);
   }

  /**
   * Renderiza el componente del grid de horarios.
   * @returns {HTMLElement} Elemento del componente
   */
  render() {
    const container = document.createElement('div');
    container.className = 'schedule-grid-container';

    // Título
    const title = document.createElement('h2');
    title.className = 'schedule-grid-title';
    title.textContent = 'Horarios Disponibles';
    container.appendChild(title);

    // Grid principal
    const grid = document.createElement('div');
    grid.className = 'schedule-grid';

    // Si no hay sesiones, mostrar mensaje
    if (this.sortedDates.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'schedule-empty';
      empty.textContent = 'No hay horarios disponibles';
      grid.appendChild(empty);
      container.appendChild(grid);
      return container;
    }

    // Renderizar cada fecha con sus horarios
    this.sortedDates.forEach(date => {
      const dateGroup = this.#createDateGroup(date);
      grid.appendChild(dateGroup);
    });

    container.appendChild(grid);
    return container;
  }

  /**
   * Crea un grupo de horarios para una fecha.
   * @private
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @returns {HTMLElement} Elemento del grupo de fecha
   */
  #createDateGroup(date) {
    const group = document.createElement('div');
    group.className = 'schedule-date-group';

    // Convertir la fecha YYYY-MM-DD a YYYYMMDD para comparar con startsAt
    const [yr, mn, dy] = date.split('-');
    const dateYYYYMMDD = `${yr}${mn}${dy}`;

    // Obtener la primera sesión para extraer startsAt y endsAt
    const firstSessionForDate = this.sessions.find(session => {
      const startsAt = session.eventDates?.startsAt;
      return startsAt && startsAt === dateYYYYMMDD;
    });

    // Título de la fecha con rango (startsAt - endsAt)
    const title = document.createElement('h3');
    title.className = 'schedule-date-title';
    if (firstSessionForDate && firstSessionForDate.eventDates?.endsAt) {
      const dateRange = this.#formatDateRange(
        firstSessionForDate.eventDates.startsAt,
        firstSessionForDate.eventDates.endsAt
      );
      title.textContent = dateRange;
    } else {
      title.textContent = ScheduleService.formatDate(date);
    }
    group.appendChild(title);

    // Filtrar todas las sesiones que pertenecen a esta fecha
    const sessionsForDate = this.sessions.filter(session => {
      const startsAt = session.eventDates?.startsAt;
      return startsAt && startsAt === dateYYYYMMDD;
    });

    // Crear contenedor para las sesiones
    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = 'schedule-sessions-container';

    if (sessionsForDate.length === 0) {
      // No hay sesiones para esta fecha
      const empty = document.createElement('div');
      empty.className = 'schedule-session-empty';
      empty.textContent = '-';
      sessionsContainer.appendChild(empty);
    } else {
      // Renderizar cada sesión dentro del grupo
      sessionsForDate.forEach(session => {
        const sessionElement = this.#createSessionCard(session);
        sessionsContainer.appendChild(sessionElement);
      });
    }

    group.appendChild(sessionsContainer);
    return group;
  }

  /**
   * Crea una tarjeta de sesión.
   * @private
   * @param {Object} session - Sesión a renderizar
   * @returns {HTMLElement} Elemento de sesión
   */
  #createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'schedule-session-card';

    // Horario
    const timeRange = document.createElement('div');
    timeRange.className = 'schedule-session-time';
    timeRange.textContent = ScheduleService.formatTimeRange(
      session.eventDates.startHour,
      session.eventDates.endHour
    );
    card.appendChild(timeRange);

    // Idiomas (si existen)
    if (session.celebrationLanguages && Array.isArray(session.celebrationLanguages) && session.celebrationLanguages.length > 0) {
      const languagesDiv = this.#renderLanguages(session.celebrationLanguages);
      card.appendChild(languagesDiv);
    }

    // Días de la sesión (si existen)
    if (session.days) {
      const daysDiv = this.#renderDays(session.days);
      card.appendChild(daysDiv);
    }

    // Plazas disponibles con indicador visual
    const spotsDiv = document.createElement('div');
    spotsDiv.className = 'schedule-session-spots';
    
    const spotsContainer = document.createElement('div');
    const availabilityClass = session.hasAvailableSpots ? 'schedule-available' : 'schedule-full';
    spotsContainer.className = `schedule-availability-indicator ${availabilityClass}`;
    
    const spotsText = document.createElement('span');
    spotsText.className = 'spots-text';
    spotsText.textContent = session.hasAvailableSpots ? '🟢 Plazas disponibles' : '🔴 Completa';
    spotsContainer.appendChild(spotsText);
    
    spotsDiv.appendChild(spotsContainer);

    card.appendChild(spotsDiv);

    // Botón de ver detalles
    const button = document.createElement('button');
    const isAvailable = ScheduleService.hasAvailableSpots(session);
    
    button.className = `schedule-btn schedule-btn-details ${isAvailable ? 'schedule-btn-available' : 'schedule-btn-disabled'}`;
    button.disabled = !isAvailable;
    button.textContent = isAvailable ? 'Ver detalle' : 'Completa';

    if (isAvailable) {
      button.addEventListener('click', () => {
        this.#handleSessionClick(session);
      });
    }

    card.appendChild(button);

    return card;
  }

  /**
   * Formatea un rango de fechas (startsAt - endsAt).
   * @private
   * @param {string} startsAt - Fecha en formato YYYYMMDD
   * @param {string} endsAt - Fecha en formato YYYYMMDD
   * @returns {string} Rango formateado (ej: "1 de febrero - 15 de febrero")
   */
  #formatDateRange(startsAt, endsAt) {
    const startDate = `${startsAt.slice(0, 4)}-${startsAt.slice(4, 6)}-${startsAt.slice(6, 8)}`;
    const endDate = `${endsAt.slice(0, 4)}-${endsAt.slice(4, 6)}-${endsAt.slice(6, 8)}`;
    
    const formattedStart = ScheduleService.formatDate(startDate);
    const formattedEnd = ScheduleService.formatDate(endDate);
    
    return `${formattedStart} - ${formattedEnd}`;
  }

  /**
   * Renderiza los idiomas como tags/chips.
   * @private
   * @param {Array} languages - Array de idiomas
   * @returns {HTMLElement} Elemento con los idiomas
   */
  #renderLanguages(languages) {
    const container = document.createElement('div');
    container.className = 'schedule-session-languages';
    
    languages.forEach(lang => {
      const tag = document.createElement('span');
      tag.className = 'schedule-language-tag';
      tag.textContent = this.#escapeHtml(lang);
      container.appendChild(tag);
    });
    
    return container;
  }

  /**
   * Renderiza los días de la sesión.
   * @private
   * @param {string|Array} days - Días de la sesión
   * @returns {HTMLElement} Elemento con los días
   */
  #renderDays(days) {
    const container = document.createElement('div');
    container.className = 'schedule-session-days';
    
    if (typeof days === 'string') {
      container.textContent = `📅 ${this.#escapeHtml(days)}`;
    } else if (Array.isArray(days)) {
      container.textContent = `📅 ${days.map(d => this.#escapeHtml(d)).join(', ')}`;
    }
    
    return container;
  }

  /**
   * Maneja el clic en el botón de ver detalles.
   * @private
   * @param {Object} session - Sesión seleccionada
   */
  #handleSessionClick(session) {
    if (this.onSessionClick) {
      this.onSessionClick(session);
    }
  }

  /**
   * Escapa caracteres HTML.
   * @private
   * @param {string} text - Texto a escapar
   * @returns {string} Texto escapado
   */
  #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
