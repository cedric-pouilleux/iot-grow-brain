# IoT Backend

Modern, scalable backend for the IoT Dashboard, built with **Fastify**, **TypeScript**, and **TimescaleDB**.

## 🚀 Tech Stack
- **Framework**: [Fastify](https://www.fastify.io/) (v5)
- **Language**: TypeScript
- **Validation**: [Zod](https://zod.dev/)
- **Documentation**: OpenAPI / Swagger (Auto-generated)
- **Database**: PostgreSQL + TimescaleDB
- **Real-time**: Socket.IO + MQTT

## 🛠️ Setup & Run

### Prerequisites
- Node.js 20+
- PostgreSQL with TimescaleDB extension
- MQTT Broker (Mosquitto)

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Server will start at `http://localhost:3001`.
API Documentation available at `http://localhost:3001/documentation`.

### Build & Start
```bash
npm run build
npm start
```

## 📂 Architecture
The project follows a modular architecture:

- **`src/app.ts`**: Application factory and plugin registration.
- **`src/plugins/`**: Core infrastructure (Database, MQTT, Socket.IO).
- **`src/modules/`**: Feature-based modules.
    - **`devices`**: Module management and configuration.
    - **`system`**: System metrics and database stats.

## 📜 History / Changelog

### [Refactor] Migration to TypeScript & Fastify (Nov 2025)
*Summary for AI Context:*
- **Migration**: Converted entire backend from Express/JS to Fastify/TS.
- **Validation**: Replaced manual validation with Zod schemas.
- **MQTT**: Implemented buffering (batch inserts) for high-throughput sensor data.
- **API**: Standardized API responses and added Swagger documentation.
- **Cleanup**: Removed all legacy `.js` files and monolithic `api.js` routes.
