export class FilterService {
   /**
     * Obtiene datos iniciales de la aplicación: centros, actividades y timestamp del servidor.
     * Primero verifica si existe window.__PRELOADED_STATE__ con datos válidos.
     * Si no, intenta consumir el endpoint REST /m01-10s/api/init.do
     * @returns {Promise<Object>} { centers: Array, activities: Array, serverTimestamp: string }
     */
    /* static async getInitData() {
      try {
        // Verificar si existe window.__PRELOADED_STATE__ con estructura válida
        if (typeof window !== 'undefined' && window.__PRELOADED_STATE__) {
          const preloadedState = window.__PRELOADED_STATE__;
          
          // Validar que contiene las propiedades requeridas
          if (
            preloadedState.centers &&
            preloadedState.activities &&
            preloadedState.programs &&
            preloadedState.serverTimestamp
          ) {
            console.log('Usando window.__PRELOADED_STATE__:', preloadedState);
            delete window.__PRELOADED_STATE__;
            return preloadedState;
          }
        }
        
        // Intenta llamar al API real
        const response = await fetch('/m01-10s/api/init.do');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.warn('Error consumiendo /m01-10s/api/init.do', error);
      }
    } */



   /**
    * Reset de filtros a sus valores por defecto.
    * @returns {Object} Objeto de filtros resetados
    */
   static getDefaultFilters() {
     return {
       // Sección A: Búsqueda Libre
       searchText: '',
       hasAvailableSpots: true,
       age: undefined,
       
       // Sección B: Filtros
       activity: [],
       center: [],
       program: [],
       dayOfWeek: [],
       timeSlot: [],
       language: [],
       schedule: [],
       scheduleId: '',
     };
   }


    /**
     * Extrae nombres únicos de actividades.
     * @param {Array} activities - Array de actividades
     * @returns {Array} Array de objetos con id y name de actividades
     */
    static getActivityNames(activities) {
      const seen = new Set();
      const uniqueActivities = [];
      activities.forEach(a => {
        if (!seen.has(a.id) && a.id && (a.title || a.name)) {
          seen.add(a.id);
          uniqueActivities.push({
            id: a.id,
            name: a.title || a.name || ''
          });
        }
      });
      return uniqueActivities.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    /**
     * Extrae nombres únicos de programas.
     * @param {Array} programs - Array de programas
     * @returns {Array} Array de objetos con id y name de programas
     */
    static getProgramNames(programs) {
      const seen = new Set();
      const uniquePrograms = [];
      programs.forEach(p => {
        if (!seen.has(p.id) && p.id && (p.title || p.name)) {
          seen.add(p.id);
          uniquePrograms.push({
            id: p.id,
            name: p.title || p.name || ''
          });
        }
      });
      return uniquePrograms.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }



    /**
     * Obtiene centros como lista plana.
     * @param {Array} activities - Array de actividades
     * @returns {Array} Array de centros únicos
     */
    static getCentersFlat(activities) {
      const centers = new Map();
      activities.forEach(activity => {
        if (!centers.has(activity.center)) {
          centers.set(activity.center, {
            id: activity.center,
            name: activity.centerName,
            type: activity.centerType
          });
        }
      });
       return Array.from(centers.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }



   /**
    * Filtra un array de opciones según texto de búsqueda.
    * @param {Array} options - Array de opciones (objetos o strings)
    * @param {string} searchText - Texto de búsqueda
    * @returns {Array} Opciones filtradas
    */
   static filterOptions(options, searchText) {
     if (!searchText || searchText.trim() === '') {
       return options;
     }
     
     const searchLower = searchText.toLowerCase();
     return options.filter(option => {
       const text = typeof option === 'string' ? option : option.name;
       return text.toLowerCase().includes(searchLower);
     });
   }



   }
