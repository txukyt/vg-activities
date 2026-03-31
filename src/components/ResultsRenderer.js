/**
 * ResultsRenderer.js
 * Componente responsable de renderizar los resultados de búsqueda.
 * - Sabe iterar sobre estructura agrupada por centro
 * - Sabe iterar sobre estructura de lista plana
 * Genera HTML semántico (headers de centro + listas)
 */

export class ResultsRenderer {
  /**
   * Renderiza los resultados agrupados por centro.
   * @param {Array} results - Resultados agrupados por centro
   * @param {Function} onActivityClick - Callback cuando se hace click en una actividad
   * @returns {HTMLElement} Contenedor con los resultados renderizados
   */
  static render(results, onActivityClick) {
    const container = document.createElement('section');
    container.className = 'results-container';

    ResultsRenderer.#renderGroupedResults(container, results, onActivityClick);

    return container;
  }

  /**
   * Renderiza solo actividades NUEVAS y las agrega en los grupos de centros correctos.
   * Actualiza centros existentes si tienen nuevas actividades, o agrega nuevos centros.
   * @param {HTMLElement} container - Contenedor existente (results-container)
   * @param {Array} allResults - Todos los resultados agrupados por centro (estados actual + anterior combinados)
   * @param {Set<string>} renderedActivityIds - IDs de actividades que ya están renderizadas
   * @param {Function} onActivityClick - Callback cuando se hace click en una actividad
   */
  static renderAdditionalGroups(container, allResults, renderedActivityIds, onActivityClick) {
    if (!Array.isArray(allResults) || allResults.length === 0) {
      return;
    }

    // Procesar cada grupo de centro
    allResults.forEach(group => {
      const { activities } = group;

      // Encontrar si este centro ya existe en el DOM
      let centerSection = container.querySelector(`[data-center-id="${group.id}"]`);
      
      if (centerSection) {
        // Centro existe: agregar solo actividades nuevas
        const activitiesList = centerSection.querySelector('.activities-list');
        
        activities.forEach(activity => {
          // Solo agregar si la actividad no está renderizada
          if (!renderedActivityIds.has(activity.id)) {
            const activityItem = this.#createActivityItem(activity, onActivityClick, group.id);
            activitiesList.appendChild(activityItem);
          }
        });

        // Actualizar el contador de actividades del header
        const centerCount = centerSection.querySelector('.center-count');
        if (centerCount) {
          centerCount.textContent = `${activities.length} actividad${activities.length !== 1 ? 'es' : ''}`;
        }
      } else {
        // Centro nuevo: crear la sección completa
        const centerSection = document.createElement('article');
        centerSection.className = 'center-group';
        centerSection.setAttribute('data-center-id', group.id);

        // Header del centro
        const centerHeader = document.createElement('header');
        centerHeader.className = 'center-header';
        centerHeader.innerHTML = `
          <h2 class="center-name">${this.#escapeHtml(group.name)}</h2>
          <span class="center-count">${activities.length} actividad${activities.length !== 1 ? 'es' : ''}</span>
        `;
        centerSection.appendChild(centerHeader);

        // Lista de actividades del centro
        const activitiesList = document.createElement('ul');
        activitiesList.className = 'activities-list grouped';

        activities.forEach(activity => {
          const activityItem = this.#createActivityItem(activity, onActivityClick, group.id);
          activitiesList.appendChild(activityItem);
        });

        centerSection.appendChild(activitiesList);
        container.appendChild(centerSection);
      }
    });
  }

  /**
    * Renderiza resultados AGRUPADOS por centro.
    * Estructura: Array de { center: {...}, activities: [...] }
    * @private
    */
  static #renderGroupedResults(container, groupedData, onActivityClick) {
    if (!Array.isArray(groupedData) || groupedData.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <p>No se encontraron resultados</p>
        </div>
      `;
      return;
    }

    // Iterar sobre cada grupo de centro
    groupedData.forEach(group => {
    const { activities } = group;

    // Crear sección para el centro
    const centerSection = document.createElement('article');
    centerSection.className = 'center-group';
    centerSection.setAttribute('data-center-id', group.id);

    // Header del centro
    const centerHeader = document.createElement('header');
    centerHeader.className = 'center-header';
    centerHeader.innerHTML = `
      <h2 class="center-name">${this.#escapeHtml(group.name)}</h2>
      <span class="center-count">${activities.length} actividad${activities.length !== 1 ? 'es' : ''}</span>
    `;
    centerSection.appendChild(centerHeader);

    // Lista de actividades del centro
    const activitiesList = document.createElement('ul');
    activitiesList.className = 'activities-list grouped';

    activities.forEach(activity => {
      // Nota: En vista agrupada, cada activity es única
      // Sus sesiones están en activity.sessions (internas, no se muestran)
      const activityItem = this.#createActivityItem(activity, onActivityClick, group.id);
      activitiesList.appendChild(activityItem);
    });

    centerSection.appendChild(activitiesList);
    container.appendChild(centerSection);
  });
  }

  /**
    * Crea un item de actividad (elemento <li>).
    * @private
    */
  static #createActivityItem(activity, onActivityClick, centerId) {
    const li = document.createElement('li');
    li.className = 'activity-item';
    li.setAttribute('data-activity-id', activity.id);
    li.setAttribute('data-center-id', centerId);

    // Contenido de la actividad
    const contentDiv = document.createElement('div');
    contentDiv.className = 'activity-content';

    // Título
    const title = document.createElement('h3');
    title.className = 'activity-title';
    title.textContent = this.#escapeHtml(activity.name);

    // Descripción
    const description = document.createElement('p');
    description.className = 'activity-description';
    if (activity.description) {
      description.textContent = this.#escapeHtml(activity.description.slice(0, 300) + (activity.description.length > 300 ? '...' : ''));
    }

    // Botón de horarios
    const detailsButton = document.createElement('button');
    detailsButton.className = 'btn btn-primary';
    detailsButton.textContent = `Ver ${activity.count} horarios`;
    detailsButton.addEventListener('click', () => {
      if (onActivityClick) {
        onActivityClick(activity.id, centerId);
      }
    });

    contentDiv.appendChild(title);
    contentDiv.appendChild(description);
    contentDiv.appendChild(detailsButton);

    li.appendChild(contentDiv);

    return li;
  }

  /**
   * Escapa caracteres HTML para prevenir XSS.
   * @private
   */
  static #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
