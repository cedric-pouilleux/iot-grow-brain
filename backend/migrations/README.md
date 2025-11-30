# Database Migration Guide

## Overview

This migration optimizes the database schema using TimescaleDB features for better performance and storage efficiency.

## Prerequisites

- TimescaleDB extension enabled
- PostgreSQL 14+
- Backup of existing data
- Downtime window (recommended: 30-60 minutes for large datasets)

## Migration Steps

### 1. Backup Current Database

```bash
# Linux/Mac
pg_dump -h localhost -U postgres -d iot_data > backup_$(date +%Y%m%d_%H%M%S).sql

# Windows PowerShell
pg_dump -h localhost -U postgres -d iot_data > "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
```

### 2. Run Migration Script

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

**Or manually run SQL files:**
```bash
psql -h localhost -U postgres -d iot_data -f migrations/001_optimize_schema.sql
psql -h localhost -U postgres -d iot_data -f migrations/002_run_migration.sql
```

**What this does:**
- Creates `measurements_new` hypertable
- Creates normalized tables (`device_system_status`, `device_hardware`, `sensor_config`, `sensor_status`)
- Enables compression (7-day policy)
- Sets retention policy (1 year)
- Creates continuous aggregates (hourly, daily)
- Creates helper functions for migration

### 3. Run Data Migration

```bash
psql -h localhost -U postgres -d iot_data -f migrations/002_run_migration.sql
```

**What this does:**
- Migrates measurements in batches (10k at a time)
- Migrates device_status to normalized tables
- Refreshes continuous aggregates
- Verifies migration success

**Expected duration:**
- 1M rows: ~2-5 minutes
- 10M rows: ~20-30 minutes
- 100M rows: ~3-4 hours

### 4. Update Backend Code

#### Option A: Gradual Migration (Recommended)

1. Keep old MQTT plugin active
2. Deploy new optimized plugin alongside
3. Test with dual-write for 24 hours
4. Switch routes to use optimized queries
5. Remove old plugin

#### Option B: Direct Migration

1. Stop backend
2. Replace `mqtt.ts` with `mqtt-optimized.ts`
3. Replace `routes.ts` with `routes-optimized.ts`
4. Restart backend

```bash
# In backend/src/plugins/
mv mqtt.ts mqtt-old.ts
mv mqtt-optimized.ts mqtt.ts

# In backend/src/modules/devices/
mv routes.ts routes-old.ts
mv routes-optimized.ts routes.ts

# Restart
npm run dev
```

### 5. Verify Migration

```sql
-- Check table sizes
SELECT * FROM table_sizes;

-- Check compression
SELECT * FROM compression_stats;

-- Check data counts
SELECT 
  'measurements_old' as table, COUNT(*) as rows 
FROM measurements 
WHERE topic LIKE '%/sensors/%'
UNION ALL
SELECT 
  'measurements_new' as table, COUNT(*) as rows 
FROM measurements_new;

-- Check continuous aggregates
SELECT view_name, completed_threshold 
FROM timescaledb_information.continuous_aggregate_stats;
```

### 6. Monitor Performance

```sql
-- Query performance comparison
EXPLAIN ANALYZE
SELECT time_bucket('1 minute', time) as time, sensor_type, AVG(value)
FROM measurements_new
WHERE module_id = 'croissance'
  AND time > NOW() - INTERVAL '1 day'
GROUP BY time, sensor_type;

-- Check compression ratio
SELECT 
  pg_size_pretty(SUM(before_compression_total_bytes)) as before,
  pg_size_pretty(SUM(after_compression_total_bytes)) as after,
  ROUND(100 - (SUM(after_compression_total_bytes)::numeric / 
    SUM(before_compression_total_bytes)::numeric * 100), 2) as ratio_pct
FROM timescaledb_information.compressed_chunk_stats;
```

## Rollback Plan

If issues occur:

```sql
-- 1. Stop writing to new tables
-- (revert backend code changes)

-- 2. Drop new tables
DROP TABLE IF EXISTS measurements_new CASCADE;
DROP TABLE IF EXISTS device_system_status CASCADE;
DROP TABLE IF EXISTS device_hardware CASCADE;
DROP TABLE IF EXISTS sensor_config CASCADE;
DROP TABLE IF EXISTS sensor_status CASCADE;

-- 3. Restore from backup if needed
psql -h localhost -U postgres -d iot_data < backup_YYYYMMDD_HHMMSS.sql
```

## Post-Migration Cleanup

### Pourquoi `_new` dans les noms de tables ?

La migration a créé `measurements_new` pour permettre une migration **sans downtime** :
- ✅ Créer la nouvelle table sans affecter l'ancienne
- ✅ Migrer les données progressivement
- ✅ Tester la nouvelle structure en parallèle
- ✅ Possibilité de rollback facile

### Étape 1: Renommer les tables (après vérification)

Une fois que tout fonctionne correctement avec `measurements_new` :

```bash
# 1. Arrêter le backend
# 2. Faire un backup
pg_dump -h localhost -U postgres -d iot_data > backup_before_rename_$(date +%Y%m%d_%H%M%S).sql

# 3. Exécuter le script de renommage
psql -h localhost -U postgres -d iot_data -f migrations/003_rename_tables.sql
```

Ce script va :
- Renommer `measurements` → `measurements_old` (backup)
- Renommer `measurements_new` → `measurements`
- Renommer les index
- Vérifier que les politiques TimescaleDB sont toujours actives

### Étape 2: Mettre à jour le code backend

Après le renommage, mettre à jour les références dans le code :

```bash
# Remplacer measurements_new par measurements dans le code
cd backend/src
# Les fichiers à modifier :
# - src/plugins/mqtt.ts
# - src/modules/devices/routes.ts
```

### Étape 3: Supprimer l'ancienne table (après 1 semaine)

**⚠️ À faire UNIQUEMENT après 1 semaine de fonctionnement stable :**

```bash
psql -h localhost -U postgres -d iot_data -f migrations/004_cleanup_old_tables.sql
```

Ce script supprime `measurements_old` après vérification que toutes les données sont migrées.

### Alternative: Migration directe (pour futures migrations)

Pour éviter `_new` à l'avenir, on pourrait :
1. Créer directement `measurements_v2`
2. Migrer les données
3. Renommer `measurements` → `measurements_old` et `measurements_v2` → `measurements` en une transaction
4. Mais cela nécessite un court downtime

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Storage (1 year) | ~5 GB | ~500 MB | 90% ↓ |
| Dashboard query | 500-1000ms | 50-100ms | 10x ↑ |
| Insert throughput | 1000/s | 5000/s | 5x ↑ |
| Query complexity | High | Low | Simpler |

## Troubleshooting

### Migration is slow
- Increase `batch_size` in migration function
- Run during low-traffic period
- Check `pg_stat_activity` for locks

### Compression not working
```sql
-- Check compression jobs
SELECT * FROM timescaledb_information.jobs 
WHERE proc_name = 'policy_compression';

-- Manually compress a chunk
SELECT compress_chunk(i) 
FROM show_chunks('measurements_new', older_than => INTERVAL '7 days') i;
```

### Continuous aggregates not refreshing
```sql
-- Check refresh policies
SELECT * FROM timescaledb_information.jobs 
WHERE proc_name = 'policy_refresh_continuous_aggregate';

-- Manual refresh
CALL refresh_continuous_aggregate('measurements_hourly', NULL, NULL);
```

## Support

If you encounter issues:
1. Check logs: `tail -f /var/log/postgresql/postgresql-14-main.log`
2. Review TimescaleDB docs: https://docs.timescale.com
3. Check migration verification queries above
