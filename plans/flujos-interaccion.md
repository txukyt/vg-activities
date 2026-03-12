# Flujos de Interacción - Formulario y Filtros

## 1. Flujo General de Búsqueda

```mermaid
graph TD
    A[Usuario abre página] --> B[SearchComponent.render]
    B --> C[SearchForm renderiza]
    B --> D[FilterPanel renderiza]
    C --> E{Usuario modifica<br/>búsqueda?}
    D --> F{Usuario modifica<br/>filtros?}
    E -->|Sí| G[Store.setFilters]
    F -->|Sí| G
    G --> H[#performSearch]
    H --> I[SearchService.search]
    I --> J[Store.setResults]
    J --> K[ResultsRenderer.render]
    K --> L[Usuario ve resultados]
```

## 2. Flujo: Cambio en SearchForm

```mermaid
graph LR
    A[Usuario modifica<br/>SearchForm] --> B{Tipo de control?}
    B -->|searchText| C[Store.setFilters &lt; searchText &gt;]
    B -->|hasAvailableSpots| D[Store.setFilters &lt; hasAvailableSpots &gt;]
    B -->|startDate/endDate| E[Store.setFilters &lt; dateRange &gt;]
    B -->|maxAge| F[Store.setFilters &lt; maxAge &gt;]
    C --> G[performSearch]
    D --> G
    E --> G
    F --> G
    G --> H[Búsqueda ejecutada]
```

## 3. Flujo: Seleccionar Opción en Filtro

```mermaid
graph TD
    A[Usuario clickea opción en FilterItem] --> B[FilterItem.onSelect]
    B --> C{¿Opción<br/>ya seleccionada?}
    C -->|Sí| D[Remover de array]
    C -->|No| E[Agregar a array]
    D --> F[Store.setFilters]
    E --> F
    F --> G[FilterItem re-renderiza]
    G --> H[performSearch]
```

## 4. Flujo: Búsqueda Interna en Filtro

```mermaid
graph TD
    A[Usuario escribe en<br/>FilterItem searchbox] --> B{¿Es Centro<br/>filter?}
    B -->|Sí| C[CenterFilterObserver.notifySearch]
    B -->|No| D[FilterService.filterOptions]
    C --> E{¿Texto vacío?}
    E -->|Sí| F[Mostrar opciones<br/>agrupadas]
    E -->|No| G[Mostrar opciones<br/>planas filtradas]
    D --> H[Re-renderizar opciones]
    G --> H
    F --> H
    H --> I[Usuario ve<br/>resultados filtrados]
```

## 5. Flujo: A/B Testing Día Semana

```mermaid
graph TD
    A[Usuario clickea<br/>toggle en Día Semana] --> B[DayWeekFilter.toggleViewMode]
    B --> C{Modo actual?}
    C -->|grouped| D[Cambiar a 'list']
    C -->|list| E[Cambiar a 'grouped']
    D --> F[Re-renderizar opciones]
    E --> F
    F --> G{¿Esto afecta<br/>búsqueda?}
    G -->|No| H[Solo UI change]
    G -->|Sí| I[performSearch]
```

## 6. Flujo: Limpiar Filtros

```mermaid
graph LR
    A[Usuario clickea<br/>Limpiar filtros] --> B[Store.resetFilters]
    B --> C[FilterPanel re-renderiza]
    B --> D[SearchForm se limpia]
    B --> E[performSearch]
    E --> F[Muestra todos<br/>resultados]
```

## 7. Observador Centro Filter

```mermaid
graph TD
    A[CenterFilterObserver] --> B[Observar cambios<br/>en searchText]
    B --> C{searchText<br/>vacío?}
    C -->|Sí| D[Modo AGRUPADO]
    C -->|No| E[Modo PLANO]
    D --> F[Renderizar con grouping<br/>por tipo]
    E --> G[FilterService.filterOptions]
    G --> H[Renderizar plano]
    H --> I[Usuario ve<br/>resultados]
    F --> I
```

## 8. Relación Store + FilterPanel + SearchForm

```mermaid
graph TB
    subgraph Store
        F["filters = {<br/>searchText,<br/>hasAvailableSpots,<br/>startDate, endDate,<br/>maxAge,<br/>audience, activity,<br/>center, dayOfWeek,<br/>timeSlot, language,<br/>dayOfWeekViewMode<br/>}"]
    end
    
    subgraph Components
        SF["SearchForm<br/>(Sección A)"]
        FP["FilterPanel<br/>(Sección B)"]
    end
    
    subgraph Services
        SS["SearchService.search"]
        FS["FilterService"]
    end
    
    SF -->|setState| F
    FP -->|setState| F
    F -->|getState| SF
    F -->|getState| FP
    SF -->|performSearch| SS
    FP -->|performSearch| SS
    SS -->|filterOptions| FS
    SS -->|setResults| Store
```

## 9. Precedencia de Filtros (Operadores)

```
Lógica de aplicación de filtros:

AND entre categorías:
  audience[] AND activity[] AND center[] AND dayOfWeek[] AND timeSlot[] AND language[]

OR dentro de categorías:
  (audience[0] OR audience[1] OR ...) AND (activity[0] OR activity[1] OR ...)

BÚSQUEDA LIBRE:
  (searchText en título OR descripción) AND todos_los_filtros_anteriores

FECHA:
  startDate <= activity.startDate AND endDate >= activity.endDate

EDAD:
  maxAge <= activity.age.max
```

## 10. Ciclo de Vida de un FilterItem

```mermaid
graph TD
    A[FilterItem instanciado] --> B[constructor 'config']
    B --> C[render]
    C --> D[Crear label]
    C --> E[Crear searchbox 'internal']
    C --> F[Renderizar options]
    C --> G[Attach listeners]
    G --> H{Evento?}
    H -->|input searchbox| I[Filtrar opciones]
    H -->|click opción| J[Actualizar selected]
    H -->|change| K[Store.setFilters]
    I --> L[Re-renderizar]
    J --> L
    K --> M[performSearch]
    L --> N[Usuario ve cambios]
```
