# Plan: Agrupación Única de Actividades + Filtros con Paginación Lazy

## 📋 Objetivo General
Solucionar dos problemas principales:
1. **Duplicación de Actividades**: Mostrar cada actividad una sola vez en los resultados (agrupar sesiones sin mostrarlas)
2. **Demasiadas Opciones en Filtros**: Implementar paginación lazy ("Ver más") mostrando máximo 5 opciones inicialmente

---

## 🔍 Problema 1: Actividades Duplicadas

### Estado Actual
- `SearchService#flattenActivitiesWithSessions()` expande cada actividad en N items (uno por sesión)
- `ResultsRenderer` renderiza cada item por separado
- Cuando buscas "BIZAN ARANA" con "Yoga Iniciación" (2 sesiones), aparece 2 veces

### Solución
1. Modificar `SearchService` para:
   - En vista agrupada (sin filtros de activity/center), agrupar POR ACTIVIDAD dentro de cada centro
   - Mostrar solo UNA entrada por actividad (sin mostrar sesiones)
   - Mantener ref a sesiones internas pero no mostrar

2. Modificar `ResultsRenderer` para:
   - Renderizar una actividad por centro solo una vez
   - Mostrar la primera sesión como referencia (horario, plazas)
   - Botón "Ver horarios" sigue llevando al detalle

3. No agregar CSS complejo, solo estilos existentes funcionan

---

## 🔍 Problema 2: Filtros con Paginación Lazy

### Estado Actual
- `FilterItem` renderiza TODAS las opciones en una lista
- Algunos filtros pueden tener 20+ opciones (Centro, Actividad)
- La UI se satura tratando de mostrar todo

### Solución
1. Modificar `FilterItem` para:
   - Recopilar total de opciones
   - Si hay >5 opciones, mostrar solo primeras 5 + botón "Ver más"
   - Al hacer clic "Ver más", expandir lista y mostrar todas
   - El botón cambia a "Ver menos" cuando se expande

2. Modificar `FilterPanel` para:
   - Pasar parámetro `maxInitialOptions: 5` a FilterItem
   - Aplicar a: Actividad, Centro, Público
   - Dejar sin paginación: Día Semana (ya agrupado), Horario (pocas opciones)

3. CSS:
   - Botón "Ver más" / "Ver menos" simple
   - Animación suave de expansion

---

## 🏗️ Cambios por Componente

### 1. `SearchService.js`
**Cambios:**
- Modificar `#groupByCenter()` para que:
  - Agrupe sesiones por actividad DENTRO de cada centro
  - Retorne solo una entrada por actividad
  - Cada actividad incluya array de sesiones (pero no se muestre)

**Nueva lógica:**
```javascript
// Transformar flat array [act1-ses1, act1-ses2, act2-ses1, ...] 
// a estructura agrupada pero sin duplicar actividades
const groupedMap = new Map();
activities.forEach(activity => {
  const centerId = activity.center;
  const activityKey = `${centerId}-${activity.id}`;
  
  if (!groupedMap.has(activityKey)) {
    groupedMap.set(activityKey, {
      center: {...},
      activity: {...}, // Una sola vez
      sessions: [] // Array de sesiones
    });
  }
  groupedMap.get(activityKey).sessions.push({...session});
});
```

---

### 2. `ResultsRenderer.js`
**Cambios:**
- `#renderGroupedResults()`: Ya recibe estructura agrupada ✓
- `#createActivityItem()`:
  - Mostrar solo la información de la actividad (sin sesiones)
  - Si hay múltiples sesiones, mostrar la primera como referencia
  - Botón "Ver horarios" sigue igual

**Estructura HTML:**
```html
<li class="activity-item">
  <div class="activity-image">...</div>
  <div class="activity-content">
    <h3>Yoga Iniciación (BIZAN)</h3>
    <p class="activity-center">BIZAN ARANA</p>
    <p class="activity-description">Sesión de yoga...</p>
    <div class="activity-details">
      <span class="schedule">Horario: lunes 09:00-10:00</span>
      <span class="age-range">Edad: 18-99 años</span>
      <span class="available-spots">Plazas: 8/16</span>
    </div>
    <button class="btn btn-primary">Ver horarios</button>
  </div>
</li>
```

**Sin cambios** en estructura, solo la fuente de datos cambia

---

### 3. `FilterItem.js`
**Cambios:**
- Constructor: Aceptar `maxInitialOptions` (default: Infinity)
- `#renderFlat()`: Limitar a `maxInitialOptions` y añadir botón "Ver más"
- Agregar método `#renderMoreButton()`: Crea botón toggle
- Agregar listener click para expandir/contraer

**Lógica:**
```javascript
#renderFlat() {
  const container = document.createElement('div');
  const filteredOptions = FilterService.filterOptions(this.options, this.searchText);
  
  if (filteredOptions.length > this.maxInitialOptions) {
    // Mostrar primeras N opciones
    const visibleOptions = filteredOptions.slice(0, this.maxInitialOptions);
    visibleOptions.forEach(option => {
      container.appendChild(this.#renderOptionElement(option));
    });
    
    // Agregar botón "Ver más"
    const remaining = filteredOptions.length - this.maxInitialOptions;
    container.appendChild(this.#renderMoreButton(remaining, filteredOptions));
  } else {
    // Mostrar todas
    filteredOptions.forEach(option => {
      container.appendChild(this.#renderOptionElement(option));
    });
  }
  
  return container;
}
```

---

### 4. `FilterPanel.js`
**Cambios:**
- `#createActivityFilter()`: Pasar `maxInitialOptions: 5`
- `#createAudienceFilter()`: Pasar `maxInitialOptions: 5`
- `#createCenterFilter()`: Modificar `#renderFlatCenters()` para pasar `maxInitialOptions: 5`

```javascript
#createActivityFilter() {
  const filterItem = new FilterItem({
    id: 'activity',
    label: 'Actividad',
    options: options,
    selectedValues: state.filters.activity,
    onSelect: () => this.onFilterChange(),
    hasSearchBox: true,
    maxInitialOptions: 5  // ← AGREGADO
  });
  // ...
}
```

---

### 5. `styles.css`
**Nuevos estilos:**
```css
.filter-more-button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  margin-top: 4px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.filter-more-button:hover {
  background: #e8e8e8;
}

.filter-more-button.expanded {
  background: #e3f2fd;
}
```

---

## 📊 Flujo de Datos

### Antes (Actual)
```
Activity {id: 1, title: "Yoga...", sessions: [{...}, {...}]}
  ↓
flattenActivities() → [act1-ses1, act1-ses2] (2 items)
  ↓
Resultados renderiza ambos
  ↓
"Yoga Iniciación" aparece 2 veces
```

### Después (Agrupado)
```
Activity {id: 1, title: "Yoga...", sessions: [{...}, {...}]}
  ↓
groupByCenter() → [{center, activity1, sessions: [ses1, ses2]}] (1 item)
  ↓
Resultados renderiza una sola vez
  ↓
"Yoga Iniciación" aparece 1 vez (con sesiones internas pero no visibles)
```

---

## ✅ Criterios de Éxito

1. **Agrupación:**
   - ✓ Buscar por centro y ver "Yoga Iniciación (BIZAN)" una sola vez
   - ✓ Se muestra la primera sesión como referencia (horario, plazas)
   - ✓ Botón "Ver horarios" sigue funcionando

2. **Filtros:**
   - ✓ Filtros con >5 opciones muestran solo 5 + "Ver más"
   - ✓ Botón "Ver más" expande e vuelve a "Ver menos"
   - ✓ Búsqueda interna sigue filtrando correctamente
   - ✓ Selecciones se mantienen al expandir/contraer

3. **Performance:**
   - ✓ UI no se satura con muchas opciones
   - ✓ No hay lag al expandir/contraer

---

## 📝 Orden de Implementación

1. Modificar `SearchService#groupByCenter()` → Agrupar por activity
2. Modificar `ResultsRenderer` → Mostrar una sola actividad (sin cambios grandes)
3. Agregar CSS para botón "Ver más"
4. Modificar `FilterItem` → Implementar paginación lazy
5. Modificar `FilterPanel` → Pasar parámetros de paginación
6. Pruebas y ajustes visuales

---

## 🔗 Referencias de Código

- [`SearchService.js:206`](src/services/SearchService.js:206) - groupByCenter()
- [`ResultsRenderer.js:35`](src/components/ResultsRenderer.js:35) - renderGroupedResults()
- [`ResultsRenderer.js:106`](src/components/ResultsRenderer.js:106) - createActivityItem()
- [`FilterItem.js:124`](src/components/FilterItem.js:124) - renderFlat()
- [`FilterPanel.js:106`](src/components/FilterPanel.js:106) - createActivityFilter()
