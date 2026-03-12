/**
 * ScheduleGridComponent.js
 * Componente para mostrar un grid de horarios agrupados por fecha y franja horaria.
 */

import { ScheduleService } from '../services/ScheduleService.js';

export class ScheduleGridComponent {
   constructor(sessions = [], onSessionClick = null) {
     this.sessions = sessions;
     this.onSessionClick = onSessionClick;
     this.groupedSessions = ScheduleService.groupSessionsByDateAndTimeSlot(sessions);
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

    // Título de la fecha
    const title = document.createElement('h3');
    title.className = 'schedule-date-title';
    title.textContent = ScheduleService.formatDate(date);
    group.appendChild(title);

    // Row con 3 columnas (mañana, tarde, noche)
    const row = document.createElement('div');
    row.className = 'schedule-row';

    const slots = ['manana', 'tarde', 'noche'];
    slots.forEach(slot => {
      const slotElement = this.#createTimeSlot(date, slot);
      row.appendChild(slotElement);
    });

    group.appendChild(row);
    return group;
  }

  /**
   * Crea una celda de franja horaria.
   * @private
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @param {string} slot - 'manana', 'tarde' o 'noche'
   * @returns {HTMLElement} Elemento de celda
   */
  #createTimeSlot(date, slot) {
    const cell = document.createElement('div');
    cell.className = `schedule-slot schedule-slot-${slot}`;

    const sessions = this.groupedSessions[date][slot];

    if (sessions.length === 0) {
      // Celda vacía
      const empty = document.createElement('div');
      empty.className = 'schedule-session-empty';
      empty.textContent = '-';
      cell.appendChild(empty);
    } else {
      // Renderizar cada sesión en la franja
      sessions.forEach(session => {
        const sessionElement = this.#createSessionCard(session);
        cell.appendChild(sessionElement);
      });
    }

    return cell;
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
      session.startTime,
      session.endTime
    );
    card.appendChild(timeRange);

    // Plazas disponibles
    const spotsDiv = document.createElement('div');
    spotsDiv.className = 'schedule-session-spots';
    
    const spotsText = document.createElement('span');
    spotsText.className = 'spots-text';
    spotsText.textContent = `${session.availableSpots}/${session.totalSpots} plazas`;
    spotsDiv.appendChild(spotsText);

    // Barra de ocupación
    const occupancyBar = document.createElement('div');
    occupancyBar.className = 'occupancy-bar';
    
    const occupancyFill = document.createElement('div');
    occupancyFill.className = 'occupancy-fill';
    const occupancy = ScheduleService.getOccupancyPercentage(session);
    occupancyFill.style.width = `${occupancy}%`;
    occupancyBar.appendChild(occupancyFill);
    
    spotsDiv.appendChild(occupancyBar);
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
