# IoT Environmental Monitoring System

**Technical Documentation v2.0**

This project is a modular, high-performance IoT platform designed for real-time acquisition, storage, and visualization of environmental sensor data. It employs a microservices-oriented architecture orchestrated via Docker.

---

## 🏗️ System Architecture & Infrastructure

The entire stack is containerized and managed via `docker-compose`.

### Core Services

1.  **Ingestion & Messaging Layer**
    -   **Eclipse Mosquitto**: MQTT Message Broker (v5). Handles high-throughput sensor telemetry.
    -   **Port exposed**: `1883` (Internal/External).

2.  **Backend Services**
    -   **Runtime**: Node.js with **Fastify** framework (Low overhead, high concurrency).
    -   **ORM**: **Drizzle ORM** for type-safe database interactions.
    -   **Protocol Handling**: Custom MQTT Message Handler with buffering and batch processing to minimize I/O spikes.
    -   **Real-time**: Socket.io server broadcasting validated telemetry to frontend clients.

3.  **Persistence Layer**
    -   **TimescaleDB**: PostgreSQL extension optimized for time-series data handling (Hyperchunks, compression).
    -   **Volume**: Persistent storage for historical metrics (`/var/lib/postgresql/data`).

4.  **Frontend Interface**
    -   **Framework**: **Nuxt 3** (Vue 3 + Vite).
    -   **Visualization**: Chart.js for high-performance rendering of historical datasets.
    -   **State**: Real-time hydration via Websockets.

5.  **Gateway / Proxy**
    -   **Nginx**: Reverse proxy routing traffic to appropriate containers.
    -   **Routing**:
        -   `/` → Frontend Container (Port 3000)
        -   `/api/*` → Backend Container (Port 3001)
        -   `/socket.io/*` → Backend Container (Websocket Upgrade)

---

## � Communication Protocol (MQTT)

The system enforces a strict **Hardware-Aware** topic structure to ensure traceability of data sources. Legacy unstructured topics are no longer supported.

### Topic Structure

Devices must publish telemetry to the following topic format:

```
<module_id>/<hardware_id>/<sensor_type>
```

| Component | Description | Example |
|-----------|-------------|---------|
| `module_id` | Logical grouping ID (e.g. zone or unit name) | `growbox_01` |
| `hardware_id` | Physical sensor identifier (Model or Unique ID) | `dht22`, `bme280`, `sps30` |
| `sensor_type` | Measurement type (must match registry definitions) | `temperature`, `humidity`, `pm25` |

### Payload Specification

-   **Format**: Plain Float / Numeric String.
-   **Example**: `24.5`

### Complete Example

Publishing a temperature reading from a DHT22 sensor located in "GrowBox A":

**Topic**: `growbox_a/dht22/temperature`
**Payload**: `23.4`

### Advanced: JSON Payload

For bulk updates from a single hardware unit, the following format is supported:

**Topic**: `growbox_a/dht22/measurement`
**Payload**: `{"temperature": 23.4, "humidity": 60.1}`

---

## 🔌 Hardware Integration Guide

To integrate a new microcontroller (ESP32, STM32, etc.):

1.  **Network Configuration**:
    -   Connect to the local network.
    -   Point MQTT Client to the generic Broker Server IP.
    -   Port: `1883`.

2.  **Firmware Logic**:
    -   Implement a standard MQTT Client (e.g. `PubSubClient` for Arduino/PlatformIO).
    -   Publish measurements periodically (Recommended interval: 5s - 60s).
    -   **Important**: Ensure `hardware_id` in the topic matches the physical sensor model to allow automatic configuration mapping in the frontend.
    -   **Configuration**: The device should subscribe to `+/+/config` to receive interval updates (JSON: `{"sensor_type": interval_sec}`).

3.  **Automatic Discovery**:
    -   The backend automatically registers new `<module_id>` and `<hardware_id>` combinations upon receiving the first valid message.

## 🔄 Data Normalization & Legacy Support

To ensure a seamless transition from legacy firmware:
-   **Ingestion**: Strictly requires `module/hardware/measurement` format. Old `module/measurement` topics (without hardware ID) are rejected/ignored by the broker or handler.
-   **History**: The Backend API automatically detects historical data recorded before the "Hardware-Aware" update (missing `hardware_id`). It maps these legacy records to standard default hardware (e.g., `co2` → `mhz14a:co2`) to present a unified, continuous graph without duplicates.

---

## 🚀 Deployment

The system is designed for "One-Click" deployment using Docker Compose.

```bash
# Start the full stack in detached mode
docker-compose up -d

# View logs via PM2-style log aggregation (if configured) or Docker
docker-compose logs -f
```

### Environment Variables (.env)
Ensure the `.env` file is configured with valid credentials for Postgres/TimescaleDB before startup.
