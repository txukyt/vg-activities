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
   * Obtiene las fechas únicas de un array de sesiones, ordenadas por startsAt y endsAt.
   * Convierte startsAt (YYYYMMDD) a formato YYYY-MM-DD.
   * @param {Array} sessions - Array de sesiones con eventDates.startsAt y eventDates.endsAt
   * @returns {Array} Array de fechas ordenadas (YYYY-MM-DD) por fecha de inicio y fin
   */
  static getUniqueSortedDates(sessions = []) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return [];
    }

    // Crear un Map para mantener sesión representante de cada fecha única
    // Clave: fecha formateada (YYYY-MM-DD), Valor: sesión
    const dateSessionMap = new Map();
    
    sessions.forEach(session => {
      // Convertir startsAt (YYYYMMDD) a fecha formateada (YYYY-MM-DD)
      const startsAt = session.eventDates?.startsAt;
      if (!startsAt) return;
      
      // Convertir YYYYMMDD a YYYY-MM-DD
      const date = `${startsAt.slice(0, 4)}-${startsAt.slice(4, 6)}-${startsAt.slice(6, 8)}`;
      
      // Si la fecha no existe en el map o la sesión actual tiene startsAt menor,
      // guardar la sesión como representante de esa fecha
      if (!dateSessionMap.has(date) ||
          startsAt < (dateSessionMap.get(date).eventDates?.startsAt || '99999999')) {
        dateSessionMap.set(date, session);
      }
    });

    // Obtener las fechas únicas
    const uniqueDates = Array.from(dateSessionMap.keys());

    // Ordenar las fechas usando la sesión representante
    // Criterio 1: startsAt (formato YYYYMMDD como número)
    // Criterio 2: endsAt (formato YYYYMMDD como número)
    uniqueDates.sort((dateA, dateB) => {
      const sessionA = dateSessionMap.get(dateA);
      const sessionB = dateSessionMap.get(dateB);

      const startsAtA = parseInt(sessionA.eventDates?.startsAt || '0', 10);
      const startsAtB = parseInt(sessionB.eventDates?.startsAt || '0', 10);

      // Comparar por startsAt primero
      if (startsAtA !== startsAtB) {
        return startsAtA - startsAtB;
      }

      // Si startsAt es igual, comparar por endsAt
      const endsAtA = parseInt(sessionA.eventDates?.endsAt || '0', 10);
      const endsAtB = parseInt(sessionB.eventDates?.endsAt || '0', 10);

      return endsAtA - endsAtB;
    });

    return uniqueDates;
  }

   /**
    * Valida si una sesión tiene plazas disponibles.
    * @param {Object} session - Sesión a validar
    * @returns {boolean} true si hay plazas disponibles
    */
   static hasAvailableSpots(session) {
     return session && session.hasAvailableSpots === true;
   }
}
