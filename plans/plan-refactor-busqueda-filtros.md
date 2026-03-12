# Plan de Refactorización: Búsqueda y Filtros

## Objetivos
1. Agregar campos de **Centro** y **Actividad** al formulario de búsqueda (SearchForm) como dropdowns
2. Reorganizar el layout para mostrar los resultados y filtros en **2 columnas**:
   - Columna izquierda: Resultados de búsqueda
   - Columna derecha: Filtros en un elemento **`<aside>`**
3. Mantener el formulario de búsqueda (SearchForm) en la parte superior a ancho completo

## Cambios Principales

### 1. **SearchForm.js** - Agregar dropdowns de Centro y Actividad
**Ubicación**: `src/components/SearchForm.js`

**Cambios**:
- Agregar nuevo campo: **Centro** (dropdown con opciones)
- Agregar nuevo campo: **Actividad** (dropdown con opciones)
- Posicionar estos campos antes de los existentes o en fila aparte
- Conectar estos campos con el store para almacenar las selecciones
- Los eventos de cambio dispararán búsquedas automáticas

**Estructura esperada**:
```
Búsqueda Libre: [input text]
Centro: [dropdown select]
Actividad: [dropdown select]
[Otros campos: plazas libres, fechas, edad máxima]
[Botón Limpiar Búsqueda]
```

### 2. **store.js** - Extender estado para nuevos filtros
**Ubicación**: `src/store.js`

**Cambios**:
- Verificar que el estado inicial incluya `center` y `activity`
- Estos ya deben estar en los filtros, pero validar su estructura
- Asegurar que se pueden actualizar con `store.setFilters()`

### 3. **SearchComponent.js** - Refactorizar layout
**Ubicación**: `src/components/SearchComponent.js`

**Cambios principales**:
- Header (mantener igual, a ancho completo)
- SearchForm (mantener igual, a ancho completo)
- Crear un **contenedor de layout 2 columnas** después del formulario:
  ```html
  <div class="search-layout">
    <div class="results-column">
      <!-- Resultados aquí -->
    </div>
    <aside class="filters-sidebar">
      <!-- FilterPanel aquí -->
    </aside>
  </div>
  ```
- Mover `ResultsRenderer` a la columna izquierda
- Mover `FilterPanel` al elemento `<aside>` de la columna derecha

### 4. **FilterPanel.js** - Preparar para ser aside
**Ubicación**: `src/components/FilterPanel.js`

**Cambios mínimos**:
- Cambiar elemento contenedor de `<section>` a `<div>` o mantener `<section>` dentro del `<aside>`
- Asegurar que mantiene su clase y funcionalidad
- El cambio será principalmente en cómo se renderiza (ya no será elemento raíz)

### 5. **styles.css** - Estilos de layout y aside
**Ubicación**: `src/styles.css`

**Cambios principales**:
```css
/* Layout de 2 columnas */
.search-layout {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
}

.results-column {
  flex: 1;
  min-width: 0;
}

.filters-sidebar {
  width: 300px;  /* Ancho fijo para los filtros */
  /* O usar: flex: 0 0 300px; */
}

/* Responsive: en móvil, stack verticalmente */
@media (max-width: 768px) {
  .search-layout {
    flex-direction: column;
  }
  
  .filters-sidebar {
    width: 100%;
  }
}
```

**Estilos adicionales**:
- Ajustar márgenes/paddings del `.results-wrapper`
- Asegurar que `.filter-panel` se adapte al ancho del `<aside>`
- Agregar estilos para que el `<aside>` sea "sticky" si es necesario

## Flujo de Implementación

1. **Fase 1**: Extender SearchForm con dropdowns de Centro y Actividad
   - Obtener opciones de centros y actividades
   - Crear los campos select
   - Conectar con el store

2. **Fase 2**: Refactorizar SearchComponent
   - Crear estructura de layout 2 columnas
   - Reubicar componentes en sus nuevas posiciones

3. **Fase 3**: Actualizar estilos
   - Agregar reglas CSS para flexbox layout
   - Validar responsive design
   - Ajustar espaciados y tamaños

4. **Fase 4**: Pruebas
   - Verificar funcionamiento de filtros
   - Probar en diferentes tamaños de pantalla
   - Validar que navegación entre páginas funciona

## Consideraciones Técnicas

### Reutilización de datos
- Los centros y actividades ya están disponibles (el FilterPanel ya los usa)
- Usar `FilterService.getCenters()` y `FilterService.getActivityNames()`

### Sincronización de estado
- El store ya maneja `center` y `activity` como arrays
- Los nuevos dropdowns deben actualizar estos valores
- Los filtros del panel deben sincronizarse correctamente

### Responsiveness
- Diseño debe funcionar en móvil, tablet y desktop
- En móvil, los filtros deben apilarse bajo los resultados
- Considerar si los filtros deben ser "colapsables" en móvil

## Resultado Esperado

```
┌─────────────────────────────────────┐
│         HEADER Y TÍTULO             │
├─────────────────────────────────────┤
│                                     │
│     FORMULARIO DE BÚSQUEDA          │
│  [Búsqueda] [Centro] [Actividad]    │
│  [Plazas] [Fechas] [Edad] [Limpiar] │
│                                     │
├──────────────────────┬──────────────┤
│                      │              │
│   RESULTADOS         │  FILTROS     │
│   (Column 1)         │  (Aside)     │
│                      │              │
│                      │  - Público   │
│                      │  - Actividad │
│                      │  - Centro    │
│                      │  - Días      │
│                      │  - Horarios  │
│                      │  - Idioma    │
│                      │  [Limpiar]   │
│                      │              │
└──────────────────────┴──────────────┘
```

## Cambios en Archivos

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/components/SearchForm.js` | Modificación | Agregar dropdowns Centro y Actividad |
| `src/components/SearchComponent.js` | Modificación | Refactorizar layout a 2 columnas |
| `src/components/FilterPanel.js` | Minimal | Preparar para ser hijo de aside (cambios mínimos) |
| `src/styles.css` | Modificación | Agregar estilos de layout flexbox y responsive |
| `src/store.js` | Verificación | Validar que incluye center y activity (sin cambios si ya están) |

---

**Estado**: Listo para implementación una vez aprobado
