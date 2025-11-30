-- ============================================
-- Migration Execution Script
-- Run this after 001_optimize_schema.sql
-- ============================================

-- Step 1: Migrate existing measurements (in batches to avoid locks)
DO $$
DECLARE
  total_migrated INTEGER := 0;
  batch_result INTEGER;
BEGIN
  RAISE NOTICE 'Starting measurements migration...';
  
  LOOP
    SELECT migrate_measurements_batch(10000) INTO batch_result;
    total_migrated := total_migrated + batch_result;
    
    EXIT WHEN batch_result = 0;
    
    RAISE NOTICE 'Migrated % rows (total: %)', batch_result, total_migrated;
    PERFORM pg_sleep(0.1); -- Small pause to avoid overwhelming the DB
  END LOOP;
  
  RAISE NOTICE 'Measurements migration complete: % total rows', total_migrated;
END $$;

-- Step 2: Migrate device status to normalized tables
DO $$
DECLARE
  rows_migrated INTEGER;
BEGIN
  RAISE NOTICE 'Starting device status migration...';
  
  SELECT migrate_device_status() INTO rows_migrated;
  
  RAISE NOTICE 'Device status migration complete: % devices', rows_migrated;
END $$;

-- Step 3: Refresh continuous aggregates with existing data
CALL refresh_continuous_aggregate('measurements_hourly', NULL, NULL);
CALL refresh_continuous_aggregate('measurements_daily', NULL, NULL);

RAISE NOTICE 'Continuous aggregates refreshed';

-- Step 4: Verify migration
DO $$
DECLARE
  old_count BIGINT;
  new_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO old_count FROM measurements WHERE topic LIKE '%/sensors/%';
  SELECT COUNT(*) INTO new_count FROM measurements_new;
  
  RAISE NOTICE 'Old measurements table: % rows', old_count;
  RAISE NOTICE 'New measurements table: % rows', new_count;
  
  IF new_count >= old_count * 0.95 THEN
    RAISE NOTICE '✓ Migration successful (%.1f%% migrated)', (new_count::numeric / old_count * 100);
  ELSE
    RAISE WARNING '⚠ Migration incomplete (only %.1f%% migrated)', (new_count::numeric / old_count * 100);
  END IF;
END $$;

-- Step 5: Show compression and size stats
SELECT * FROM compression_stats LIMIT 10;
SELECT * FROM table_sizes WHERE tablename LIKE 'measurements%' OR tablename LIKE 'device%';
