/**
 * debounce.js
 * Utilidad para aplicar debounce a funciones
 */

/**
 * Crea una versión debounceada de una función
 * @param {Function} func - Función a debuncear
 * @param {number} delay - Tiempo de espera en ms (default: 500ms)
 * @returns {Function} Función debounceada
 */
export function debounce(func, delay = 500) {
  let timeoutId;

  return function debounced(...args) {
    // Limpiar timeout anterior si existe
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Crear nuevo timeout
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Crea una versión debounceada de una función con posibilidad de cancelar
 * Retorna un objeto con la función debounceada y un método para cancelar
 * @param {Function} func - Función a debuncear
 * @param {number} delay - Tiempo de espera en ms (default: 500ms)
 * @returns {Object} Objeto con propiedades: fn (función debounceada) y cancel (para cancelar el timeout)
 */
export function debounceWithCancel(func, delay = 500) {
  let timeoutId;

  const debounced = function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}
