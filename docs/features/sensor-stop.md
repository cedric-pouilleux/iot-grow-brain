# Sensor Stop Feature

Permet de mettre en pause/arrêter un capteur hardware depuis l'interface utilisateur. Le capteur arrêté ne collecte plus de données et son état persiste après redémarrage de l'ESP32.

## Architecture

```
┌─────────────┐    MQTT /sensors/enable    ┌─────────────┐
│   Frontend  │  ───────────────────────►  │    ESP32    │
│   (Nuxt)    │                            │  Firmware   │
└─────────────┘                            └─────────────┘
       │                                          │
       │ API POST                     status: "disabled"
       │ /hardware/enable              MQTT /sensors/status
       ▼                                          │
┌─────────────┐                                   │
│   Backend   │  ◄────────────────────────────────┘
│  (Fastify)  │
└─────────────┘
```

## Flux détaillé

### 1. UI → Backend → ESP32 (Commande)

1. **Frontend** (`HardwareSensorRow.vue`) : L'utilisateur clique sur le bouton stop/play
2. **API Call** : `POST /api/modules/:id/hardware/enable`
   ```json
   { "hardware": "dht22", "enabled": false }
   ```
3. **Backend** (`DeviceController.enableHardware`) : Publie sur MQTT
   - Topic: `{moduleId}/sensors/enable`
   - Payload: `{ "hardware": "dht22", "enabled": false }`
4. **ESP32** (`MqttHandler.handleEnableMessage`) :
   - Met à jour `sensorConfig.dht22Enabled = false`
   - Persiste dans la flash via `Preferences`

### 2. ESP32 → Backend → Frontend (Status)

1. **ESP32** (`AppController.handleSystemStatus`) :
   - Calcule les status effectifs pour chaque capteur
   - Si `!sensorConfig.dht22Enabled` → status = `"disabled"`
   - Publie sur `/sensors/status` avec clés composites

2. **Status JSON** (`StatusPublisher.cpp`) :
   ```json
   {
     "dht22:temperature": { "status": "disabled", "value": null },
     "dht22:humidity": { "status": "disabled", "value": null },
     "sht40:temperature": { "status": "ok", "value": 23.5 }
   }
   ```

3. **Frontend** :
   - `BenchModulePanel.vue` : Filtre les groupes où tous sensors sont disabled
   - `UnifiedSensorCard.vue` : Filtre `enabledSensors` pour le dropdown
   - `SensorDetailGraph.vue` : Filtre `enabledSensors` pour les chips

## Clés composites

Chaque capteur est identifié par une clé composite `hardware:sensor` :

| Hardware | Sensors |
|----------|---------|
| `mhz14a` | `mhz14a:co2` |
| `sc16co` | `sc16co:co` |
| `dht22` | `dht22:temperature`, `dht22:humidity` |
| `sht40` | `sht40:temperature`, `sht40:humidity` |
| `bmp280` | `bmp280:temperature`, `bmp280:pressure` |
| `sgp40` | `sgp40:voc` |
| `sgp30` | `sgp30:eco2`, `sgp30:tvoc` |
| `sps30` | `sps30:pm1`, `sps30:pm25`, `sps30:pm4`, `sps30:pm10` |

## Persistance

### ESP32 (Flash)
```cpp
// MqttHandler.cpp
void MqttHandler::saveEnabledState() {
    Preferences prefs;
    prefs.begin("sensors", false);
    prefs.putBool("dht22", _config.dht22Enabled);
    prefs.putBool("sht40", _config.sht40Enabled);
    // ...
    prefs.end();
}
```

L'état est rechargé au démarrage via `loadEnabledState()`.

## UI

### État activé
- Pastille verte ou status normal
- Bouton play (▶) remplacé par stop (⏹)

### État désactivé  
- Pastille rouge carrée
- Slider interval grisé
- Bouton refresh masqué
- Timer masqué
- Card entière masquée si tous les sensors du groupe sont disabled

## Fichiers modifiés

### ESP32
- `include/SensorData.h` : Flags `xxxEnabled` dans `SensorConfig`
- `src/MqttHandler.cpp` : Handler `/sensors/enable`, persistance flash
- `src/AppController.cpp` : Early return si disabled, status effectifs
- `src/StatusPublisher.cpp` : Clés composites dans le JSON
- `src/NetworkManager.cpp` : Subscription au topic

### Backend
- `modules/devices/routes.ts` : Route `POST /hardware/enable`
- `modules/devices/controller.ts` : `enableHardware()` publie sur MQTT
- `modules/devices/schema.ts` : `HardwareEnableSchema`

### Frontend
- `HardwareSensorRow.vue` : Bouton toggle, UI disabled
- `SensorConfigSection.vue` : Calcul `enabled` depuis status
- `UnifiedSensorCard.vue` : `enabledSensors` computed
- `SensorDetailGraph.vue` : `enabledSensors` pour chips
- `BenchModulePanel.vue` : Filtrage des groupes
