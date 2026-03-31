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


