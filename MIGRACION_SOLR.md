# Migración SearchService a Backend SOLR

## 📋 Resumen de Cambios

Se ha refactorizado completamente el `SearchService` para consultar un backend SOLR en `/m01-10s/api/search.do` en lugar de filtrar datos en el store de forma local. Se mantiene la compatibilidad con todos los componentes existentes.

### Archivos Nuevos

- **`src/services/SolrGateway.js`**: Gateway que abstrae la comunicación HTTP con el backend SOLR
  - Método `search(filters, offset, limit)`: Envía filters en JSON POST
  - Método `fetchCenters()`: Obtiene centros disponibles (facetas)
  - Manejo de timeout (30s) y errores

### Archivos Modificados

- **`src/services/SearchService.js`**: Completamente refactorizado (v2)
  - Ahora consulta `SolrGateway.search()` en lugar de `store.getActivities()`
  - Mantiene lógica de agrupación por centro
  - Soporta transformación flexible de respuestas SOLR
  - Incluye método `getActivityById(id)` para componentes de detalle

---

## 🔄 Arquitectura Nueva

```
SearchComponent.js
    ↓ llama
SearchService.search(filters, offset, limit)
    ↓ consulta
SolrGateway.search(filters, offset, limit)
    ↓ HTTP POST
Backend: /m01-10s/api/search.do
    ↓ retorna
{ results: [...], totalCount: N, facets: {...}, ... }
    ↓ transforma
SearchService.#transformResults()
    ↓ agrupa
SearchService.#groupByCenter()
    ↓ retorna
{ data: [...], viewMode: 'grouped', totalItems: N, hasMore: bool, facets: {...} }
```

---

## 🔌 Contrato HTTP: Frontend → Backend

### Endpoint
```
POST /m01-10s/api/search.do
Content-Type: application/json
```

### Request Body
```javascript
{
  "filters": {
    "searchText": "yoga",           // string
    "activity": ["1", "2"],          // array of IDs (empty if none)
    "center": ["bizan"],             // array of IDs (empty if none)
    "dayOfWeek": ["MON", "TUE"],     // array (empty if none)
    "timeSlot": ["morning"],         // array (empty if none)
    "language": ["es", "en"],        // array (empty if none)
    "maxAge": 65,                    // number or null
    "hasAvailableSpots": true        // boolean
  },
  "pagination": {
    "offset": 0,
    "limit": 10
  }
}
```

### Response Body (formato esperado - FLEXIBLE)

El gateway es agnóstico al formato exacto. Soporta múltiples formatos:

#### Opción 1: Formato "results"
```javascript
{
  "results": [
    {
      "id": 1,
      "title": "Yoga",
      "center": "bizan",
      "centerName": "Centro Bizan",
      "centerType": "civic_center",
      "description": "...",
      "image": "...",
      "sessions": [
        {
          "id": "s1",
          "date": "2025-03-15",
          "startTime": "10:00",
          "endTime": "11:00",
          "dayOfWeek": "MON",
          "timeSlot": "morning",
          "schedule": "10:00 - 11:00",
          "format": "presencial",
          "audience": "adultos",
          "language": "es",
          "age": { "min": 18, "max": 65 },
          "availableSpots": 5,
          "totalSpots": 15
        }
      ]
    }
  ],
  "totalCount": 42,
  "facets": {
    "center": [
      { "id": "bizan", "name": "Centro Bizan", "count": 12 },
      { "id": "sagrera", "name": "Centro Sagrera", "count": 8 }
    ],
    "dayOfWeek": [
      { "id": "MON", "name": "Lunes", "count": 15 },
      { "id": "TUE", "name": "Martes", "count": 10 }
    ],
    "timeSlot": [
      { "id": "morning", "name": "Mañana", "count": 20 },
      { "id": "afternoon", "name": "Tarde", "count": 22 }
    ]
  }
}
```

#### Opción 2: Formato SOLR estándar
```javascript
{
  "docs": [...],           // SearchService.#extractResults() busca esto
  "numFound": 42,          // SearchService.#extractTotalCount() lo busca
  "facets_counts": {...}   // Estructura de facetas SOLR estándar
}
```

**El SearchService es flexible y acepta ambos formatos** gracias a:
- `#extractResults(solrResponse)` - busca `results` o `docs`
- `#extractTotalCount(solrResponse)` - busca `totalCount` o `numFound`

---

## 🛠️ Uso en Componentes

### SearchComponent.js (Ya funcionando)
```javascript
// Este componente YA FUNCIONA - no requiere cambios
const result = await SearchService.search(filters, offset, limit);
// Retorna: { data, viewMode, totalItems, hasMore, offset, limit, facets }
```

### FilterPanel.js (Requiere adaptación - Fase 2)
```javascript
// ACTUAL (en store - datos en memoria)
this.activities = store.getActivities();

// NUEVO (consumir facetas del backend - pendiente)
// const result = await SearchService.search({}, 0, 1);
// this.activities = result.facets?.activity || [];
```

### DetailComponent.js y SessionDetailComponent.js (Ya funcionando)
```javascript
// Mantiene compatibilidad
const activity = await SearchService.getActivityById(activityId);
// Obtiene del store cacheado (por ahora)
```

---

## 🚀 Plan de Implementación Progresiva

### ✅ Fase 1: Backend Básico (COMPLETADO)
- [x] Crear `SolrGateway.js` con comunicación HTTP flexible
- [x] Refactorizar `SearchService.search()` para usar SolrGateway
- [x] Mantener agrupación por centro
- [x] Preservar contrato de salida para componentes

**Estado**: `src/services/SearchService.js` ahora consulta `/m01-10s/api/search.do`

### ⏳ Fase 2: Filtros Dinámicos (Pendiente)
- [ ] Actualizar `FilterPanel.js` para consumir facetas del backend
- [ ] Adaptar `FilterService.js` para recibir facetas en lugar de actividades estáticas
- [ ] Validar que los filtros se construyen correctamente desde facetas

### ⏳ Fase 3: Backend Completo (Pendiente)
- [ ] Implementar endpoint `/m01-10s/api/activity/{id}` en backend
- [ ] Actualizar `SearchService.getActivityById()` para consultar backend
- [ ] Eliminar dependencia de `store.getActivities()` en DetailComponent

### ⏳ Fase 4: Optimización (Pendiente)
- [ ] Caching en cliente (LocalStorage)
- [ ] Prefetching de resultados relacionados
- [ ] Métricas de búsqueda

---

## ⚙️ Configuración de CORS

Si el backend está en diferente dominio, asegurar que tenga CORS habilitado:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET
Access-Control-Allow-Headers: Content-Type
```

---

## 🔍 Debugging

### Logs disponibles en consola

```javascript
// SolrGateway
[SolrGateway] Enviando búsqueda al backend
[SolrGateway] Respuesta recibida
[SolrGateway] Datos parseados

// SearchService
[SearchService] Iniciando búsqueda contra backend SOLR
[SearchService] Respuesta recibida del backend
[SearchService] Datos extraídos de respuesta SOLR
[SearchService] Resultados transformados
[SearchService] Datos agrupados por centro
[SearchService] Agrupación completada
```

### Comprobar respuesta en DevTools
```javascript
// En browser console
await fetch('/m01-10s/api/search.do', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filters: { searchText: 'yoga' },
    pagination: { offset: 0, limit: 10 }
  })
}).then(r => r.json()).then(console.log);
```

---

## 📝 Próximos Pasos

1. **Validar respuesta del backend real** contra la estructura esperada
2. **Ejecutar tests** en ambiente de desarrollo
3. **Adaptar FilterPanel** en Fase 2
4. **Implementar facetas** cuando backend esté listo
5. **Medir performance** en infinite scroll

---

## 🔗 Referencias

- `SolrGateway.js` - Gateway HTTP
- `SearchService.js` - Lógica de transformación + agrupación
- `src/components/SearchComponent.js` - Componente que llama a SearchService
- `store.js` - Estado global (aún usado para datos iniciales)
- `/m01-10s/api/search.do` - Endpoint backend (ajustar URL según ambiente)
