-- ============================================
-- Phase 1: Create Optimized Schema
-- ============================================

-- 1. Create new measurements table with normalized structure
CREATE TABLE IF NOT EXISTS measurements_new (
  time TIMESTAMPTZ NOT NULL,
  module_id TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  metadata JSONB
);

-- 2. Convert to TimescaleDB hypertable (1 day chunks)
SELECT create_hypertable('measurements_new', 'time', 
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- 3. Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_measurements_new_module_sensor_time 
  ON measurements_new (module_id, sensor_type, time DESC);

CREATE INDEX IF NOT EXISTS idx_measurements_new_time 
  ON measurements_new (time DESC);

CREATE INDEX IF NOT EXISTS idx_measurements_new_module_time 
  ON measurements_new (module_id, time DESC);

-- 4. Enable compression (compress after 7 days)
ALTER TABLE measurements_new SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'module_id,sensor_type',
  timescaledb.compress_orderby = 'time DESC'
);

-- 5. Add compression policy
SELECT add_compression_policy('measurements_new', INTERVAL '7 days', if_not_exists => TRUE);

-- 6. Add retention policy (keep 1 year)
SELECT add_retention_policy('measurements_new', INTERVAL '1 year', if_not_exists => TRUE);

-- ============================================
-- Phase 2: Normalize Device Status Tables
-- ============================================

-- 1. Device system status (typed columns)
CREATE TABLE IF NOT EXISTS device_system_status (
  module_id TEXT PRIMARY KEY,
  ip INET,
  mac MACADDR,
  uptime_start BIGINT,
  rssi SMALLINT,
  flash_used_kb INTEGER,
  flash_free_kb INTEGER,
  flash_system_kb INTEGER,
  heap_total_kb INTEGER,
  heap_free_kb INTEGER,
  heap_min_free_kb INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_system_updated 
  ON device_system_status (updated_at DESC);

-- 2. Device hardware info
CREATE TABLE IF NOT EXISTS device_hardware (
  module_id TEXT PRIMARY KEY,
  chip_model TEXT,
  chip_rev SMALLINT,
  cpu_freq_mhz SMALLINT,
  flash_kb INTEGER,
  cores SMALLINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sensor configuration
CREATE TABLE IF NOT EXISTS sensor_config (
  module_id TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  interval_seconds SMALLINT NOT NULL DEFAULT 60,
  model TEXT,
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (module_id, sensor_type)
);

CREATE INDEX IF NOT EXISTS idx_sensor_config_module 
  ON sensor_config (module_id);

-- 4. Sensor status (current values)
CREATE TABLE IF NOT EXISTS sensor_status (
  module_id TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  status TEXT,
  value DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (module_id, sensor_type)
);

-- ============================================
-- Phase 3: Continuous Aggregates
-- ============================================

-- 1. Hourly aggregates for dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS measurements_hourly
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', time) AS bucket,
  module_id,
  sensor_type,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value,
  COUNT(*) as count
FROM measurements_new
GROUP BY bucket, module_id, sensor_type
WITH NO DATA;

-- Refresh policy for hourly aggregates
SELECT add_continuous_aggregate_policy('measurements_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- 2. Daily aggregates for long-term trends
CREATE MATERIALIZED VIEW IF NOT EXISTS measurements_daily
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 day', time) AS bucket,
  module_id,
  sensor_type,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value,
  COUNT(*) as count
FROM measurements_new
GROUP BY bucket, module_id, sensor_type
WITH NO DATA;

-- Refresh policy for daily aggregates
SELECT add_continuous_aggregate_policy('measurements_daily',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- ============================================
-- Phase 4: Migration Helper Functions
-- ============================================

-- Function to migrate old measurements to new schema
CREATE OR REPLACE FUNCTION migrate_measurements_batch(batch_size INTEGER DEFAULT 10000)
RETURNS INTEGER AS $$
DECLARE
  rows_migrated INTEGER;
BEGIN
  WITH batch AS (
    SELECT time, topic, value, metadata
    FROM measurements
    WHERE NOT EXISTS (
      SELECT 1 FROM measurements_new mn
      WHERE mn.time = measurements.time 
        AND mn.module_id || '/sensors/' || mn.sensor_type = measurements.topic
    )
    LIMIT batch_size
  ),
  inserted AS (
    INSERT INTO measurements_new (time, module_id, sensor_type, value, metadata)
    SELECT 
      time,
      split_part(topic, '/sensors/', 1) as module_id,
      split_part(split_part(topic, '/sensors/', 2), '/', 1) as sensor_type,
      value,
      metadata
    FROM batch
    WHERE topic LIKE '%/sensors/%'
      AND value IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO rows_migrated FROM inserted;
  
  RETURN rows_migrated;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate device_status to normalized tables
CREATE OR REPLACE FUNCTION migrate_device_status()
RETURNS INTEGER AS $$
DECLARE
  device_record RECORD;
  rows_migrated INTEGER := 0;
BEGIN
  FOR device_record IN 
    SELECT module_id, status_data 
    FROM device_status 
    WHERE status_data IS NOT NULL
  LOOP
    -- Migrate system status
    IF device_record.status_data ? 'system' THEN
      INSERT INTO device_system_status (
        module_id, ip, mac, uptime_start, rssi,
        flash_used_kb, flash_free_kb, flash_system_kb,
        heap_total_kb, heap_free_kb, heap_min_free_kb
      )
      VALUES (
        device_record.module_id,
        (device_record.status_data->'system'->>'ip')::INET,
        (device_record.status_data->'system'->>'mac')::MACADDR,
        (device_record.status_data->'system'->>'uptime_start')::BIGINT,
        (device_record.status_data->'system'->>'rssi')::SMALLINT,
        (device_record.status_data->'system'->'flash'->>'used_kb')::INTEGER,
        (device_record.status_data->'system'->'flash'->>'free_kb')::INTEGER,
        (device_record.status_data->'system'->'flash'->>'system_kb')::INTEGER,
        (device_record.status_data->'system'->'memory'->>'heap_total_kb')::INTEGER,
        (device_record.status_data->'system'->'memory'->>'heap_free_kb')::INTEGER,
        (device_record.status_data->'system'->'memory'->>'heap_min_free_kb')::INTEGER
      )
      ON CONFLICT (module_id) DO UPDATE SET
        ip = EXCLUDED.ip,
        mac = EXCLUDED.mac,
        uptime_start = EXCLUDED.uptime_start,
        rssi = EXCLUDED.rssi,
        flash_used_kb = EXCLUDED.flash_used_kb,
        flash_free_kb = EXCLUDED.flash_free_kb,
        flash_system_kb = EXCLUDED.flash_system_kb,
        heap_total_kb = EXCLUDED.heap_total_kb,
        heap_free_kb = EXCLUDED.heap_free_kb,
        heap_min_free_kb = EXCLUDED.heap_min_free_kb,
        updated_at = NOW();
    END IF;

    -- Migrate hardware info
    IF device_record.status_data ? 'hardware' THEN
      INSERT INTO device_hardware (
        module_id, chip_model, chip_rev, cpu_freq_mhz, flash_kb, cores
      )
      VALUES (
        device_record.module_id,
        device_record.status_data->'hardware'->'chip'->>'model',
        (device_record.status_data->'hardware'->'chip'->>'rev')::SMALLINT,
        (device_record.status_data->'hardware'->'chip'->>'cpu_freq_mhz')::SMALLINT,
        (device_record.status_data->'hardware'->'chip'->>'flash_kb')::INTEGER,
        (device_record.status_data->'hardware'->'chip'->>'cores')::SMALLINT
      )
      ON CONFLICT (module_id) DO UPDATE SET
        chip_model = EXCLUDED.chip_model,
        chip_rev = EXCLUDED.chip_rev,
        cpu_freq_mhz = EXCLUDED.cpu_freq_mhz,
        flash_kb = EXCLUDED.flash_kb,
        cores = EXCLUDED.cores,
        updated_at = NOW();
    END IF;

    rows_migrated := rows_migrated + 1;
  END LOOP;

  RETURN rows_migrated;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Phase 5: Monitoring Views
-- ============================================

-- View to check compression status
CREATE OR REPLACE VIEW compression_stats AS
SELECT 
  format('%I.%I', chunk_schema, chunk_name) as chunk,
  pg_size_pretty(before_compression_total_bytes) as before_compression,
  pg_size_pretty(after_compression_total_bytes) as after_compression,
  ROUND(100 - (after_compression_total_bytes::numeric / 
    NULLIF(before_compression_total_bytes::numeric, 0) * 100), 2) as compression_ratio_pct
FROM timescaledb_information.compressed_chunk_stats
ORDER BY before_compression_total_bytes DESC;

-- View to check table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
    pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', '_timescaledb_internal')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- Verification Queries
-- ============================================

-- Check if hypertable was created
SELECT * FROM timescaledb_information.hypertables 
WHERE hypertable_name = 'measurements_new';

-- Check compression policy
SELECT * FROM timescaledb_information.jobs 
WHERE proc_name = 'policy_compression';

-- Check retention policy
SELECT * FROM timescaledb_information.jobs 
WHERE proc_name = 'policy_retention';

-- Check continuous aggregates
SELECT * FROM timescaledb_information.continuous_aggregates;
