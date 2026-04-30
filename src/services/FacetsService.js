export class FacetsService {
  /**
   * Parsea las facetas de la respuesta del backend SOLR.
   * @param {Object} solrResponse - Respuesta completa del backend SOLR
   * @returns {Object|null} Facetas normalizadas a formato { activity: [...], center: [...] } o null
   */
  static parseFacetsFromBackend(solrResponse) {
    try {
      if (!solrResponse) {
        console.log('[FacetsService] solrResponse es null/undefined');
        return null;
      }

      let facetsArray = null;

      if (solrResponse.facets && typeof solrResponse.facets === 'object') {
        // Convertir formato 2 a array para procesamiento unificado
        facetsArray = Object.entries(solrResponse.facets).map(([name, items]) => ({
          name,
          items: Array.isArray(items) ? items : [items]
        }));
        console.log('[FacetsService] Convertido formato OBJETO a array. Count:', facetsArray.length);
      }
      // No hay facetas
      else {
        console.log('[FacetsService] No se encontraron facetas en la respuesta');
        return null;
      }

      // Validar que tenemos facetas
      if (!facetsArray || facetsArray.length === 0) {
        console.log('[FacetsService] Facetas vacías recibidas');
        return null;
      }

      // Normalizar array de facetas a objeto { name: [...] }
      const normalizedFacets = this.#normalizeFacetsArray(facetsArray);

      console.log('[FacetsService] Facetas parseadas exitosamente', {
        types: Object.keys(normalizedFacets),
        counts: Object.entries(normalizedFacets).reduce((acc, [type, values]) => {
          acc[type] = values.length;
          return acc;
        }, {})
      });

      return normalizedFacets;
    } catch (error) {
      console.error('[FacetsService] Error parseando facetas', {
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Normaliza array de facetas al formato { name: [...] }.
   * Convierte del formato: [{ name: "activity", items: [...] }, ...]
   * Al formato: { activity: [{value, count}, ...], center: [{value, count}, ...] }
   * @private
   */
  static #normalizeFacetsArray(facetsArray) {
    const normalized = {};

    facetsArray.forEach(facet => {
      if (!facet || !facet.name) {
        console.warn('[FacetsService] Faceta sin name, ignorando');
        return;
      }

      const facetName = facet.name;
      const items = facet.items || [];

      if (!Array.isArray(items)) {
        console.warn('[FacetsService] Items de faceta no es array:', facetName);
        return;
      }

      // Normalizar items de esta faceta
      normalized[facetName] = this.#normalizeFacetItems(items);
    });

    return normalized;
  }

  /**
   * Normaliza un array de items de faceta.
   * Maneja múltiples formatos de items.
   * @private
   */
  static #normalizeFacetItems(items) {
    return items
      .map(item => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        // Extraer value y count de múltiples formatos posibles
        const value = item.value || item.id || item.val || String(item);
        const count = item.count || item.cnt || 0;
        const name = item.name;

        return {
          value: String(value).trim(),
          count: Math.max(0, parseInt(count, 10) || 0),
          name: String(name).trim()
        };
      })
      .filter(item => item !== null && item.count > 0)  // Solo items con count > 0
      .sort((a, b) => b.count - a.count);  // Ordenar por count descendente
  }

  /**
   * Normaliza un array de facetas a estructura consistente (legacy).
   * Maneja múltiples formatos posibles.
   * @private
   * @deprecated Usar #normalizeFacetItems en su lugar
   */
  static #normalizeFacetArray(facetArray) {
    if (!Array.isArray(facetArray)) {
      console.warn('[FacetsService] Faceta no es array, ignorando');
      return [];
    }

    return this.#normalizeFacetItems(facetArray);
  }

  /**
   * Obtiene facetas de un tipo específico.
   * @param {Object} facets - Objeto de facetas
   * @param {string} facetType - Tipo de faceta (ej: 'activity', 'center', etc.)
   * @returns {Array} Array de valores de faceta para ese tipo
   */
  static getFacetsByType(facets, facetType) {
    if (!facets || !facets[facetType]) {
      return [];
    }
    return facets[facetType];
  }

  /**
   * Obtiene solo los valores (strings) de facetas de un tipo.
   * @param {Object} facets - Objeto de facetas
   * @param {string} facetType - Tipo de faceta
   * @returns {Array} Array de valores string
   */
  static getFacetValuesByType(facets, facetType) {
    return this.getFacetsByType(facets, facetType).map(item => item.value);
  }

  /**
   * Obtiene facetas como objetos {name, id} para uso en filtros.
   * @param {Object} facets - Objeto de facetas
   * @param {string} facetType - Tipo de faceta
   * @returns {Array} Array de objetos {id, name, count}
   */
  static getFacetsAsOptions(facets, facetType) {
    return this.getFacetsByType(facets, facetType).map(item => ({
      id: item.value,
      name: item.value,
      count: item.count
    }));
  }

  /**
   * Normaliza un valor de faceta según su tipo.
   * Ej: 'manana' → 'Mañana' para timeSlot
   * 
   * @param {string} facetType - Tipo de faceta (ej: 'timeSlot', 'language', etc.)
   * @param {string} value - Valor a normalizar
   * @returns {string} Valor normalizado
   */
  static normalizeFacetValue(facetType, value) {
    // Mapeos específicos por tipo de faceta
    const maps = {
      timeSlot: {
        'manana': 'Mañana',
        'tarde': 'Tarde',
        'manana_y_tarde': 'Mañana y Tarde'
      },
      language: {
        'es': 'Español',
        'en': 'English',
        'fr': 'Français',
        'de': 'Deutsch'
      },
      dayOfWeek: {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
      }
    };

    if (maps[facetType] && maps[facetType][value]) {
      return maps[facetType][value];
    }

    // Si no encuentra mapeo, retornar el valor original
    return value;
  }

  /**
   * Obtiene las facetas de actividades con información amigable.
   * @param {Object} facets - Objeto de facetas del store
   * @returns {Array} Array de objetos {id, name, count} para actividades
   */
  static getActivityFacets(facets) {
    if (!facets) return [];
    
    return (facets.activity || []).map(item => ({
      id: item.value,
      name: item.value,
      count: item.count
    }));
  }

  /**
   * Obtiene las facetas de centros con información amigable.
   * @param {Object} facets - Objeto de facetas del store
   * @returns {Array} Array de objetos {id, name, count} para centros
   */
  static getCenterFacets(facets) {
    if (!facets) return [];
    
    return (facets.center || []).map(item => ({
      id: item.value,
      name: item.value,
      count: item.count
    }));
  }

  /**
   * Obtiene las facetas de días de la semana.
   * @param {Object} facets - Objeto de facetas del store
   * @returns {Array} Array de días únicos disponibles
   */
  static getDayOfWeekFacets(facets) {
    if (!facets || !facets.dayOfWeek) return [];
    
    return facets.dayOfWeek.map(item => item.value);
  }

  /**
   * Obtiene las facetas de horarios.
   * @param {Object} facets - Objeto de facetas del store
   * @returns {Array} Array de horarios normalizados (ej: 'Mañana', 'Tarde', ...)
   */
  static getTimeSlotFacets(facets) {
    if (!facets || !facets.timeSlot) return [];
    
    return facets.timeSlot.map(item => this.normalizeFacetValue('timeSlot', item.value));
  }

  /**
   * Obtiene las facetas de idiomas.
   * @param {Object} facets - Objeto de facetas del store
   * @returns {Array} Array de idiomas normalizados
   */
  static getLanguageFacets(facets) {
    if (!facets || !facets.language) return [];
    
    return facets.language.map(item => this.normalizeFacetValue('language', item.value));
  }

  /**
   * Filtra facetas por un contador mínimo.
   * Útil para excluir opciones con muy pocos resultados.
   * 
   * @param {Object} facets - Objeto de facetas
   * @param {number} minCount - Mínimo count requerido (default: 1)
   * @returns {Object} Facetas filtradas
   */
  static filterFacetsByMinCount(facets, minCount = 1) {
    if (!facets) return null;

    const filtered = {};
    Object.keys(facets).forEach(facetType => {
      filtered[facetType] = facets[facetType].filter(item => item.count >= minCount);
    });

    return filtered;
  }

   /**
    * Verifica si hay facetas disponibles de un tipo.
    * @param {Object} facets - Objeto de facetas
    * @param {string} facetType - Tipo a verificar
    * @returns {boolean} true si hay facetas de ese tipo
    */
   static hasFacetsOfType(facets, facetType) {
     if (!facets || !facets[facetType]) return false;
     return facets[facetType].length > 0;
   }

   /**
    * Transforma facetas de actividades a formato {id, name} para UI.
    * Usa directamente el nombre que viene en la faceta del backend.
    * @param {Array} activityFacets - Facetas de actividades del store (con name incluido)
    * @returns {Array} Array de objetos {id, name}
    */
   static transformActivityFacetsToOptions(activityFacets) {
     if (!Array.isArray(activityFacets)) return [];
     
     const transformed = activityFacets
       .map(facet => ({
         id: facet.value?.toUpperCase() || facet.id,
         name: facet.name || String(facet.value || facet.id)
       }))
       .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
     
     console.log('[FacetsService] transformActivityFacetsToOptions:', {
       inputCount: activityFacets.length,
       outputCount: transformed.length,
       sample: transformed.slice(0, 3)
     });
     
     return transformed;
   }

   /**
    * Transforma facetas de programas a formato {id, name} para UI.
    * Usa directamente el nombre que viene en la faceta del backend.
    * @param {Array} programFacets - Facetas de programas del store (con name incluido)
    * @returns {Array} Array de objetos {id, name}
    */
   static transformProgramFacetsToOptions(programFacets) {
     if (!Array.isArray(programFacets)) return [];
     
     const transformed = programFacets
       .map(facet => ({
         id: facet.value?.toUpperCase() || facet.id,
         name: facet.name || String(facet.value || facet.id)
       }))
       .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
     
     console.log('[FacetsService] transformProgramFacetsToOptions:', {
       inputCount: programFacets.length,
       outputCount: transformed.length,
       sample: transformed.slice(0, 3)
     });
     
     return transformed;
   }

   /**
    * Transforma facetas de centros a formato {id, name} para UI.
    * Usa directamente el nombre que viene en la faceta del backend.
    * @param {Array} centerFacets - Facetas de centros del store (con name incluido)
    * @returns {Array} Array de objetos {id, name}
    */
   static transformCenterFacetsToOptions(centerFacets) {
     if (!Array.isArray(centerFacets)) return [];
     
     const transformed = centerFacets
       .map(facet => ({
         id: facet.value || facet.id,
         name: facet.name || String(facet.value || facet.id)
       }))
       .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
     
     console.log('[FacetsService] transformCenterFacetsToOptions:', {
       inputCount: centerFacets.length,
       outputCount: transformed.length,
       sample: transformed.slice(0, 3)
     });
     
     return transformed;
   }

   /**
    * Transforma facetas de días a formato {id, name} para UI.
    * Usa normalizeFacetValue() para obtener el nombre completo del día.
    * @param {Array} dayFacets - Facetas de días del store
    * @returns {Array} Array de objetos {id, name}
    */
   static transformDayOfWeekFacetsToOptions(dayFacets) {
     if (!Array.isArray(dayFacets)) return [];
     
     return dayFacets
       .map(facet => ({
         id: facet.value,
         name: facet.name || this.normalizeFacetValue('dayOfWeek', facet.value)
       }))
       .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
   }

   /**
    * Transforma facetas de horarios a formato {id, name} para UI.
    * Usa normalizeFacetValue() para obtener el nombre normalizado del horario.
    * @param {Array} timeSlotFacets - Facetas de horarios del store
    * @returns {Array} Array de objetos {id, name}
    */
   static transformTimeSlotFacetsToOptions(timeSlotFacets) {
     if (!Array.isArray(timeSlotFacets)) return [];
     
     return timeSlotFacets
       .map(facet => ({
         id: facet.value,
         name: facet.name || this.normalizeFacetValue('timeSlot', facet.value)
       }))
       .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
   }

   /**
    * Transforma facetas de idiomas a formato {id, name} para UI.
    * Usa normalizeFacetValue() para obtener el nombre normalizado del idioma.
    * @param {Array} languageFacets - Facetas de idiomas del store
    * @returns {Array} Array de objetos {id, name}
    */
   static transformLanguageFacetsToOptions(languageFacets) {
     if (!Array.isArray(languageFacets)) return [];
     
     return languageFacets
       .map(facet => ({
         id: facet.value,
         name: facet.name || this.normalizeFacetValue('language', facet.value)
       }))
       .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
   }
 }
