# Cambios Realizados: Filtro de Centros Condicional

## Resumen Ejecutivo
Se implementó un sistema para ocultar el filtro de centros en el panel de filtros (Sección B) cuando hay un centro seleccionado en el formulario de búsqueda (Sección A). La solución diferencia entre selecciones del formulario y selecciones del panel de filtros mediante un campo adicional en el store.

## Problema Original
Cuando el usuario seleccionaba un centro desde el panel de filtros (Sección B), ese centro se añadía a `state.filters.center`, lo que causaba que el filtro de centros desapareciera incorrectamente. El comportamiento esperado es:
- ✓ Si hay centro en **formulario** (Sección A) → Ocultar filtro de centros
- ✓ Si hay centro en **filtros panel** (Sección B) → Mostrar filtro de centros (con todas las opciones)

## Solución Implementada

### 1. Archivo: `src/store.js`
**Cambio 1:** Agregar campo `formCenterId` al constructor
```javascript
this.state = {
  // ... otros campos ...
  formCenterId: null  // Rastrear centro seleccionado en el formulario (Sección A)
};
```

**Cambio 2:** Agregar métodos para gestionar formCenterId
```javascript
/**
 * Establece el ID del centro seleccionado en el formulario (Sección A).
 * @param {string|null} centerId - ID del centro o null
 */
setFormCenterId(centerId) {
  this.setState({ formCenterId: centerId });
}

/**
 * Obtiene el ID del centro seleccionado en el formulario.
 * @returns {string|null} ID del centro o null
 */
getFormCenterId() {
  return this.state.formCenterId;
}
```

**Cambio 3:** Limpiar formCenterId en resetFilters()
```javascript
resetFilters() {
  this.setFilters(FilterService.getDefaultFilters());
  this.setFormCenterId(null);  // Limpiar también el centro del formulario
}
```

### 2. Archivo: `src/components/SearchForm.js`
**Cambio 1:** Al seleccionar un centro en el formulario (línea 136-140)
```javascript
select.addEventListener('change', (e) => {
  const value = e.target.value;
  store.setFilters({ center: value ? [value] : [] });
  store.setFormCenterId(value || null);  // Rastrear que viene del formulario
  this.onSearch();
});
```

**Cambio 2:** Al limpiar el formulario (línea 353-384)
```javascript
button.addEventListener('click', () => {
  // ... código existente ...
  store.setFormCenterId(null);  // Limpiar rastreo del centro del formulario
  // ... resto del código ...
});
```

### 3. Archivo: `src/components/FilterPanel.js`
**Cambio:** Método `#createCenterFilter()` (línea 196-233)

Antes: Usaba `state.filters.center[0]` para detectar si había un centro seleccionado

Después: Usa `store.getFormCenterId()` para detectar si el centro viene del formulario
```javascript
#createCenterFilter() {
  const state = store.getState();
  
  // Usar getFormCenterId() para diferencia entre:
  // - Centro seleccionado en FORMULARIO (Sección A)
  // - Centro seleccionado en PANEL DE FILTROS (Sección B)
  const formCenterId = store.getFormCenterId();
  
  // Si hay centro seleccionado en el formulario, no mostrar el filtro
  if (formCenterId) {
    const emptyContainer = document.createElement('div');
    emptyContainer.setAttribute('data-filter-id', 'center');
    emptyContainer.style.display = 'none';
    return emptyContainer;
  }
  
  // Si no hay centro seleccionado en el formulario, mostrar todos los centros
  const allCenters = FilterService.getCentersFlat(this.activities);
  const options = allCenters.map(center => center.name);
  
  // ... resto del código para crear FilterItem ...
}
```

## Lógica de Funcionamiento

### Flujo 1: Usuario selecciona centro en FORMULARIO
1. Usuario selecciona un centro en el select del formulario (Sección A)
2. `SearchForm.js` llama a:
   - `store.setFilters({ center: [centerId] })`
   - `store.setFormCenterId(centerId)`
3. `SearchComponent` detecta cambio en state
4. Llama a `filterPanel.updateFormFilters()`
5. `#createCenterFilter()` detecta que hay `formCenterId`
6. Retorna contenedor vacío (display: none)
7. **Resultado:** Filtro de centros desaparece del panel

### Flujo 2: Usuario selecciona centro en PANEL DE FILTROS
1. Usuario selecciona un centro haciendo click en checkbox del panel
2. `FilterItem.js` agrega el centro a `state.filters.center`
3. `formCenterId` sigue siendo `null` (no cambió)
4. `#createCenterFilter()` detecta que `formCenterId` es `null`
5. Renderiza el filtro normalmente con todas las opciones
6. **Resultado:** Filtro de centros permanece visible

### Flujo 3: Usuario limpia el FORMULARIO
1. Usuario hace clic en "Limpiar Búsqueda" (Sección A)
2. `SearchForm.js` llama a:
   - `store.setFilters({ center: [], ... })`
   - `store.setFormCenterId(null)`
3. `SearchComponent` detecta cambio
4. `filterPanel.updateFormFilters()` actualiza el panel
5. `#createCenterFilter()` ahora ve `formCenterId = null`
6. **Resultado:** Filtro de centros reaparece

## Datos Afectados
- `store.state.formCenterId`: Nuevo campo que rastrea el centro del formulario

## Archivos Modificados
1. `src/store.js` - Agregar campo y métodos de gestión
2. `src/components/SearchForm.js` - Actualizar para rastrear selección
3. `src/components/FilterPanel.js` - Usar nuevo campo para lógica condicional

## Archivos NO Modificados
- `src/components/FilterItem.js` - Sin cambios necesarios
- `src/services/FilterService.js` - Sin cambios necesarios
- `src/components/SearchComponent.js` - Sin cambios necesarios

## Casos de Uso Validados
✓ **Caso 1:** Centro en formulario → Filtro oculto en panel
✓ **Caso 2:** Sin centro en formulario → Filtro visible con todas opciones
✓ **Caso 3:** Seleccionar centro en panel → Filtro permanece visible
✓ **Caso 4:** Limpiar formulario → Filtro reaparece
✓ **Caso 5:** Cambiar centro en formulario → Filtro permanece oculto

## Próximos Pasos Sugeridos
- Considerar agregar un indicador visual que explique por qué desaparece el filtro
- Documentar este comportamiento en la UI (ej: tooltip, mensaje de ayuda)
- Agregar pruebas unitarias para validar la lógica
