# Architecture Modulaire IoT

> **Important** : Cette documentation doit être mise à jour à chaque modification de l'architecture.

## Vue d'ensemble

Le système utilise une **architecture plugin-based** permettant d'ajouter facilement de nouveaux types de modules (air-quality, lighting, irrigation, etc.) sans modifier le code core.

```
┌─────────────────────────────────────────────────────────────┐
│                         ZONES                               │
│  Lieux physiques regroupant des devices                     │
│  Ex: "Chambre 1", "Serre A"                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Device    │     │   Device    │     │   Device    │
│  esp32-01   │     │  esp32-02   │     │  esp32-03   │
│ air-quality │     │  lighting   │     │ irrigation  │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              MODULE MANIFEST (air-quality)                  │
│  Définit: hardware, sensors, actions, ranges de validation  │
└─────────────────────────────────────────────────────────────┘
```

## Nomenclature

| Terme | Description | Exemple |
|-------|-------------|---------|
| **Zone** | Lieu physique | "Chambre 1", "Serre A" |
| **Device** | ESP32 physique | `esp32-chambre1` |
| **Module Type** | Type de plugin | `air-quality`, `lighting` |
| **Manifest** | Définition d'un module type | `manifest.json` |
| **Sensor** | Capteur individuel | `co2`, `temperature` |
| **Hardware** | Composant physique | `DHT22`, `SPS30` |

## Structure des fichiers

```
backend/
├── src/
│   ├── core/
│   │   ├── types/
│   │   │   └── module.ts       # Types: ModuleManifest, SensorDef...
│   │   └── registry.ts         # Chargeur de manifests
│   │
│   ├── modules/
│   │   ├── air-quality/
│   │   │   └── manifest.json   # Définition air-quality
│   │   ├── devices/            # Routes devices
│   │   ├── zones/              # Routes zones CRUD
│   │   └── module-types/       # API manifests
│   │
│   └── db/
│       └── schema.ts           # Tables: zones, devices
│
nuxt-app/
├── app/
│   ├── composables/
│   │   └── useModuleRegistry.ts  # Accès aux manifests
│   └── pages/
│       └── zones.vue             # Gestion des zones
```

## Module Manifest

Chaque type de module est défini par un fichier `manifest.json` :

```json
{
  "id": "air-quality",
  "name": "Qualité d'air",
  "version": "1.0.0",
  
  "hardware": [
    { "key": "dht22", "name": "DHT22", "type": "sensor", "sensors": ["temperature", "humidity"] },
    { "key": "sps30", "name": "SPS30", "type": "sensor", "sensors": ["pm1", "pm25", "pm4", "pm10"] }
  ],
  
  "sensors": [
    { "key": "temperature", "label": "Température", "unit": "°C", "range": [-40, 85] },
    { "key": "pm25", "label": "PM2.5", "unit": "µg/m³", "range": [0, 10000] }
  ],
  
  "actions": [
    { "id": "reset", "label": "Redémarrer", "icon": "refresh", "scope": "hardware" }
  ]
}
```

### Utilisation du Manifest

**Backend** - Validation des mesures :
```typescript
// Les ranges sont lues depuis le manifest
const range = registry.getValidationRange('temperature')
// { min: -40, max: 85 }
```

**Frontend** - Labels et unités :
```typescript
const { getSensorLabel, getSensorUnit } = useModuleRegistry()
getSensorLabel('temperature')  // "Température"
getSensorUnit('temperature')   // "°C"
```

## API Endpoints

### Module Types (Manifests)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/modules/types` | Liste des types disponibles |
| GET | `/api/modules/types/:type/manifest` | Manifest complet |

### Zones

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zones` | Liste des zones |
| GET | `/api/zones/:id` | Zone avec ses devices |
| POST | `/api/zones` | Créer une zone |
| PUT | `/api/zones/:id` | Modifier une zone |
| DELETE | `/api/zones/:id` | Supprimer une zone |
| POST | `/api/zones/:id/devices/:deviceId` | Assigner un device |

## Base de données

```sql
-- Zones (lieux physiques)
zones (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ
)

-- Devices (colonnes ajoutées à device_system_status)
device_system_status (
  module_id TEXT PRIMARY KEY,
  name TEXT,                 -- Nom affiché
  module_type TEXT,          -- "air-quality", "lighting"...
  zone_id UUID → zones(id),  -- Zone assignée
  ...
)
```

## Ajouter un nouveau Module Type

1. **Créer le manifest** :
   ```
   backend/src/modules/lighting/manifest.json
   ```

2. **Définir hardware, sensors, actions** dans le JSON

3. **Redémarrer le backend** - Le registry charge automatiquement les manifests

4. **Le frontend utilise le manifest** via `useModuleRegistry`

## Frontend Composable

```typescript
const { 
  loadManifest,      // Charger un manifest
  getHardware,       // Hardware d'un type
  getSensors,        // Sensors d'un type
  getSensorLabel,    // Label d'un sensor
  getSensorUnit      // Unité d'un sensor
} = useModuleRegistry()

// Charger le manifest air-quality
await loadManifest('air-quality')

// Utiliser les définitions
const hardware = getHardware('air-quality')
// [{ key: 'dht22', name: 'DHT22', sensors: [...] }, ...]
```

## Bonnes pratiques

1. **Toujours définir les ranges** dans le manifest pour la validation
2. **Utiliser des clés uniques** pour sensors et hardware
3. **Documenter les actions** disponibles avec icon et scope
4. **Mettre à jour cette doc** à chaque modification d'architecture
