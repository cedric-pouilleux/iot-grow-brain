# Options Panel Feature

## Overview

The **Options Panel** provides centralized access to device information and sensor configuration. It replaces the individual dropdowns that were previously in the module header (Hardware, Network, Storage) and the interval sliders that were in each sensor card.

## Opening the Panel

Click the **gear icon** (⚙️) in the module header, next to the graph duration selector. The panel slides down between the header and sensor cards.

## Panel Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Left: Device Info]            │  [Right: Hardware Sensors]        │
│                                 │                                    │
│  ┌───────────────────────────┐  │  ┌────────────────────────────────┐│
│  │ Hardware                  │  │  │● BMP280  [Pression][Temp] 60s ▓││
│  │ Model: ESP32-D0WDQ6-V3    │  │  │  ↳ il y a 12s                 ││
│  │ CPU: 240 MHz              │  │  │● DHT22   [Temp][Hum]      60s ▓││
│  │ Uptime: 2j 5h 12m         │  │  │  ↳ il y a 8s                  ││
│  └───────────────────────────┘  │  │● SPS30   [PM1][PM2.5]... 120s ▓││
│                                 │  │  ↳ il y a 30s                 ││
│  ┌───────────────────────────┐  │  │○ SGP40   [COV]            60s ▓││
│  │ Network                   │  │  │  ↳ Pas de données             ││
│  │ IP: 192.168.1.73          │  │  └────────────────────────────────┘│
│  │ MAC: 44:1D:64:68:D3:10    │  │                                    │
│  └───────────────────────────┘  │  Legend:                           │
│                                 │  ● = All OK  ◐ = Partial  ○ = Fail │
│  ┌───────────────────────────┐  │                                    │
│  │ Storage                   │  │                                    │
│  │ Flash: ████████░░░░ 67%   │  │                                    │
│  │ RAM:   ██████░░░░░░ 48%   │  │                                    │
│  └───────────────────────────┘  │                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Sensor Configuration

Each **hardware row** displays:
- **Status indicator**: Green (all OK), Yellow (partial), Red (failed)
- **Hardware name**: BMP280, DHT22, SPS30, SGP40, etc.
- **Measurement badges**: Individual status for each measurement
- **Time counter**: Last data received
- **Interval slider**: 10-300s, **shared for all measurements** of this hardware

### Changing an Interval

1. Open the options panel
2. Drag the slider for the desired sensor
3. The change is **automatically saved** after 500ms (debounced)
4. A success toast confirms: "CO2: intervalle 30s"

## Technical Details

### API Endpoint

```
POST /api/modules/{moduleId}/config
Content-Type: application/json

{
  "sensors": {
    "co2": { "interval": 30 }
  }
}
```

### MQTT Message

The backend publishes to `{moduleId}/sensors/config`:

```json
{
  "sensors": {
    "co2": { "interval": 30 }
  }
}
```

### Logging

Interval changes are logged at `success` level:
```
✓ [MQTT] Config sent to esp32air: co2=30s
```

## Related Components

- `ModuleOptionsPanel.vue` - Main panel component
- `SensorIntervalRow.vue` - Individual sensor row with slider
- `ModuleHeader.vue` - Contains the options toggle button
- `ModulePanel.vue` - Orchestrates header, panel, and cards
