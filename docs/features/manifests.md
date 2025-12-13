# Module Manifests

Les manifests définissent la structure et les capacités de chaque type de module.

## Structure

```json
{
  "id": "air-quality",
  "name": "Qualité d'air",
  "version": "1.0.0",
  "hardware": [...],
  "sensors": [...],
  "actions": [...]
}
```

## Hardware

Définit les composants physiques et leurs sensors associés.

```json
{
  "key": "sps30",
  "name": "SPS30",
  "type": "sensor",
  "sensors": ["pm1", "pm25", "pm4", "pm10"]
}
```

| Champ | Description |
|-------|-------------|
| `key` | Identifiant unique (snake_case) |
| `name` | Nom affiché |
| `type` | `sensor` ou `actuator` |
| `sensors` | Liste des clés de sensors |

## Sensors

Définit les mesures avec labels, unités et ranges de validation.

```json
{
  "key": "temperature",
  "label": "Température",
  "unit": "°C",
  "range": [-40, 85]
}
```

| Champ | Description |
|-------|-------------|
| `key` | Identifiant unique (utilisé dans MQTT) |
| `label` | Label affiché en UI |
| `unit` | Unité de mesure |
| `range` | [min, max] pour validation |

## Actions

Définit les actions disponibles pour ce type de module.

```json
{
  "id": "reset",
  "label": "Redémarrer",
  "icon": "refresh",
  "scope": "hardware"
}
```

| Champ | Description |
|-------|-------------|
| `id` | Identifiant de l'action |
| `label` | Label du bouton |
| `icon` | Icône Tabler (sans préfixe) |
| `scope` | `sensor`, `hardware`, ou `device` |

## API

```http
GET /api/modules/types
→ [{ id, name, version }]

GET /api/modules/types/air-quality/manifest
→ { id, name, version, hardware, sensors, actions }
```

## Ajouter un nouveau type

1. Créer `backend/src/modules/{type}/manifest.json`
2. Redémarrer le backend
3. Le manifest est automatiquement chargé par `registry.loadAll()`

## Exemple complet

Voir `backend/src/modules/air-quality/manifest.json`
