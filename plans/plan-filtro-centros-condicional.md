# Plan: Filtro de Centros Condicional

## Objetivo
Modificar el comportamiento del filtro de centros en el panel de filtros: cuando hay un centro seleccionado en el formulario de búsqueda (`state.filters.center[0]`), el panel de filtros NO debe mostrar el filtro de centros.

## Requisitos Confirmados
✓ Si `state.filters.center[0]` existe → **NO mostrar opciones de centros** en el panel (filtro vacío/oculto)
✓ Si `state.filters.center[0]` NO existe → **Mostrar todos los centros** disponibles en el panel

## Análisis Actual
El código en `FilterPanel.js` línea 196-232:
- Método `#createCenterFilter()` obtiene todos los centros
- Filtra solo el centro seleccionado de la lista (línea 212-216)
- Siempre renderiza el filtro, aunque sea con opciones vacías

**Problema:** El filtro se sigue mostrando aunque no tenga opciones disponibles

## Cambios Necesarios

### 1. Modificar `#createCenterFilter()` (línea 196)
**Estrategia:** Retornar un contenedor vacío cuando hay centro seleccionado

```javascript
// Antes (línea 208-216):
const formCenterId = state.filters.center && state.filters.center.length > 0
  ? state.filters.center[0]
  : null;

const options = formCenterId
  ? allCenters
      .filter(center => center.id !== formCenterId)
      .map(center => center.name)
  : allCenters.map(center => center.name);
```

**Después:**
```javascript
// Si hay centro seleccionado, NO mostrar el filtro en absoluto
const formCenterId = state.filters.center && state.filters.center.length > 0
  ? state.filters.center[0]
  : null;

if (formCenterId) {
  // Retornar un contenedor vacío cuando hay centro seleccionado
  const emptyContainer = document.createElement('div');
  emptyContainer.setAttribute('data-filter-id', 'center');
  emptyContainer.style.display = 'none';
  return emptyContainer;
}

// Si no hay centro seleccionado, mostrar todos los centros
const options = allCenters.map(center => center.name);
```

### 2. Actualizar `#updateActivityAndCenterFilters()` (línea 95)
**Cambio:** Cuando se actualiza el centro, reemplazar completamente el filtro en el DOM

La lógica actual (línea 122-127) ya reemplaza el elemento, así que debería funcionar correctamente con el cambio anterior. Solo es necesario verificar que:
- Cuando se establece un centro → el filtro desaparece
- Cuando se limpia el centro → el filtro reaparece con todas las opciones

### 3. Validaciones Adicionales
- Verificar que `render()` (línea 26) sigue funcionando correctamente al insertar centros vacíos
- Confirmar que `#updateActivityAndCenterFilters()` se llama desde `SearchComponent` cuando cambia el formulario
- Asegurar que el botón "Limpiar Filtros" (línea 463) funciona correctamente

## Impacto Potencial
- ✓ No afecta otros filtros (audience, activity, dayOfWeek, timeSlot, language)
- ✓ FilterItem.js no necesita cambios
- ✓ Store.js no necesita cambios
- ✓ FilterService.js no necesita cambios
- ⚠ SearchComponent debe seguir notificando cambios de formulario a FilterPanel

## Pruebas Requeridas
1. **Caso 1:** Con centro seleccionado
   - Acción: Seleccionar un centro en el formulario
   - Resultado esperado: El filtro de centros desaparece del panel

2. **Caso 2:** Sin centro seleccionado
   - Acción: Cargar la página o limpiar el centro del formulario
   - Resultado esperado: El filtro de centros aparece con todas las opciones

3. **Caso 3:** Cambio de centro
   - Acción: Cambiar el centro del formulario de uno a otro
   - Resultado esperado: El filtro sigue desaparecido (no muestra opciones)

4. **Caso 4:** Limpiar filtros
   - Acción: Hacer clic en "Limpiar Filtros"
   - Resultado esperado: El filtro de centros reaparece con todas las opciones

## Archivos a Modificar
- `src/components/FilterPanel.js` (método `#createCenterFilter()`)

## Archivos a Validar (sin cambios)
- `src/components/SearchComponent.js` (debe llamar `updateFormFilters()`)
- `src/components/FilterItem.js` (no requiere cambios)
- `src/store.js` (no requiere cambios)
