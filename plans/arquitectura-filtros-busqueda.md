# Plan de Implementación: Formulario de Búsqueda y Sistema de Filtros

## 📋 Resumen Ejecutivo

Se implementará un sistema modular de búsqueda y filtrado con dos componentes principales:
- **Formulario de Búsqueda (Sección A)**: Controles básicos de búsqueda libre, plazas libres, fechas y edad
- **Sistema de Filtros (Sección B)**: 6 filtros con cajas de búsqueda interna y comportamientos especializados

## 🏗️ Arquitectura General

```
SearchComponent
├── SearchForm (Sección A)
│   ├── Input búsqueda libre
│   ├── Checkbox plazas libres
│   ├── Rango fechas (Desde/Hasta)
│   └── Input edad máxima
│
├── FilterPanel (Sección B)
│   ├── FilterItem: Público Destinatario
│   ├── FilterItem: Actividad
│   ├── FilterItem: Centro (Con Observer personalizado)
│   ├── FilterItem: Día Semana (A/B Testing)
│   ├── FilterItem: Horario
│   └── FilterItem: Idioma
│
└── ResultsRenderer (Sin cambios)
```

## 📊 Estructura de Datos

### Store State - Filtros Extendidos

```javascript
filters: {
  // Sección A: Búsqueda Libre
  searchText: '',
  hasAvailableSpots: true,
  startDate: '',
  endDate: '',
  maxAge: undefined,
  
  // Sección B: Filtros
  audience: [],           // ['infantil', 'juvenil', 'adulto']
  activity: [],           // ['yoga', 'pintura', ...]
  center: [],             // ['centro-civico-bizan', ...]
  dayOfWeek: [],          // ['lunes', 'martes', ...]
  timeSlot: [],           // ['manana', 'tarde']
  language: [],           // ['espanol', 'ingles', ...]
  
  // A/B Testing
  dayOfWeekViewMode: 'grouped'  // 'grouped' o 'list'
}
```

### Activities.json - Campos Requeridos

Se extenderán todos los registros con:
```javascript
{
  // Campos existentes...
  "audience": "Adulto",          // 'Infantil', 'Juvenil', 'Adulto'
  "timeSlot": ["manana"],        // ['manana', 'tarde']
  "language": "Español",          // 'Español', 'Inglés', 'Francés', etc.
  "dayOfWeek": ["lunes", "viernes"],  // Extraído de schedule
  "centerType": "Centro Cívico"   // Para agrupación visual
}
```

## 🔧 Componentes a Crear/Modificar

### 1. **SearchForm.js** (Nuevo)
- Input búsqueda libre con aria-label
- Checkbox "Plazas Libres" (checked por defecto)
- Inputs type="date" para Desde/Hasta
- Input type="number" para edad máxima
- Actualiza store.filters automáticamente
- Dispara búsqueda en cada cambio

### 2. **FilterPanel.js** (Nuevo)
- Contenedor de todos los filtros
- Renderiza 6 instancias de FilterItem
- Gestiona estado de visibilidad de filtros
- Botón "Limpiar filtros" (resetea solo Section B)
- Situado en una columna a la derecha de la pantalla.

### 3. **FilterItem.js** (Nuevo - Base Reutilizable)
```javascript
FilterItem {
  constructor(config: {
    id: string,
    label: string,
    options: Array,
    selectedValues: Array,
    onSelect: Function,
    hasSearchBox: true,
    renderOption: Function (custom)
  })
}
```

### 4. **CenterFilterObserver.js** (Patrón Observer)
- Patrón Observer específico para el filtro de Centro
- Gestiona agrupación por tipo
- Observa cambios en la búsqueda interna
- Emite eventos cuando hay coincidencias planas

### 5. **FilterService.js** (Extensión)
Nuevos métodos estáticos:
```javascript
// Extraer opciones de filtros desde activities
static getAudienceOptions(activities) → ['Infantil', 'Juvenil', 'Adulto']
static getActivitiesNames(activities) → ['Yoga', 'Pintura', ...]
static getCentersGrouped(activities) → { type: [...], type2: [...] }
static getDaysOfWeek(activities) → ['lunes', 'martes', ...]
static getTimeSlots(activities) → ['mañana', 'tarde']
static getLanguages(activities) → ['Español', 'Inglés', ...]

// Búsqueda interna de filtros
static filterOptions(options, searchText) → filtered
```

## 🎯 Comportamientos Específicos

### Centro (Lógica Compleja)
1. **Vista por defecto**: Opciones agrupadas por "Tipo de Centro"
   - Centro Cívico: [Bizán, Moratalaz, San Blas, Vicálvaro]
   - Instituto Deportivo: [...]
   - Etc.

2. **Con búsqueda interna**: 
   - Desaparece agrupación
   - Muestra resultados planos
   - Mantiene búsqueda parcial (contains)

### Día Semana (A/B Testing)
1. **Toggle en UI**: Switch para alternar vistas
2. **Vista Agrupada** (default):
   - L-X (Lunes-Miércoles)
   - M-J (Martes-Jueves)
   - V-S (Viernes-Sábado)
   - D (Domingo)

3. **Vista Desglosada**:
   - L, M, X, J, V, S, D (individual)

### Horario
- Opciones: Mañana, Tarde, Mañana y Tarde
- Selección múltiple

## 🔌 Integración en SearchComponent

### Cambios a SearchComponent.js
1. Separar formulario actual en SearchForm
2. Agregar FilterPanel después de SearchForm
3. Reorganizar el evento de búsqueda
4. Ajustar layouts y CSS

```
SearchComponent.render()
├── Header (sin cambios)
├── SearchForm (nuevo)
├── FilterPanel (nuevo)
└── ResultsWrapper (sin cambios)
```

## 🎨 Estilos CSS

Nuevas clases:
```css
.search-form { /* Styles para SearchForm */ }
.form-group { /* Label + Input wrapper */ }
.form-group input[type="text"],
.form-group input[type="date"],
.form-group input[type="number"],
.form-group input[type="checkbox"] { /* Estilos inputs */ }

.filter-panel { /* Contenedor de filtros */ }
.filter-item { /* Contenedor individual de filtro */ }
.filter-item-header { /* Label + Search box */ }
.filter-item-search { /* Búsqueda interna */ }
.filter-options { /* Contenedor de opciones */ }
.filter-option { /* Opción individual */ }
.filter-option-group { /* Grupo de opciones (Centro) */ }
.filter-option-group-title { /* Título del grupo */ }

.day-week-toggle { /* Toggle A/B Testing */ }
.day-week-grouped { /* Vista agrupada */ }
.day-week-list { /* Vista desglosada */ }
```

## ♿ Accesibilidad

Todos los controles incluirán:
- `<label for="...">` apropiados
- `aria-label` cuando sea necesario
- `aria-describedby` para descripciones
- `aria-checked` para checkboxes
- `aria-selected` para opciones de filtro
- `role="group"` para grupos de filtros
- Navegación con Tab completa

## 🧪 Orden de Implementación

1. **Fase 1**: Datos y Servicios
   - Extender activities.json
   - Actualizar FilterService

2. **Fase 2**: Componentes Base
   - SearchForm.js
   - FilterItem.js
   - FilterPanel.js

3. **Fase 3**: Lógica Especializada
   - CenterFilterObserver.js
   - Implementar A/B Testing

4. **Fase 4**: Integración
   - Integrar en SearchComponent
   - Actualizar SearchService
   - Estilos CSS

5. **Fase 5**: Testing
   - Validación en navegador
   - Ajustes UI/UX

## 📝 Notas Importantes

- Los filtros funcionan como AND entre grupos pero OR dentro de cada grupo
- La búsqueda libre (searchText) aplica sobre título y descripción
- El A/B Testing del Día Semana NO persiste (solo sesión)
- Los Observers independientes son para centros/día_semana solo
- El Submit del formulario es dinámico (en cambio automático)
