/**
 * ScheduleService.js
 * Servicio para agrupar y transformar sesiones por fecha y franja horaria.
 */

export class ScheduleService {
  /**
   * Define los rangos de tiempo para cada franja horaria.
   * @private
   */
  static #TIME_SLOTS = {
    manana: { label: 'Mañana', start: 6, end: 12 },
    tarde: { label: 'Tarde', start: 12, end: 20 },
    noche: { label: 'Noche', start: 20, end: 6 } // Cruza medianoche
  };

  /**
   * Agrupa sesiones por fecha y franja horaria.
   * @param {Array} sessions - Array de sesiones de una actividad
   * @returns {Object} Objeto con estructura: { "2026-02-01": { manana: [...], tarde: [...], noche: [...] } }
   */
  static groupSessionsByDateAndTimeSlot(sessions = []) {
    if (!Array.isArray(sessions)) {
      return {};
    }

    // Crear objeto para agrupar
    const grouped = {};

    // Agrupar sesiones por fecha
    sessions.forEach(session => {
      const date = session.date;
      
      if (!grouped[date]) {
        grouped[date] = {
          manana: [],
          tarde: [],
          noche: []
        };
      }

      // Determinar franja horaria según la hora de inicio
      /*const timeSlot = this.#getTimeSlotFromTime(session.startTime);
      
      grouped[date][timeSlot].push(session);*/
    });

    // Ordenar sesiones dentro de cada franja por hora
    Object.keys(grouped).forEach(date => {
      Object.keys(grouped[date]).forEach(slot => {
        grouped[date][slot].sort((a, b) => {
          return a.startTime.localeCompare(b.startTime);
        });
      });
    });

    return grouped;
  }

  /**
   * Determina la franja horaria según la hora.
   * @private
   * @param {string} time - Hora en formato HH:mm
   * @returns {string} 'manana', 'tarde' o 'noche'
   */
  static #getTimeSlotFromTime(time) {
    const [hours] = time.split(':').map(Number);
    
    if (hours >= 6 && hours < 12) {
      return 'manana';
    } else if (hours >= 12 && hours < 20) {
      return 'tarde';
    } else {
      return 'noche';
    }
  }

  /**
   * Obtiene el label de una franja horaria.
   * @param {string} slot - 'manana', 'tarde' o 'noche'
   * @returns {string} Label legible (ej: 'Mañana')
   */
  static getTimeSlotLabel(slot) {
    return this.#TIME_SLOTS[slot]?.label || 'Horario';
  }

  /**
   * Formatea una fecha para mostrar.
   * @param {string} dateString - Fecha en formato YYYY-MM-DD
   * @returns {string} Fecha formateada (ej: "1 de febrero de 2026")
   */
  static formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Formatea un rango de horas.
   * @param {string} startTime - Hora inicio (HH:mm)
   * @param {string} endTime - Hora fin (HH:mm)
   * @returns {string} Rango formateado (ej: "09:00-10:00")
   */
  static formatTimeRange(startTime, endTime) {
    return `${startTime}-${endTime}`;
  }

  /**
   * Obtiene las fechas únicas de un array de sesiones, ordenadas.
   * @param {Array} sessions - Array de sesiones
   * @returns {Array} Array de fechas ordenadas (YYYY-MM-DD)
   */
  static getUniqueSortedDates(sessions = []) {
    const dates = new Set(sessions.map(s => s.date));
    return Array.from(dates).sort();
  }

  /**
   * Valida si una sesión tiene plazas disponibles.
   * @param {Object} session - Sesión a validar
   * @returns {boolean} true si hay plazas disponibles
   */
  static hasAvailableSpots(session) {
    return session && session.availableSpots > 0;
  }

  /**
   * Calcula el porcentaje de ocupación de una sesión.
   * @param {Object} session - Sesión a analizar
   * @returns {number} Porcentaje de ocupación (0-100)
   */
  static getOccupancyPercentage(session) {
    if (!session || session.totalSpots === 0) {
      return 0;
    }
    const occupied = session.totalSpots - session.availableSpots;
    return Math.round((occupied / session.totalSpots) * 100);
  }
}
