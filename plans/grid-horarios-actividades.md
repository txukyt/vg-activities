# Plan: Grid de Horarios Agrupados por Fecha

## Descripción General
Cuando el usuario selecciona "Ver detalle" de una actividad, se mostrará un grid de 3 columnas (mañana, tarde, noche) con las diferentes sesiones/horarios disponibles para esa actividad, agrupados por fecha.

## Estructura Actual vs. Nueva

### Problema Actual
- Las actividades tienen un único `schedule` (texto descriptivo)
- No hay información de sesiones específicas por fecha y hora
- No se pueden agrupar múltiples horarios por franja temporal

### Solución Propuesta
1. **Extender el modelo de datos** para incluir sesiones con información individual
2. **Crear un servicio** para transformar y agrupar las sesiones
3. **Nuevo componente** ScheduleGridComponent para renderizar el grid
4. **Integración** en DetailComponent para reemplazar el horario simple

## Flujo de Datos

```
Activity (con sesiones) 
    ↓
ScheduleService.groupSessionsByDateAndTimeSlot()
    ↓
{ 
  "2026-02-01": { 
    "manana": [sesión], 
    "tarde": [], 
    "noche": [] 
  },
  ...
}
    ↓
ScheduleGridComponent (renderiza grid)
```

## Estructura de Datos Propuesta

### Extensión del modelo Activity
```javascript
{
  id: 1,
  title: "Yoga Matutino",
  // ... campos existentes ...
  sessions: [
    {
      id: "1-1",
      date: "2026-02-01",
      startTime: "09:00",
      endTime: "10:00",
      timeSlot: "manana", // mañana, tarde, noche
      availableSpots: 5,
      totalSpots: 20
    },
    // ... más sesiones ...
  ]
}
```

## Componentes y Servicios Required

### 1. ScheduleService (nuevo)
**Ubicación:** `src/services/ScheduleService.js`

**Métodos principales:**
- `groupSessionsByDateAndTimeSlot(sessions)` → Agrupa sesiones por fecha y franja horaria
- `getTimeSlot(time)` → Determina franja (mañana/tarde/noche) según hora
- `formatDateForDisplay(date)` → Formatea fecha para mostrar
- `generateDateRange(startDate, endDate, daysOfWeek)` → Genera rango de fechas basado en días de la semana

### 2. ScheduleGridComponent (nuevo)
**Ubicación:** `src/components/ScheduleGridComponent.js`

**Responsabilidades:**
- Recibir sesiones de una actividad
- Agrupar por fecha y franja horaria
- Renderizar grid de 3 columnas (mañana, tarde, noche)
- Mostrar por cada celda:
  - Horario (rango de horas)
  - Plazas disponibles
  - Botón de inscripción

**Estructura HTML esperada:**
```
<div class="schedule-grid">
  <div class="schedule-date-group">
    <h3>1 de febrero de 2026</h3>
    <div class="schedule-row">
      <div class="schedule-slot manana">
        <!-- Sesión de mañana -->
      </div>
      <div class="schedule-slot tarde">
        <!-- Sesión de tarde -->
      </div>
      <div class="schedule-slot noche">
        <!-- Sesión de noche -->
      </div>
    </div>
  </div>
  <!-- ... más fechas ... -->
</div>
```

### 3. Actualizar DetailComponent
**Cambios:**
- Mantener la estructura actual
- Después de los detalles básicos, agregar el ScheduleGridComponent
- Pasar las sesiones al nuevo componente
- Eliminar o revisar el campo "Horario" individual

## Estilos CSS Requeridos

```css
.schedule-grid { /* Container principal */ }
.schedule-date-group { /* Grupo por fecha */ }
.schedule-date-group h3 { /* Título de fecha */ }
.schedule-row { /* Fila con 3 columnas */ }
.schedule-slot { /* Celda de franja horaria */ }
.schedule-slot.manana { /* Estilos para mañana */ }
.schedule-slot.tarde { /* Estilos para tarde */ }
.schedule-slot.noche { /* Estilos para noche */ }
.schedule-info { /* Info dentro de celda */ }
.schedule-time { /* Hora */ }
.schedule-spots { /* Plazas */ }
.schedule-button { /* Botón inscripción */ }
```

## Pasos de Implementación

1. **Actualizar datos mock** en `activities.json` con sesiones
2. **Crear ScheduleService** con métodos de agrupación
3. **Crear ScheduleGridComponent** con renderizado
4. **Integrar en DetailComponent**
5. **Agregar estilos CSS**
6. **Implementar lógica de inscripción por sesión**
7. **Pruebas y validación**

## Consideraciones Técnicas

- **Fechas:** Usar ISO format (YYYY-MM-DD) para consistencia
- **Franjas horarias:** Definir límites claros (mañana: 06-12, tarde: 12-20, noche: 20-06)
- **Vacío:** Mostrar celdas vacías si no hay sesión en esa franja
- **Responsive:** Grid flexible que se adapte a móvil
- **Seguridad:** Validar entrada y escapar HTML
- **Performance:** Cachear agrupaciones si es necesario

## Mockup Visual (Texto)

```
┌─────────────────────────────────────────────┐
│ ← Volver a resultados                       │
├─────────────────────────────────────────────┤
│ [Imagen]  Yoga Matutino                     │
│           Centro Cívico Bizán               │
│           Descripción...                    │
│           👥 20 plazas totales              │
├─────────────────────────────────────────────┤
│ = HORARIOS DISPONIBLES =                    │
│                                             │
│ 1 de febrero de 2026                        │
│ ┌──────────┬──────────┬──────────┐          │
│ │ MAÑANA   │ TARDE    │ NOCHE    │          │
│ ├──────────┼──────────┼──────────┤          │
│ │ 09:00    │(vacío)   │(vacío)   │          │
│ │-10:00    │          │          │          │
│ │ 5/20 pl. │          │          │          │
│ │[Inscrib] │          │          │          │
│ └──────────┴──────────┴──────────┘          │
│                                             │
│ 2 de febrero de 2026                        │
│ ┌──────────┬──────────┬──────────┐          │
│ │ MAÑANA   │ TARDE    │ NOCHE    │          │
│ ├──────────┼──────────┼──────────┤          │
│ │ 09:00    │ 16:00    │(vacío)   │          │
│ │-10:00    │-18:00    │          │          │
│ │ 5/20 pl. │ 0/15 pl. │          │          │
│ │[Inscrib] │ [Completa]│         │          │
│ └──────────┴──────────┴──────────┘          │
```

## Archivos a Modificar/Crear

### Nuevos:
- `src/services/ScheduleService.js`
- `src/components/ScheduleGridComponent.js`

### Modificar:
- `src/mocks/activities.json` (extender con sesiones)
- `src/components/DetailComponent.js` (integrar ScheduleGridComponent)
- `src/styles.css` (agregar estilos del grid)

### Nota:
- El `router.js` no requiere cambios
- El `store.js` puede necesitar ajustes si se requiere persistencia de inscripción por sesión
