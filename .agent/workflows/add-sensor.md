---
description: How to add a new sensor to the IoT system
---

# Ajouter un nouveau capteur au système IoT

## Architecture MQTT

**Nouveau format (recommandé) :**
```
{module_id}/{hardware_id}/{measurement}

Exemples:
croissance/dht22/temperature    → temperature
croissance/dht22/humidity       → humidity
croissance/bmp280/temperature   → temperature_bmp (auto-suffixé)
croissance/bmp280/pressure      → pressure
croissance/sps30/pm25           → pm25
```

**Format legacy (rétrocompatible) :**
```
{module_id}/{sensor_key}

Exemple: croissance/co2
```

---

## Étapes pour ajouter un nouveau capteur

### 1. ESP32 : Publier avec le nouveau format

```cpp
// Nouveau format recommandé
mqttClient.publish("croissance/bh1750/lux", "1250");

// Le backend génère automatiquement la clé appropriée
```

---

### 2. Frontend : Définir la plage

**Fichier** : `config/sensors.ts`

```typescript
export const sensorRanges = {
  lux: { min: 0, max: 100000 },
}
```

---

### 3. Frontend : Enregistrer le hardware

**Fichier** : `config/registerStandardHardware.ts`

```typescript
hardwareRegistry.register({
  id: 'bh1750',
  name: 'BH1750',
  capabilities: ['lux']
})
```

---

### 4. Frontend : Enregistrer la mesure

**Fichier** : `config/registerStandardSensors.ts`

```typescript
sensorRegistry.register({
  key: 'lux',
  label: 'Luminosité',
  unit: 'lx',
  range: [sensorRanges.lux.min, sensorRanges.lux.max],
  type: 'weather',
  sources: ['bh1750']
})
```

---

### 5. Frontend : Ajouter à l'UI

**Fichier** : `BenchModulePanel.vue`

```typescript
const sensorGroupsDefinition = [
  {
    type: 'light',
    label: 'Luminosité',
    color: 'amber',
    keys: ['lux']
  },
]
```

---

## Gestion des conflits

| Cas | Topic MQTT | Clé générée |
|-----|------------|-------------|
| DHT22 temp | `module/dht22/temperature` | `temperature` |
| BMP280 temp | `module/bmp280/temperature` | `temperature_bmp` |
| SHT40 temp | `module/sht40/temperature` | `temperature_sht40` |
| CO2 unique | `module/mhz14a/co2` | `co2` |
