# Comparativa: Agrupación de Sesiones por Actividad y Centro

## Formato Actual (Estructura Anidada)

Agrupación: **Centro → Actividades → Sesiones**

```json
[
  {
    "center": {
      "id": "centro_1",
      "name": "Centro Cívico La Paz",
      "type": "municipal"
    },
    "activities": [
      {
        "id": 1,
        "title": "Yoga para Principiantes",
        "center": "centro_1",
        "centerName": "Centro Cívico La Paz",
        "description": "...",
        "image": "...",
        "sessions": [
          {
            "id": "session_1",
            "date": "2024-03-15",
            "startTime": "10:00",
            "endTime": "11:00",
            "dayOfWeek": "Friday",
            "timeSlot": "morning",
            "availableSpots": 5,
            "totalSpots": 15
          },
          {
            "id": "session_2",
            "date": "2024-03-22",
            "startTime": "10:00",
            "endTime": "11:00",
            "dayOfWeek": "Friday",
            "availableSpots": 3,
            "totalSpots": 15
          }
        ]
      },
      {
        "id": 2,
        "title": "Pintura al Óleo",
        "sessions": [...]
      }
    ]
  },
  {
    "center": {
      "id": "centro_2",
      "name": "Centro Cívico Norte",
      "type": "municipal"
    },
    "activities": [...]
  }
]
```

## Posible Formato Alternativo 1: Por Actividad Primero

Agrupación: **Actividad → Centros → Sesiones**

```json
[
  {
    "activity": {
      "id": 1,
      "title": "Yoga para Principiantes",
      "description": "...",
      "image": "..."
    },
    "centers": [
      {
        "center": {
          "id": "centro_1",
          "name": "Centro Cívico La Paz",
          "type": "municipal"
        },
        "sessions": [
          {
            "id": "session_1",
            "date": "2024-03-15",
            "startTime": "10:00",
            "endTime": "11:00",
            "dayOfWeek": "Friday",
            "timeSlot": "morning",
            "availableSpots": 5,
            "totalSpots": 15
          }
        ]
      },
      {
        "center": {
          "id": "centro_2",
          "name": "Centro Cívico Norte",
          "type": "municipal"
        },
        "sessions": [...]
      }
    ]
  }
]
```

## Posible Formato Alternativo 2: Estructura Plana con Sesiones

Agrupación: **Solo Sesiones** (sin agrupación por centro/actividad)

```json
[
  {
    "id": "session_1",
    "activityId": 1,
    "activityTitle": "Yoga para Principiantes",
    "centerId": "centro_1",
    "centerName": "Centro Cívico La Paz",
    "date": "2024-03-15",
    "startTime": "10:00",
    "endTime": "11:00",
    "dayOfWeek": "Friday",
    "timeSlot": "morning",
    "availableSpots": 5,
    "totalSpots": 15
  },
  {
    "id": "session_2",
    "activityId": 1,
    "activityTitle": "Yoga para Principiantes",
    "centerId": "centro_1",
    "centerName": "Centro Cívico La Paz",
    "date": "2024-03-22",
    "startTime": "10:00",
    "endTime": "11:00",
    "dayOfWeek": "Friday",
    "availableSpots": 3,
    "totalSpots": 15
  }
]
```

## Posible Formato Alternativo 3: Doble Agrupación (Centro + Actividad Separados)

Agrupación: **Centro → Sesiones (con referencia a Actividad)**

```json
[
  {
    "center": {
      "id": "centro_1",
      "name": "Centro Cívico La Paz",
      "type": "municipal"
    },
    "sessions": [
      {
        "id": "session_1",
        "activityId": 1,
        "activityTitle": "Yoga para Principiantes",
        "date": "2024-03-15",
        "startTime": "10:00",
        "endTime": "11:00",
        "dayOfWeek": "Friday",
        "timeSlot": "morning",
        "availableSpots": 5,
        "totalSpots": 15
      },
      {
        "id": "session_2",
        "activityId": 2,
        "activityTitle": "Pintura al Óleo",
        "date": "2024-03-15",
        "startTime": "15:00",
        "endTime": "17:00",
        "dayOfWeek": "Friday",
        "availableSpots": 2,
        "totalSpots": 8
      }
    ]
  }
]
```

---

## Preguntas para Clarificar

1. **¿Cuál de estos formatos se asemeja más a lo que necesitas?** (Formato Actual, Alt1, Alt2, o Alt3)
2. **¿Cómo se renderizaría en la UI?** (ej: ¿se expanden por centro? ¿por actividad? ¿se muestran todas las sesiones planas?)
3. **¿Hay algún problema específico con el formato actual?** (ej: sesiones duplicadas, actividades mal agrupadas)

Por favor, proporciona un ejemplo JSON de cómo debería verse la salida para que pueda implementar los cambios correctamente.
