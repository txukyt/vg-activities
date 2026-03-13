# Fix: Múltiples ejecuciones de búsqueda al pulsar "Limpiar Búsqueda"

## Problema Identificado

Cuando el usuario pulsaba el botón "Limpiar Búsqueda", se ejecutaba la función `#performSearch()` múltiples veces de forma no intencional, causando múltiples llamadas al backend y comportamiento inconsistente.

### Causa Raíz

La causa era una **cascada de eventos** en el flujo de actualización de estado:

1. **En `SearchForm.js:171-189`** - El botón "Limpiar Búsqueda":
   ```javascript
   store.setFilters({...});  // Dispara listeners
   this.onSearch();          // Llama a #performSearch()
   ```

2. El problema era que `store.setFilters()` internamente hace:
   ```javascript
   setFilters(newFilters) {
     this.setState({
       filters: { ...this.state.filters, ...newFilters }
     });
   }
   ```
   Esto notifica a todos los listeners (incluyendo `#updateResults()`)

3. Cuando `#updateResults()` se ejecutaba, podía disparar nuevamente `#performSearch()` si había cambios de estado

4. Finalmente, `#performSearch()` completa la búsqueda y hace otro `store.setState()`, disparando nuevamente los listeners

### Logs del Problema Original

```
[SearchComponent] #updateResults DISPARADO. loading: false results: 1 hasMore: false
[SearchComponent] Renderizando 1 resultados. hasMore: false
[SearchComponent] #performSearch llamado. isLoadingMore: false offset: 10 limit: 10
[SearchComponent] #updateResults DISPARADO. loading: true results: 1 hasMore: false
[SearchService] Iniciando búsqueda contra backend SOLR
[SearchComponent] #updateResults DISPARADO. loading: false results: 1 hasMore: false
```

Se puede ver que `#performSearch` se dispara, luego la búsqueda completa y se dispara nuevamente `#updateResults`.

## Solución Implementada

Se implementó una solución de **3 capas** para prevenir búsquedas duplicate:

### 1. Batching de Cambios de Estado (`SearchForm.js`)

**Cambio**: Usar `store.setState()` directamente en lugar de `store.setFilters()` que hace una notificación separada.

**Archivo**: `src/components/SearchForm.js:171-203`

```javascript
// ANTES (múltiples notificaciones):
store.setFilters({...});
this.onSearch();

// DESPUÉS (una sola notificación):
store.setState({
  filters: {...},
  pagination: {...}
});
this.onSearch();
```

**Beneficio**: Un único cambio de estado en lugar de dos, reduciendo cascadas de eventos.

### 2. Detección de Búsquedas Duplicate (`SearchComponent.js`)

**Cambio**: Agregar variable `lastPerformedSearch` que rastrea la última búsqueda ejecutada.

**Archivo**: `src/components/SearchComponent.js:27`

```javascript
this.lastPerformedSearch = null;  // Rastrear última búsqueda para evitar duplicados
```

### 3. Validación de Búsquedas Duplicate en `#performSearch()` 

**Archivo**: `src/components/SearchComponent.js:185-220`

```javascript
async #performSearch(isLoadingMore = false) {
  try {
    const state = store.getState();
    const filters = state.filters;
    const { offset, limit } = state.pagination;
    
    // Crear identificador único de esta búsqueda
    const currentSearchId = JSON.stringify({ filters, offset, isLoadingMore });

    // CRÍTICO: Evitar búsquedas duplicate inmediatas
    if (this.lastPerformedSearch === currentSearchId) {
      console.log('[SearchComponent] ⚠️ BÚSQUEDA DUPLICATE DETECTADA - IGNORANDO');
      return;
    }
    
    // ... resto del código ...
    
    // Al final, guardar identificador de búsqueda realizada
    this.lastPerformedSearch = currentSearchId;
  }
}
```

**Beneficio**: Si se intenta ejecutar la misma búsqueda dos veces consecutivas, la segunda es ignorada.

## Cambios Realizados

### 1. `src/components/SearchForm.js`

- **Líneas 171-203**: Modificado el event listener del botón "Limpiar Búsqueda"
  - Cambiar de `store.setFilters()` a `store.setState()` para batching
  - Agregar logs para debugging
  - Resetear también la paginación a valores iniciales

### 2. `src/components/SearchComponent.js`

- **Línea 27**: Agregar variable `this.lastPerformedSearch`
- **Líneas 185-220**: 
  - Crear identificador único de búsqueda (`currentSearchId`)
  - Agregar validación para evitar búsquedas duplicate
  - Agregar logs informativos
- **Líneas 299-304**:
  - Guardar identificador de búsqueda exitosa
  - Agregar logs de confirmación

## Comportamiento Esperado Después del Fix

Cuando pulsas "Limpiar Búsqueda":

1. **Una sola notificación de cambio de estado** - Se actualiza `filters` y `pagination` en un solo paso
2. **Una sola búsqueda al backend** - Se ejecuta `#performSearch()` una única vez
3. **Logs limpios sin duplicate**:
   ```
   [SearchForm] Botón "Limpiar Búsqueda" pulsado
   [SearchForm] Llamando a onSearch después de limpiar
   [SearchComponent] #performSearch llamado. isLoadingMore: false offset: 0 limit: 10
   [SearchComponent] ✓ Búsqueda ejecutada con ID: {"filters":{...},"offset":0,...
   [SearchComponent] Estado actualizado. pagination: {offset: 10, limit: 10, ...}
   ```

## Validación

Los cambios deben validarse verificando:

1. ✅ Al pulsar "Limpiar Búsqueda", solo hay UNA llamada a `#performSearch()`
2. ✅ No aparecen logs de "⚠️ BÚSQUEDA DUPLICATE DETECTADA"
3. ✅ Al cambiar filtros normalmente, el comportamiento es el mismo
4. ✅ El infinite scroll sigue funcionando correctamente
5. ✅ No hay errores en la consola

## Notas Técnicas

- La solución usa **identificadores de búsqueda** (serialización de `filters + offset + isLoadingMore`)
- Es una solución **sin impacto de performance** - solo agrega comparación de strings
- Es **backward compatible** - no cambia la API pública del componente
- Los logs incluyen indicadores visuales (`✓`, `⚠️`) para fácil identificación en debugging

## Archivos Modificados

1. `src/components/SearchForm.js` - Batching de cambios
2. `src/components/SearchComponent.js` - Detección de búsquedas duplicate
