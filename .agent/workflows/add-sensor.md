---
description: How to add a new sensor to the IoT system
---

# Ajouter un nouveau capteur au système IoT

Ce guide explique les étapes nécessaires pour ajouter un nouveau type de capteur, depuis l'ESP32 jusqu'à l'affichage frontend.

## Vue d'ensemble

```
ESP32 → MQTT → Backend → API → Frontend
```

L'architecture est **dynamique** : les capteurs sont enregistrés dans un **Registry** centralisé.

---

## Étapes

### 1. ESP32 : Publier les données MQTT

Sur l'ESP32, publiez les mesures sur le topic :

```
{module_id}/{sensor_key}
```

**Exemple** pour un capteur de luminosité (`lux`) :
```cpp
mqttClient.publish("croissance/lux", "1250");
```

⚠️ Le `sensor_key` doit être **unique** et **en minuscules**.

---

### 2. Frontend : Enregistrer le capteur

#### 2.1. Définir la plage (range) dans `sensors.ts`

**Fichier** : `nuxt-app/app/features/modules/common/config/sensors.ts`

```typescript
export const sensorRanges: Record<string, SensorRange> = {
  // ... capteurs existants ...
  
  // Nouveau capteur luminosité
  lux: { min: 0, max: 100000 },
}
```

#### 2.2. Enregistrer dans le SensorRegistry

**Fichier** : `nuxt-app/app/features/modules/common/config/registerStandardSensors.ts`

```typescript
// Luminosité
sensorRegistry.register({
  key: 'lux',
  label: 'Luminosité',
  unit: 'lx',
  range: [sensorRanges.lux.min, sensorRanges.lux.max],
  type: 'weather'  // 'pm' | 'gas' | 'weather' | 'other'
})
```

---

### 3. Frontend : Ajouter aux groupes de capteurs

**Fichier** : `nuxt-app/app/features/modules/benchmark-module-sensor/components/BenchModulePanel.vue`

Ajoutez le capteur dans `sensorGroupsDefinition` :

```typescript
const sensorGroupsDefinition = [
  // ... groupes existants ...
  
  // Nouveau groupe ou ajout à un groupe existant
  {
    type: 'light',
    label: 'Luminosité',
    color: 'amber',  // emerald, orange, blue, violet, pink, cyan, amber
    keys: ['lux']
  },
]
```

---

### 4. Backend : Enregistrer le capteur

**Fichier** : `backend/src/modules/mqtt/mqttService.ts`

Le capteur doit être ajouté au `SensorDefinition` du backend pour être reconnu :

```typescript
// Dans registerSensors() ou équivalent
registry.registerSensor({
  type: 'lux',
  model: 'BH1750',
  capabilities: ['lux']
})
```

---

## Récapitulatif des fichiers à modifier

| Étape | Fichier | Action |
|-------|---------|--------|
| Range | `config/sensors.ts` | Ajouter min/max |
| Registry | `config/registerStandardSensors.ts` | Appeler `sensorRegistry.register()` |
| UI | `BenchModulePanel.vue` | Ajouter aux groupes |
| Backend | `mqtt/mqttService.ts` | Enregistrer le capteur |

---

## Types de capteurs

| Type | Couleur suggérée | Exemples |
|------|------------------|----------|
| `weather` | orange, blue, cyan | temp, humidity, pressure |
| `gas` | emerald, pink | co2, voc, co |
| `pm` | violet | pm1, pm25, pm4, pm10 |
| `other` | gray | lux, uv, etc. |

---

## Seuils d'alerte (optionnel)

Pour ajouter des seuils d'alerte colorés sur les graphiques :

**Fichier** : `nuxt-app/app/features/modules/common/card/composables/useThresholds.ts`

```typescript
const THRESHOLDS = {
  // ... existants ...
  lux: { good: 500, moderate: 1000, poor: 2000 }
}
```
