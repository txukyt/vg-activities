/**
 * config.js
 * Configuración centralizada de la aplicación
 * Define variables de entorno y constantes reutilizables
 */

// Determinar el base path según el entorno
// En desarrollo (npm run dev): sin base path
// En production (npm run build): '/m01-10s/spa'
export const BASE_PATH = import.meta.env.BASE_URL || '/';

// Exportar constantes adicionales si las necesitas en el futuro
export const config = {
  basePath: BASE_PATH,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
