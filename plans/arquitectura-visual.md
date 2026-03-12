# Arquitectura Visual: Plan Simplificado

## 1️⃣ Flujo de Búsqueda - ANTES vs DESPUÉS

### ANTES (Actual) - Duplicación
```
Activity {
  id: 1,
  title: "Yoga Iniciación (BIZAN)",
  sessions: [
    {id: "1-1", date: "2026-02-01", startTime: "09:00"},
    {id: "1-2", date: "2026-02-05", startTime: "18:00"}
  ]
}
    ↓
SearchService#flattenActivities() expande sesiones
    ↓
Flat Array: [
  {id: 1, sessionId: "1-1", title: "Yoga...", schedule: "lunes 09:00-10:00"},
  {id: 1, sessionId: "1-2", title: "Yoga...", schedule: "viernes 18:00-19:00"}
]
    ↓
ResultsRenderer renderiza cada item
    ↓
RESULTADO: "Yoga Iniciación" aparece 2 veces ❌
```

### DESPUÉS (Mejorado) - Una sola vez
```
Activity {
  id: 1,
  title: "Yoga Iniciación (BIZAN)",
  sessions: [...]
}
    ↓
SearchService#groupByCenter() agrupa por activity
    ↓
Grouped Data: {
  center: {id: "bizan-arana", name: "BIZAN ARANA"},
  activity: {id: 1, title: "Yoga...", description: "..."},
  sessions: [ses1, ses2, ...] (almacenadas pero no mostradas)
}
    ↓
ResultsRenderer renderiza una actividad mostrando 1ª sesión
    ↓
RESULTADO: "Yoga Iniciación" aparece 1 vez ✓
         con horario de la primera sesión
         botón "Ver horarios" abre todas las sesiones
```

---

## 2️⃣ Interfaz de Usuario - Resultados

### Antes (Duplicación)
```
┌─────────────────────────────────────────┐
│ BIZAN ARANA (3 actividades)             │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📷 Yoga Iniciación (BIZAN)          │ │
│ │                                     │ │
│ │ Sesión de yoga para principiantes   │ │
│ │ Horario: lunes 09:00-10:00          │ │
│ │ Edad: 18-99 años                    │ │
│ │ Plazas: 8/16                        │ │
│ │ [Ver horarios]                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │ ← DUPLICADO
│ │ 📷 Yoga Iniciación (BIZAN)          │ │ (misma actividad,
│ │                                     │ │  diferente sesión)
│ │ Sesión de yoga para principiantes   │ │
│ │ Horario: viernes 18:00-19:00        │ │
│ │ Edad: 18-99 años                    │ │
│ │ Plazas: 10/16                       │ │
│ │ [Ver horarios]                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📷 Ajedrez Iniciación (BIZAN)       │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Después (Una sola vez)
```
┌─────────────────────────────────────────┐
│ BIZAN ARANA (3 actividades)             │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📷 Yoga Iniciación (BIZAN)          │ │
│ │                                     │ │
│ │ Sesión de yoga para principiantes   │ │
│ │ Horario: lunes 09:00-10:00          │ │ ← Solo la primera
│ │ Edad: 18-99 años                    │ │
│ │ Plazas: 8/16                        │ │
│ │ [Ver horarios] ← Abre todas las     │ │
│ │              sesiones (2 total)    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📷 Ajedrez Iniciación (BIZAN)       │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 3️⃣ Filtros - ANTES vs DESPUÉS

### Antes (Saturado)
```
┌──────────────────────────────┐
│ Actividad              [🔍]  │
├──────────────────────────────┤
│ ☐ Ajedrez Iniciación         │
│ ☐ Aeróbic                    │
│ ☐ Bailo Latino               │
│ ☐ Capoeira                   │
│ ☐ Danza Clásica              │
│ ☐ Esgrima                    │
│ ☐ Fútbol                     │
│ ☐ Gimnasia                   │
│ ☐ Hockey                     │
│ ☐ Judo                       │
│ ☐ Karate                     │
│ ☐ Pilates                    │
│ ☐ Taekwondo                  │
│ ☐ Tenis                      │
│ ☐ Voleibol                   │
│ ☐ Yoga Iniciación            │
│ ... (muchas más abajo)       │
└──────────────────────────────┘
```

### Después - Colapsado (Predeterminado)
```
┌──────────────────────────────┐
│ Actividad              [🔍]  │
├──────────────────────────────┤
│ ☐ Ajedrez Iniciación         │
│ ☐ Aeróbic                    │
│ ☐ Bailo Latino               │
│ ☐ Capoeira                   │
│ ☐ Danza Clásica              │
├──────────────────────────────┤
│  ▼ Ver más (11 opciones)     │ ← Botón
└──────────────────────────────┘
```

### Después - Expandido
```
┌──────────────────────────────┐
│ Actividad              [🔍]  │
├──────────────────────────────┤
│ ☐ Ajedrez Iniciación         │
│ ☐ Aeróbic                    │
│ ☐ Bailo Latino               │
│ ☐ Capoeira                   │
│ ☐ Danza Clásica              │
│ ☐ Esgrima                    │
│ ☐ Fútbol                     │
│ ☐ Gimnasia                   │
│ ☐ Hockey                     │
│ ☐ Judo                       │
│ ☐ Karate                     │
│ ☐ Pilates                    │
│ ☐ Taekwondo                  │
│ ☐ Tenis                      │
│ ☐ Voleibol                   │
│ ☐ Yoga Iniciación            │
├──────────────────────────────┤
│  ▲ Ver menos                 │ ← Botón
└──────────────────────────────┘
```

---

## 4️⃣ Estructura de Datos

### Vista Agrupada (searchMode = "grouped")
```javascript
[
  {
    center: {
      id: "bizan-arana",
      name: "BIZAN ARANA"
    },
    activities: [
      {
        id: 1,
        title: "Yoga Iniciación (BIZAN)",
        centerName: "BIZAN ARANA",
        description: "Sesión de yoga...",
        // Primera sesión para mostrar (referencia)
        date: "2026-02-01",
        startTime: "09:00",
        endTime: "10:00",
        schedule: "lunes 09:00-10:00",
        availableSpots: 8,
        totalSpots: 16,
        
        // Todas las sesiones guardadas (no mostradas)
        sessions: [
          {id: "1-1", date: "...", startTime: "..."},
          {id: "1-2", date: "...", startTime: "..."}
        ]
      }
    ]
  }
]
```

### Vista Lista (searchMode = "list")
```javascript
// Cuando se aplica filtro específico (actividad, centro, etc)
// Sigue siendo array plano expandido como ahora
[
  {id: 1, sessionId: "1-1", title: "Yoga...", schedule: "..."},
  {id: 1, sessionId: "1-2", title: "Yoga...", schedule: "..."}
]
```

---

## 5️⃣ Cambios por Componente

### SearchService.js
```
#groupByCenter() → Agrupar por ACTIVITY dentro de center
  Input:  [act1-ses1, act1-ses2, act2-ses1, ...]
  Output: [{center, activities: [act1(con sessions), act2(con sessions)]}]
```

### ResultsRenderer.js
```
#renderGroupedResults() → Ya recibe datos correctos
#createActivityItem() → Muestra solo datos de activity
  - Sin cambios grandes en renderizado
  - El activity contiene sessions internas (para "Ver horarios")
```

### FilterItem.js
```
#renderFlat() → Implementar "Ver más" / "Ver menos"
  Si opciones > 5:
    - Mostrar 5 + botón "Ver más"
    - Al hacer clic, expandir y mostrar todas
```

### FilterPanel.js
```
#createActivityFilter() → Pasar maxInitialOptions: 5
#createAudienceFilter() → Pasar maxInitialOptions: 5
#createCenterFilter() → Pasar maxInitialOptions: 5
```

### styles.css
```css
.filter-more-button { /* Botón "Ver más" */ }
```

---

## 6️⃣ Casos de Uso

### Caso 1: Búsqueda general (sin filtros)
```
Usuario abre la app → Sin búsqueda activa
  ↓
SearchService.search({}) → groupByCenter()
  ↓
Resultados agrupados por centro
  ↓
Ve "Yoga Iniciación (BIZAN)" una sola vez ✓
Hace clic "Ver horarios" → Va a detalle con todas sesiones
```

### Caso 2: Filtro por centro específico
```
Usuario selecciona centro "BIZAN ARANA"
  ↓
SearchService.search({center: ["bizan-arana"]})
  ↓
Vista LISTA (expandida)
  ↓
Ve cada sesión por separado ✓
Esto es correcto porque el usuario filtró específicamente
```

### Caso 3: Uso de filtros con "Ver más"
```
Usuario ve filtro "Actividad" con 16 opciones
  ↓
Muestra solo 5 + "Ver más (11 más)"
  ↓
Usuario hace clic "Ver más"
  ↓
Se expande y muestra todas las 16
  ↓
Usuario hace clic en checkbox
  ↓
Se aplica filtro automáticamente
```

---

## 7️⃣ Resumen de Cambios

| Componente | Tipo | Complejidad |
|---|---|---|
| SearchService | Lógica | Media |
| ResultsRenderer | Visualización | Baja |
| FilterItem | Visualización + Lógica | Media |
| FilterPanel | Configuración | Baja |
| styles.css | CSS | Baja |

**Total: 5 archivos a modificar**
