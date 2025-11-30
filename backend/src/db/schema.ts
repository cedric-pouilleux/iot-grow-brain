import { pgTable, text, integer, doublePrecision, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';

// --- Devices & Status ---

export const deviceSystemStatus = pgTable('device_system_status', {
    moduleId: text('module_id').primaryKey(),
    ip: text('ip'),
    mac: text('mac'),
    uptimeStart: integer('uptime_start'),
    rssi: integer('rssi'),
    flashUsedKb: integer('flash_used_kb'),
    flashFreeKb: integer('flash_free_kb'),
    flashSystemKb: integer('flash_system_kb'),
    heapTotalKb: integer('heap_total_kb'),
    heapFreeKb: integer('heap_free_kb'),
    heapMinFreeKb: integer('heap_min_free_kb'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const deviceHardware = pgTable('device_hardware', {
    moduleId: text('module_id').primaryKey(),
    chipModel: text('chip_model'),
    chipRev: integer('chip_rev'),
    cpuFreqMhz: integer('cpu_freq_mhz'),
    flashKb: integer('flash_kb'),
    cores: integer('cores'),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// --- Sensors ---

export const sensorStatus = pgTable('sensor_status', {
    moduleId: text('module_id').notNull(),
    sensorType: text('sensor_type').notNull(),
    status: text('status'),
    value: doublePrecision('value'),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.moduleId, table.sensorType] }),
    };
});

export const sensorConfig = pgTable('sensor_config', {
    moduleId: text('module_id').notNull(),
    sensorType: text('sensor_type').notNull(),
    intervalSeconds: integer('interval_seconds'),
    model: text('model'),
    enabled: boolean('enabled').default(true),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.moduleId, table.sensorType] }),
    };
});

// --- Measurements (TimescaleDB) ---

export const measurements = pgTable('measurements', {
    time: timestamp('time').notNull(),
    moduleId: text('module_id').notNull(),
    sensorType: text('sensor_type').notNull(),
    value: doublePrecision('value').notNull(),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.time, table.moduleId, table.sensorType] }),
    };
});

// Continuous Aggregate View (Read-only mostly)
export const measurementsHourly = pgTable('measurements_hourly', {
    bucket: timestamp('bucket').notNull(),
    moduleId: text('module_id').notNull(),
    sensorType: text('sensor_type').notNull(),
    avgValue: doublePrecision('avg_value'),
    minValue: doublePrecision('min_value'),
    maxValue: doublePrecision('max_value'),
    count: integer('count'),
});
