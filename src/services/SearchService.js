/**
 * SearchService.js
 * Orquestador de búsqueda y filtrado.
 * Implementa la lógica de transformación de datos (lista plana -> agrupada).
 * Patrón: Service Layer + Repository Pattern
 */

import { store } from '../store.js';

export class SearchService {
  /**
   * Ejecuta una búsqueda con los filtros proporcionados.
   * REGLA DE NEGOCIO CRÍTICA: SIEMPRE agrupa por centro.
   * Soporta infinite scroll con offset y limit.
   *
   * @param {Object} filters - Objeto con los filtros aplicados
   * @param {string} filters.searchText - Texto libre de búsqueda
   * @param {string} filters.activity - ID de actividad (vacío si no seleccionado)
   * @param {string} filters.center - ID de centro (vacío si no seleccionado)
   * @param {number} filters.maxAge - Edad máxima (opcional)
   * @param {boolean} filters.hasAvailableSpots - Solo mostrar actividades con plazas libres
   * @param {number} offset - Items a saltar para infinite scroll (default: 0)
   * @param {number} limit - Máximo items a devolver (default: 100)
   *
   * @returns {Promise<Object>} { data, viewMode, totalItems, hasMore, offset, limit }
   */
  static async search(filters = {}, offset = 0, limit = 10) {
    try {
      console.log('[SearchService] Iniciando búsqueda', {
        filters: JSON.stringify(filters),
        offset,
        limit
      });

      // Obtener actividades del store
      const rawActivities = store.getActivities();

      console.log('[SearchService] Actividades cargadas desde store', {
        totalActivities: rawActivities.length,
        activitiesWithSessions: rawActivities.filter(a => a.sessions && a.sessions.length > 0).length
      });

      // PASO 1: Expandir actividades en sesiones (array plano)
      let flatActivities = this.#flattenActivitiesWithSessions(rawActivities);

      console.log('[SearchService] Actividades expandidas', {
        totalFlatActivities: flatActivities.length
      });

      // PASO 2: Aplicar filtros a las sesiones
      let filteredSessions = this.#applyFilters(flatActivities, filters);

      console.log('[SearchService] Sesiones después de filtrado', {
        totalFilteredSessions: filteredSessions.length
      });

      // PASO 3: Agrupar sesiones por actividad para contar actividades únicas
      const activitySessionsMap = new Map();
      filteredSessions.forEach(session => {
        if (!activitySessionsMap.has(session.id)) {
          activitySessionsMap.set(session.id, []);
        }
        activitySessionsMap.get(session.id).push(session);
      });

      // Total de actividades únicas
      const totalItems = activitySessionsMap.size;
      
      console.log('[SearchService] Sesiones filtradas:', filteredSessions.length, 'Actividades únicas:', totalItems);

      // PASO 4: Obtener IDs de actividades ordenadas por centro y paginadas
      // CRÍTICO: Ordenar por centro ANTES de paginar para que actividades del mismo
      // centro aparezcan juntas y no queden divididas entre páginas
      const allActivityEntries = Array.from(activitySessionsMap.entries());
      
      // Ordenar por centerName (nombre del centro) para agrupar visualmente
      allActivityEntries.sort((a, b) => {
        const centerNameA = a[1][0]?.centerName || '';
        const centerNameB = b[1][0]?.centerName || '';
        return centerNameA.localeCompare(centerNameB);
      });
      
      // Extraer IDs ordenados
      const allActivityIds = allActivityEntries.map(entry => entry[0]);
      const paginatedIds = allActivityIds.slice(offset, offset + limit);
      
      console.log('[SearchService] Actividades ordenadas por centro:', allActivityIds.map(id => ({
        id,
        center: activitySessionsMap.get(id)[0]?.centerName
      })));
      
      console.log('[SearchService] Paginando actividades:', paginatedIds.length, 'de', allActivityIds.length);

      // PASO 5: Reconstruir array plano solo con sesiones de actividades paginadas
      let paginatedFlat = [];
      paginatedIds.forEach(id => {
        paginatedFlat = paginatedFlat.concat(activitySessionsMap.get(id));
      });

      console.log('[SearchService] Actividades paginadas', {
        totalPaginatedFlat: paginatedFlat.length
      });

      // REGLA DE NEGOCIO CRÍTICA: SIEMPRE agrupa por centro
      if (paginatedFlat.length > 0) {
        const groupedData = this.#groupByCenter(paginatedFlat);
        
        console.log('[SearchService] Datos agrupados', {
          totalCenters: groupedData.length,
          centerNames: groupedData.map(g => g.center.name)
        });

        return {
          data: groupedData,
          viewMode: 'grouped',
          totalItems,
          hasMore: offset + limit < totalItems,
          offset,
          limit
        };
      } else {
        return {
          data: paginatedFlat,
          viewMode: 'list',
          totalItems,
          hasMore: offset + limit < totalItems,
          offset,
          limit
        };
      }
    } catch (error) {
      console.error('Error en SearchService.search:', error);
      throw error;
    }
  }

  /**
   * Verifica si hay filtros que aplican a nivel de sesión.
   * @private
   */
  static #hasSessionFilters(filters) {
    return filters.dayOfWeek?.length > 0 ||
           filters.timeSlot?.length > 0 ||
           filters.hasAvailableSpots === true;
  }

  /**
   * Filtra actividades considerando si tienen sesiones que cumplen los filtros.
   * Devuelve las actividades completas (sin expandir) que tienen al menos una sesión válida.
   * @private
   */
  static #filterActivitiesBySessions(activities, filters) {
    console.log('[SearchService] Filtering activities by sessions', {
      totalActivities: activities.length,
      centerFilter: filters.center,
      activityFilter: filters.activity,
      filters: JSON.stringify(filters)
    });

    // Filtrar primero actividades de BIZAN
    const bizanActivities = activities.filter(activity =>
      activity.center.includes('bizan') || activity.centerName.toLowerCase().includes('bizan')
    );

    console.log('[SearchService] ALL BIZAN Activities FULL DETAILS', bizanActivities.map(activity => ({
      id: activity.id,
      title: activity.title,
      center: activity.center,
      centerName: activity.centerName,
      sessions: activity.sessions.map(session => ({
        id: session.id,
        date: session.date,
        dayOfWeek: session.dayOfWeek,
        timeSlot: session.timeSlot,
        availableSpots: session.availableSpots,
        audience: session.audience,
        age: session.age,
        language: session.language
      }))
    })));

    const filteredActivities = activities.filter(activity => {
      // Si no tiene sesiones, no incluir
      if (!activity.sessions || activity.sessions.length === 0) {
        console.log(`[SearchService] Skipping activity ${activity.title} - No sessions`);
        return false;
      }

      // Filtro de centro: Verificar SI AL MENOS UNA SESIÓN está en el centro filtrado
      if (filters.center?.length > 0) {
        const centerMatch = filters.center.some(center => {
          const normalizedCenter = center.toLowerCase().replace(/\s+/g, '');
          const normalizedActivityCenter = activity.center.toLowerCase().replace(/\s+/g, '');
          const normalizedActivityCenterName = activity.centerName.toLowerCase().replace(/\s+/g, '');
          
          const matchByCenter = normalizedCenter === normalizedActivityCenter;
          const matchByCenterName = normalizedCenter === normalizedActivityCenterName;
          
          console.log(`[SearchService] Center match check for ${activity.title}`, {
            center: activity.center,
            centerName: activity.centerName,
            filterCenter: center,
            normalizedCenter,
            normalizedActivityCenter,
            normalizedActivityCenterName,
            matchByCenter,
            matchByCenterName
          });

          return matchByCenter || matchByCenterName;
        });

        if (!centerMatch) {
          console.log(`[SearchService] Skipping activity ${activity.title} - Center mismatch`, {
            activityCenter: activity.center,
            activityCenterName: activity.centerName,
            filterCenters: filters.center
          });
          return false;
        }
      }

      // Verificar filtros a nivel de actividad
      if (filters.activity?.length > 0 && !filters.activity.includes(activity.title)) {
        console.log(`[SearchService] Skipping activity ${activity.title} - Activity name mismatch`);
        return false;
      }

      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        if (!activity.title.toLowerCase().includes(searchLower) &&
            !activity.description.toLowerCase().includes(searchLower)) {
          console.log(`[SearchService] Skipping activity ${activity.title} - Search text mismatch`);
          return false;
        }
      }

      // Verificar si al menos una sesión cumple los filtros de sesión
      const matchingSessions = activity.sessions.filter(session => {
        const sessionFilters = [];

        // Filtro: Día de la semana
        if (filters.dayOfWeek?.length > 0 && !filters.dayOfWeek.includes(session.dayOfWeek)) {
          sessionFilters.push(`Day of week mismatch: ${session.dayOfWeek}`);
          return false;
        }
        
        // Filtro: Horario
        if (filters.timeSlot?.length > 0 && !filters.timeSlot.includes(session.timeSlot)) {
          sessionFilters.push(`Time slot mismatch: ${session.timeSlot}`);
          return false;
        }
        
        // Filtro: Idioma
        if (filters.language?.length > 0 && !filters.language.includes(session.language)) {
          sessionFilters.push(`Language mismatch: ${session.language}`);
          return false;
        }
        
        // Filtro: Plazas libres
        if (filters.hasAvailableSpots && session.availableSpots <= 0) {
          console.log(`[SearchService] Filtering out session due to no available spots`, {
            activityTitle: activity.title,
            sessionId: session.id,
            availableSpots: session.availableSpots,
            filterConfig: filters.hasAvailableSpots
          });
          sessionFilters.push(`No available spots: ${session.availableSpots}`);
          return false;
        }
        
        // Filtro: Edad
        if (filters.maxAge !== undefined && session.age.min > filters.maxAge) {
          sessionFilters.push(`Age mismatch: ${session.age.min}`);
          return false;
        }
        
        return true;
      });

      const isValid = matchingSessions.length > 0;
      
      console.log(`[SearchService] Activity ${activity.title} - Matching sessions: ${matchingSessions.length}, Valid: ${isValid}`, {
        sessions: activity.sessions.map(s => ({
          id: s.id,
          date: s.date,
          availableSpots: s.availableSpots,
          dayOfWeek: s.dayOfWeek,
          timeSlot: s.timeSlot,
          audience: s.audience,
          language: s.language
        }))
      });
      
      return isValid;
    });

    console.log('[SearchService] Filtered activities result', {
      filteredActivitiesCount: filteredActivities.length,
      filteredActivities: filteredActivities.map(a => a.title)
    });

    return filteredActivities;
  }

   /**
    * Expande las actividades para crear un array plano de items (actividad + sesión).
    * @private
    * @param {Array} activities - Array de actividades con sesiones anidadas
    * @returns {Array} Array plano donde cada item es una actividad con datos de sesión
    */
   static #flattenActivitiesWithSessions(activities) {
     const flatArray = [];
     
     activities.forEach(activity => {
       if (activity.sessions && Array.isArray(activity.sessions)) {
         activity.sessions.forEach(session => {
           // Combinar datos de actividad + sesión
           flatArray.push({
             id: activity.id,
             sessionId: session.id,
             title: activity.title,
             center: activity.center,
             centerName: activity.centerName,
             centerType: activity.centerType,
             description: activity.description,
             image: activity.image,
             date: session.date,
             startTime: session.startTime,
             endTime: session.endTime,
             dayOfWeek: session.dayOfWeek,
             timeSlot: session.timeSlot,
             schedule: session.schedule,
             format: session.format,
             audience: session.audience,
             language: session.language,
             age: session.age,
             availableSpots: session.availableSpots,
             totalSpots: session.totalSpots
           });
         });
       }
     });
     
     return flatArray;
   }

   /**
    * Aplica los filtros al array de actividades.
    * Soporta filtros antiguos (minAge, activity-string) y nuevos (array-based).
    * @private
    * @param {Array} activities - Array de actividades
    * @param {Object} filters - Objeto de filtros
    * @returns {Array} Array filtrado
    */
   static #applyFilters(activities, filters) {
     return activities.filter(activity => {
       // ===== SECCIÓN A: BÚSQUEDA LIBRE =====

       // Filtro: Texto libre (busca en title y description)
       if (filters.searchText) {
         const searchLower = filters.searchText.toLowerCase();
         const matchesText = 
           activity.title.toLowerCase().includes(searchLower) ||
           activity.description.toLowerCase().includes(searchLower);
         if (!matchesText) return false;
       }

       // Filtro: Plazas libres
       if (filters.hasAvailableSpots === true) {
         if (activity.availableSpots <= 0) return false;
       }

       // Filtro: Edad máxima
       if (filters.maxAge !== undefined) {
         if (activity.age.min > filters.maxAge) {
           return false;
         }
       }

       // ===== SECCIÓN B: FILTROS MÚLTIPLES =====

       // Filtro: Actividad por nombre (OR lógico)
       if (filters.activity && Array.isArray(filters.activity) && filters.activity.length > 0) {
         if (!filters.activity.includes(activity.title)) return false;
       }

       // Filtro: Centro (OR lógico)
       if (filters.center && Array.isArray(filters.center) && filters.center.length > 0) {
         if (!filters.center.includes(activity.center)) return false;
       }

       // Filtro: Día de la semana (OR lógico)
       // Nota: activity.dayOfWeek es un valor simple (string), no un array
       if (filters.dayOfWeek && Array.isArray(filters.dayOfWeek) && filters.dayOfWeek.length > 0) {
         if (!filters.dayOfWeek.includes(activity.dayOfWeek)) return false;
       }

       // Filtro: Horario (OR lógico)
       // Nota: activity.timeSlot es un valor simple (string), no un array
       if (filters.timeSlot && Array.isArray(filters.timeSlot) && filters.timeSlot.length > 0) {
         if (!filters.timeSlot.includes(activity.timeSlot)) return false;
       }

       // Filtro: Idioma (OR lógico)
       if (filters.language && Array.isArray(filters.language) && filters.language.length > 0) {
         if (!filters.language.includes(activity.language)) return false;
       }

       return true;
     });
   }

  /**
   * Agrupa las actividades por centro cívico.
   * Para cada centro, agrupa las sesiones POR ACTIVIDAD.
   * Cada actividad aparece una sola vez con todas sus sesiones internas.
   *
   * NOTA: Esta función maneja tanto datos en formato plano (post-paginación)
   * como datos con sesiones anidadas. Los datos planos vienen de #flattenActivitiesWithSessions
   * y tienen una estructura donde cada item es una sesión individual.
   *
   * @private
   * @param {Array} activities - Array de actividades (puede estar expandido por sesiones - formato plano)
   * @returns {Array} Array de objetos { center: {...}, activities: [...] }
   */
  static #groupByCenter(activities) {
    console.log('[SearchService] Iniciando agrupación por centro', {
      totalActivities: activities.length,
      sampleActivity: activities.length > 0 ? {
        id: activities[0].id,
        title: activities[0].title,
        center: activities[0].center,
        hasSessionsArray: Array.isArray(activities[0].sessions),
        hasSessionId: !!activities[0].sessionId
      } : null
    });

    // Detectar si los datos vienen en formato plano (con sessionId) o anidado (con sessions array)
    const isFlatFormat = activities.length > 0 && activities[0].sessionId !== undefined;
    
    console.log('[SearchService] Formato de datos detectado:', isFlatFormat ? 'PLANO (post-paginación)' : 'ANIDADO');

    // Crear un Map para agrupar por centro
    const centerMap = new Map();

    if (isFlatFormat) {
      // ===== FORMATO PLANO: Cada item es una sesión individual =====
      // Primero agrupar por actividad para reconstruir las sesiones
      const activityMap = new Map();

      activities.forEach(sessionItem => {
        // Verificar si la sesión tiene plazas disponibles
        if (sessionItem.availableSpots <= 0) {
          return;
        }

        const activityKey = `${sessionItem.center}-${sessionItem.id}`;

        if (!activityMap.has(activityKey)) {
          activityMap.set(activityKey, {
            id: sessionItem.id,
            title: sessionItem.title,
            center: sessionItem.center,
            centerName: sessionItem.centerName,
            centerType: sessionItem.centerType,
            description: sessionItem.description,
            image: sessionItem.image,
            sessions: []
          });
        }

        // Agregar la sesión al array de sesiones de la actividad
        const activity = activityMap.get(activityKey);
        activity.sessions.push({
          id: sessionItem.sessionId,
          date: sessionItem.date,
          startTime: sessionItem.startTime,
          endTime: sessionItem.endTime,
          dayOfWeek: sessionItem.dayOfWeek,
          timeSlot: sessionItem.timeSlot,
          schedule: sessionItem.schedule,
          format: sessionItem.format,
          audience: sessionItem.audience,
          language: sessionItem.language,
          age: sessionItem.age,
          availableSpots: sessionItem.availableSpots,
          totalSpots: sessionItem.totalSpots
        });
      });

      // Ahora agrupar por centro
      activityMap.forEach(activity => {
        const centerId = activity.center;
        const centerName = activity.centerName;

        if (!centerMap.has(centerId)) {
          centerMap.set(centerId, {
            center: {
              id: centerId,
              name: centerName
            },
            activities: []
          });
        }

        const centerGroup = centerMap.get(centerId);
        
        // Usar la primera sesión para los datos de visualización
        const firstSession = activity.sessions[0];
        
        centerGroup.activities.push({
          id: activity.id,
          title: activity.title,
          center: activity.center,
          centerName: activity.centerName,
          centerType: activity.centerType,
          description: activity.description,
          image: activity.image,
          // Datos de la primera sesión (para mostrar en vista agrupada)
          date: firstSession.date,
          startTime: firstSession.startTime,
          endTime: firstSession.endTime,
          dayOfWeek: firstSession.dayOfWeek,
          timeSlot: firstSession.timeSlot,
          schedule: firstSession.schedule,
          format: firstSession.format,
          audience: firstSession.audience,
          language: firstSession.language,
          age: firstSession.age,
          availableSpots: firstSession.availableSpots,
          totalSpots: firstSession.totalSpots,
          // Array de todas las sesiones
          sessions: activity.sessions
        });
      });
    } else {
      // ===== FORMATO ANIDADO: Cada actividad ya tiene un array sessions =====
      activities.forEach(activity => {
        // Verificar si la actividad tiene sesiones
        if (!activity.sessions || activity.sessions.length === 0) {
          console.log(`[SearchService] Skipping activity without sessions: ${activity.title}`);
          return;
        }

        // Verificar si la actividad tiene sesiones válidas
        const validSessions = activity.sessions.filter(session => session.availableSpots > 0);
        
        if (validSessions.length === 0) {
          console.log(`[SearchService] Skipping activity without valid sessions: ${activity.title}`);
          return;
        }

        const centerId = activity.center;
        const centerName = activity.centerName;
        const activityId = activity.id;

        // Asegurar que el centro existe
        if (!centerMap.has(centerId)) {
          centerMap.set(centerId, {
            center: {
              id: centerId,
              name: centerName
            },
            activities: new Map() // Mapa interno por actividad
          });
        }

        const centerGroup = centerMap.get(centerId);
        const activityKey = `activity-${activityId}`;

        // Agrupar sesiones dentro de cada actividad
        if (!centerGroup.activities.has(activityKey)) {
          // Primera sesión de esta actividad para este centro
          centerGroup.activities.set(activityKey, {
            id: activity.id,
            title: activity.title,
            center: activity.center,
            centerName: activity.centerName,
            centerType: activity.centerType,
            description: activity.description,
            image: activity.image,
            // Datos de la primera sesión (para mostrar en vista agrupada)
            date: activity.date,
            startTime: activity.startTime,
            endTime: activity.endTime,
            dayOfWeek: activity.dayOfWeek,
            timeSlot: activity.timeSlot,
            schedule: activity.schedule,
            format: activity.format,
            audience: activity.audience,
            language: activity.language,
            age: activity.age,
            availableSpots: activity.availableSpots,
            totalSpots: activity.totalSpots,
            // Array de sesiones (para "Ver horarios")
            sessions: validSessions.map(session => ({
              id: session.id,
              date: session.date,
              startTime: session.startTime,
              endTime: session.endTime,
              dayOfWeek: session.dayOfWeek,
              timeSlot: session.timeSlot,
              schedule: session.schedule,
              format: session.format,
              audience: session.audience,
              language: session.language,
              age: session.age,
              availableSpots: session.availableSpots,
              totalSpots: session.totalSpots
            }))
          });
        } else {
          // Agregar sesión adicional al array
          const existingActivity = centerGroup.activities.get(activityKey);
          existingActivity.sessions.push(...validSessions.map(session => ({
            id: session.id,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            dayOfWeek: session.dayOfWeek,
            timeSlot: session.timeSlot,
            schedule: session.schedule,
            format: session.format,
            audience: session.audience,
            language: session.language,
            age: session.age,
            availableSpots: session.availableSpots,
            totalSpots: session.totalSpots
          })));
        }
      });
    }

    // Convertir Map interna de actividades a Array y construir resultado
    const result = Array.from(centerMap.values()).map(centerGroup => ({
      center: centerGroup.center,
      activities: Array.from(centerGroup.activities.values())
    }));

    // Ordenar por nombre de centro
    const sortedResult = result.sort((a, b) =>
      a.center.name.localeCompare(b.center.name)
    );

    console.log('[SearchService] Resultado de agrupación por centro', {
      totalCenters: sortedResult.length,
      centerDetails: sortedResult.map(r => ({
        centerName: r.center.name,
        activitiesCount: r.activities.length,
        activitiesTitles: r.activities.map(a => a.title)
      }))
    });

    return sortedResult;
  }

  /**
   * Obtiene una actividad específica por ID.
   * @param {number} activityId - ID de la actividad
   * @returns {Promise<Object|null>} La actividad o null
   */
  static async getActivityById(activityId) {
    try {
      return await MockGateway.fetchActivityById(activityId);
    } catch (error) {
      console.error('Error en SearchService.getActivityById:', error);
      throw error;
    }
  }
}
