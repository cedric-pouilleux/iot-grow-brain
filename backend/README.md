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

## Development

```bash
npm run dev
```

The server will start on `http://localhost:3001`.

### API Documentation (Swagger)

The API documentation is automatically generated and available at:
- **Swagger UI**: `http://localhost:3001/documentation`
- **OpenAPI JSON**: `http://localhost:3001/documentation/json`

You can use the Swagger UI to:
- Browse all available endpoints
- Test API calls directly from the browser
- View request/response schemas
- Download the OpenAPI specification

### Frontend Type Generation

The frontend uses [Orval](https://orval.dev/) to generate a type-safe API client from the OpenAPI specification.

To regenerate types after backend changes:

```bash
cd ../nuxt-app
npm run gen:api
```

This will:
1. Fetch the OpenAPI spec from the running backend
2. Generate TypeScript types in `app/utils/model/`
3. Generate API client functions in `app/utils/api.ts`

> **Note**: The backend must be running for type generation to work.

### Build & Start

```bash
npm run build
npm start
```

## Database Optimization

The backend includes an optimized TimescaleDB schema for better performance and storage efficiency.

### Benefits

- **90% storage reduction** with compression
- **10x faster queries** with continuous aggregates
- **Automatic data retention** (1 year)
- **Normalized schema** for better performance

### Running the Migration

**Windows PowerShell:**
```powershell
cd backend
.\migrate-database.bat
```

**Linux/Mac:**
```bash
cd backend
chmod +x migrate-database.sh
./migrate-database.sh
```

The migration script will:
1. Create a backup of your database
2. Create optimized tables with TimescaleDB hypertables
3. Migrate existing data
4. Enable compression and retention policies
5. Create continuous aggregates for fast queries
6. Show migration results and statistics

**Manual migration:**
```bash
psql -h localhost -U postgres -d iot_data -f migrations/001_optimize_schema.sql
psql -h localhost -U postgres -d iot_data -f migrations/002_run_migration.sql
```

See [migrations/README.md](migrations/README.md) for detailed documentation.

### After Migration

Update the backend code to use the optimized schema:

```bash
# Replace old files with optimized versions
mv src/plugins/mqtt.ts src/plugins/mqtt-old.ts
mv src/plugins/mqtt-optimized.ts src/plugins/mqtt.ts

mv src/modules/devices/routes.ts src/modules/devices/routes-old.ts
mv src/modules/devices/routes-optimized.ts src/modules/devices/routes.ts

# Restart backend
npm run dev
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
