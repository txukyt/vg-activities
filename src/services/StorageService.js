/**
 * StorageService.js
 * Servicio especializado en gestionar almacenamiento en localStorage.
 * 
 * RESPONSABILIDADES:
 * - Guardar y restaurar centros y actividades del __PRELOADED_STATE__
 * - Validar estructura de datos antes de guardar/restaurar
 * - Proporcionar métodos sincronizados sin necesidad de promesas
 */

export class StorageService {
  // Claves de almacenamiento
  static #STORAGE_KEYS = {
    centers: 'app_preloaded_centers',
    activities: 'app_preloaded_activities',
    timestamp: 'app_preloaded_timestamp'
  };

  /**
   * Guarda los centros y actividades en localStorage.
   * Estos datos se restaurarán cuando se limpien los filtros.
   * @param {Array} centers - Array de centros desde __PRELOADED_STATE__
   * @param {Array} activities - Array de actividades desde __PRELOADED_STATE__
   * @returns {boolean} true si se guardó correctamente, false en caso de error
   */
  static saveInitialData(centers, activities) {
    try {
      // Validar que los datos tengan estructura esperada
      if (!this.#isValidData(centers, activities)) {
        console.warn('StorageService: Datos inválidos para guardar', { centers, activities });
        return false;
      }

      // Guardar en localStorage
      localStorage.setItem(this.#STORAGE_KEYS.centers, JSON.stringify(centers));
      localStorage.setItem(this.#STORAGE_KEYS.activities, JSON.stringify(activities));
      localStorage.setItem(this.#STORAGE_KEYS.timestamp, new Date().toISOString());

      console.log('StorageService: Datos iniciales guardados correctamente', {
        centersCount: centers.length,
        activitiesCount: activities.length
      });

      return true;
    } catch (error) {
      console.error('StorageService: Error guardando datos iniciales', error);
      return false;
    }
  }

  /**
   * Restaura los centros y actividades desde localStorage.
   * Se usa cuando el usuario limpia todos los filtros.
   * @returns {Object|null} { centers: Array, activities: Array } o null si no hay datos guardados
   */
  static restoreInitialData() {
    try {
      const centersJson = localStorage.getItem(this.#STORAGE_KEYS.centers);
      const activitiesJson = localStorage.getItem(this.#STORAGE_KEYS.activities);

      // Si no hay datos guardados, retornar null
      if (!centersJson || !activitiesJson) {
        console.log('StorageService: No hay datos iniciales guardados');
        return null;
      }

      // Parsear desde JSON
      const centers = JSON.parse(centersJson);
      const activities = JSON.parse(activitiesJson);

      // Validar que los datos parseados sean válidos
      if (!this.#isValidData(centers, activities)) {
        console.warn('StorageService: Datos restaurados no válidos');
        return null;
      }

      console.log('StorageService: Datos iniciales restaurados correctamente', {
        centersCount: centers.length,
        activitiesCount: activities.length
      });

      return { centers, activities };
    } catch (error) {
      console.error('StorageService: Error restaurando datos iniciales', error);
      return null;
    }
  }

  /**
   * Limpia los datos guardados en localStorage.
   * Útil para descartar datos antiguos o para testing.
   * @returns {boolean} true si se limpió correctamente
   */
  static clearInitialData() {
    try {
      localStorage.removeItem(this.#STORAGE_KEYS.centers);
      localStorage.removeItem(this.#STORAGE_KEYS.activities);
      localStorage.removeItem(this.#STORAGE_KEYS.timestamp);
      console.log('StorageService: Datos iniciales limpios');
      return true;
    } catch (error) {
      console.error('StorageService: Error limpiando datos iniciales', error);
      return false;
    }
  }

  /**
   * Obtiene la información de cuándo se guardaron los datos.
   * @returns {string|null} Timestamp ISO de cuándo se guardaron, o null
   */
  static getDataTimestamp() {
    try {
      return localStorage.getItem(this.#STORAGE_KEYS.timestamp);
    } catch (error) {
      console.error('StorageService: Error obteniendo timestamp', error);
      return null;
    }
  }

  /**
   * Verifica si los datos tienen la estructura esperada.
   * @private
   * @param {Array} centers - Array de centros
   * @param {Array} activities - Array de actividades
   * @returns {boolean} true si ambos son arrays no vacíos
   */
  static #isValidData(centers, activities) {
    return (
      Array.isArray(centers) &&
      Array.isArray(activities) &&
      centers.length > 0 &&
      activities.length > 0
    );
  }
}
