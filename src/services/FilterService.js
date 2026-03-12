/**
 * FilterService.js
 * Gestiona la lógica de los filtros visuales.
 * Incluye manipulación de opciones de filtro y visibilidad condicional.
 */

import { MockGateway } from './MockGateway.js';

export class FilterService {
   /**
     * Obtiene datos iniciales de la aplicación: centros, actividades y timestamp del servidor.
     * Primero verifica si existe window.__PRELOADED_STATE__ con datos válidos.
     * Si no, intenta consumir el endpoint REST /m01-10s/api/init.do
     * Si falla, usa MockGateway como fallback.
     * @returns {Promise<Object>} { centers: Array, activities: Array, serverTimestamp: string }
     */
    static async getInitData() {
      try {
        // Verificar si existe window.__PRELOADED_STATE__ con estructura válida
        if (typeof window !== 'undefined' && window.__PRELOADED_STATE__) {
          const preloadedState = window.__PRELOADED_STATE__;
          
          // Validar que contiene las propiedades requeridas
          if (
            preloadedState.centers &&
            preloadedState.activities &&
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
        console.warn('Error consumiendo /m01-10s/api/init.do, usando MockGateway:', error);
      }
    }

  /**
   * Filtra los centros visualizados según el texto de búsqueda del filtro.
   * 
   * Nota: Si el usuario escribe texto en el buscador del filtro de centros,
   * la agrupación visual (Bizán, Moratalaz, etc.) desaparece y se muestra
   * solo en vista de lista con búsqueda.
   *
   * @param {Array} centers - Array de centros originales
   * @param {string} searchText - Texto de búsqueda para filtrar centros
   * @returns {Array} Centros filtrados
   */
  static filterCentersBySearch(centers, searchText) {
    if (!searchText || searchText.trim() === '') {
      return centers;
    }

    const searchLower = searchText.toLowerCase();
    return centers.filter(center => 
      center.name.toLowerCase().includes(searchLower)
    );
  }

  /**
   * Obtiene opciones de edad basadas en las sesiones disponibles.
   * @param {Array} activities - Array de actividades
   * @returns {Array} Array de rangos de edad únicos disponibles
   */
  static getAvailableAgeRanges(activities) {
    const ageRanges = [];
    
    activities.forEach(activity => {
      if (activity.sessions && Array.isArray(activity.sessions)) {
        activity.sessions.forEach(session => {
          if (session.age && session.age.min !== undefined && session.age.max !== undefined) {
            const minAge = session.age.min;
            const maxAge = session.age.max;
            
            // Crear rangos representativos
            const ranges = [
              { min: minAge, max: Math.min(minAge + 10, maxAge) }
            ];
            
            ranges.forEach(range => {
              if (!ageRanges.some(r => r.min === range.min && r.max === range.max)) {
                ageRanges.push(range);
              }
            });
          }
        });
      }
    });

    return ageRanges.sort((a, b) => a.min - b.min);
  }

  /**
   * Obtiene los tipos de formatos disponibles.
   * @returns {Array} Array de formatos únicos
   */
  static getAvailableFormats() {
    return [
      { id: 'presencial', name: 'Presencial' },
      { id: 'online', name: 'En línea' },
      { id: 'hibrido', name: 'Híbrido' }
    ];
  }

  /**
   * Valida si un filtro es válido según reglas de negocio.
   * @param {Object} currentFilters - Objeto de filtros actuales
   * @returns {Object} Objeto con validaciones { isValid: boolean, errors: [] }
   */
  static validateFilters(currentFilters) {
    const errors = [];

    // Validar rangos de edad
    if (currentFilters.minAge !== undefined &&
        currentFilters.maxAge !== undefined &&
        currentFilters.minAge > currentFilters.maxAge) {
      errors.push('La edad mínima no puede ser mayor que la máxima');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

   /**
    * Reset de filtros a sus valores por defecto.
    * @returns {Object} Objeto de filtros resetados
    */
   static getDefaultFilters() {
     return {
       // Sección A: Búsqueda Libre
       searchText: '',
       hasAvailableSpots: true,
       maxAge: undefined,
       
       // Sección B: Filtros
       activity: [],
       center: [],
       dayOfWeek: [],
       timeSlot: [],
       language: [],
       
       // A/B Testing
       dayOfWeekViewMode: 'grouped'
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
        if (!seen.has(a.id)) {
          seen.add(a.id);
          uniqueActivities.push({
            id: a.id,
            name: a.name
          });
        }
      });
      return uniqueActivities.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Extrae nombres únicos de actividades excluyendo las especificadas.
     * @param {Array} activities - Array de actividades
     * @param {Array} excludeList - Array de IDs a excluir
     * @returns {Array} Array de objetos con id y name de actividades filtrados
     */
    static getActivityNamesExcluding(activities, excludeList = []) {
      const allActivities = this.getActivityNames(activities);
      return allActivities.filter(activity => !excludeList.includes(activity.id));
    }

   /**
    * Obtiene centros agrupados por tipo.
    * @param {Array} activities - Array de actividades
    * @returns {Object} Objeto con centros agrupados por tipo
    */
   static getCentersGrouped(activities) {
     const grouped = {};
     activities.forEach(activity => {
       const type = activity.centerType || 'Otro';
       if (!grouped[type]) {
         grouped[type] = [];
       }
       const center = {
         id: activity.center,
         name: activity.centerName
       };
       if (!grouped[type].find(c => c.id === center.id)) {
         grouped[type].push(center);
       }
     });
     
     // Ordenar cada grupo
     Object.keys(grouped).forEach(type => {
       grouped[type].sort((a, b) => a.name.localeCompare(b.name));
     });
     
     return grouped;
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
      return Array.from(centers.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Obtiene centros como lista plana excluyendo los especificados.
     * @param {Array} activities - Array de actividades
     * @param {Array} excludeList - Array de IDs de centros a excluir
     * @returns {Array} Array de centros únicos filtrados
     */
    static getCentersFlatExcluding(activities, excludeList = []) {
      const allCenters = this.getCentersFlat(activities);
      return allCenters.filter(center => !excludeList.includes(center.id));
    }

   /**
    * Extrae días de la semana únicos desde las sesiones.
    * @param {Array} activities - Array de actividades
    * @returns {Array} Array de días únicos
    */
   static getDaysOfWeek(activities) {
     const days = new Set();
     const dayOrder = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
     
     activities.forEach(activity => {
       if (activity.sessions && Array.isArray(activity.sessions)) {
         activity.sessions.forEach(session => {
           if (session.dayOfWeek) {
             days.add(session.dayOfWeek);
           }
         });
       }
     });
     
     return dayOrder.filter(day => days.has(day));
   }

   /**
    * Obtiene franjas horarias únicas desde las sesiones.
    * @param {Array} activities - Array de actividades
    * @returns {Array} Array de franjas horarias únicas
    */
   static getTimeSlots(activities) {
     const slots = new Set();
     activities.forEach(activity => {
       if (activity.sessions && Array.isArray(activity.sessions)) {
         activity.sessions.forEach(session => {
           if (session.timeSlot) {
             slots.add(session.timeSlot);
           }
         });
       }
     });
     const slotMap = {
       'manana': 'Mañana',
       'tarde': 'Tarde',
       'manana_y_tarde': 'Mañana y Tarde'
     };
     return Array.from(slots).map(slot => slotMap[slot] || slot);
   }

   /**
    * Obtiene idiomas únicos desde las sesiones.
    * @param {Array} activities - Array de actividades
    * @returns {Array} Array de idiomas únicos
    */
   static getLanguages(activities) {
     const languages = new Set();
     activities.forEach(activity => {
       if (activity.sessions && Array.isArray(activity.sessions)) {
         activity.sessions.forEach(session => {
           if (session.language) {
             languages.add(session.language);
           }
         });
       }
     });
     return Array.from(languages).sort();
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

   /**
    * Obtiene agrupaciones de días de la semana para vista agrupada.
    * @returns {Array} Array de grupos de días
    */
   static getDayGroupsGrouped() {
     return [
       { label: 'L-X', days: ['lunes', 'martes', 'miércoles'] },
       { label: 'M-J', days: ['martes', 'miércoles', 'jueves'] },
       { label: 'V-S', days: ['viernes', 'sábado'] },
       { label: 'D', days: ['domingo'] }
     ];
   }

   /**
    * Convierte vista agrupada de días a lista de días seleccionados.
    * @param {Array} groups - Array de labels de grupos (ej: ['L-X', 'M-J'])
    * @returns {Array} Array de días seleccionados
    */
   static expandDayGroups(groups) {
     const groupMap = {
       'L-X': ['lunes', 'martes', 'miércoles'],
       'M-J': ['martes', 'miércoles', 'jueves'],
       'V-S': ['viernes', 'sábado'],
       'D': ['domingo']
     };
     
     const days = new Set();
     groups.forEach(group => {
       if (groupMap[group]) {
         groupMap[group].forEach(day => days.add(day));
       }
     });
     return Array.from(days);
   }
 }
