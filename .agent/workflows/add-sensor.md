---
description: How to add a new sensor to the IoT system
---

# Adding a New Sensor

This workflow documents all files that need to be modified when adding a new sensor type.

## 1. ESP32 Firmware

### 1.1 Configuration
- [ ] `include/SensorData.h` - Add interval variable (e.g., `unsigned long coInterval = 60000;`)

### 1.2 Sensor Reading
- [ ] `include/SensorReader.h` - Add method declarations (`initXXX()`, `readXXX()`, `resetXXXBuffer()`)
- [ ] `src/SensorReader.cpp` - Implement reading logic

### 1.3 Controller
- [ ] `include/AppController.h` - Add state variables (`lastXxxValue`, `statusXxx`, `errXxx`, `lastXxxReadTime`)
- [ ] `src/AppController.cpp`:
  - Add `handleXXX()` method
  - Initialize timer in `initSensors()`
  - Call handler in loop (via `main.cpp`)
  - Update `publishSensorStatus()` calls with new params

### 1.4 Status Publishing
- [ ] `include/StatusPublisher.h` - Add params to `publishSensorStatus()` and `buildSensorStatusJson()`
- [ ] `src/StatusPublisher.cpp`:
  - Add sensor to JSON in `buildSensorStatusJson()`
  - Add sensor model to `publishSensorConfig()`

### 1.5 Main
- [ ] `src/main.cpp` - Add `app.handleXXX()` call in loop

## 2. Backend

- [ ] `src/modules/air-quality/manifest.json`:
  - Add hardware entry in `hardware` array
  - Add sensor entry in `sensors` array with key, label, unit, range

> **Important:** Restart backend after modifying manifest.json

## 3. Frontend

### 3.1 Types
- [ ] `app/types/index.ts` - Add sensor to `SensorData` and `DashboardSensorData` interfaces

### 3.2 Panel Configuration
- [ ] `app/components/ModulePanel.vue`:
  - Add to `sensorGroupsDefinition` (type, label, color, keys)
  - Add to `sensorData` default in props
  - Add to `sensorHistoryMap` computed
  - Add to `getSensorHistory` map

### 3.3 Options Panel
- [ ] `app/components/ModuleOptionsPanel.vue` - Add to `HARDWARE_SENSORS` array

### 3.4 Sensor List
- [ ] `app/constants/sensors.ts` - Add to `SENSOR_LIST` (key, label, color)

### 3.5 Thresholds
- [ ] `app/composables/useThresholds.ts` - Add threshold definition if applicable

### 3.6 Card Colors (if new color)
- [ ] `app/components/UnifiedSensorCard.vue`:
  - Add to `colorMap` (hex value)
  - Add to `valueColorClass` (Tailwind class)

## 4. Verification

// turbo
```bash
cd air-quality-esp32 && pio run
```

Check:
- [ ] Firmware compiles without errors
- [ ] Card appears in dashboard (status "missing" is OK without physical sensor)
- [ ] Sensor appears in options panel
