-- Script de diagnostic pour vérifier l'état de la base de données
-- Usage: psql -h localhost -U postgres -d iot_data -f diagnostic.sql

\echo '=== DIAGNOSTIC BASE DE DONNÉES ==='
\echo ''

\echo '1. Vérification de la table measurements_new:'
SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT module_id) as unique_modules,
    COUNT(DISTINCT sensor_type) as unique_sensors,
    MIN(time) as oldest_record,
    MAX(time) as newest_record
FROM measurements_new;

\echo ''
\echo '2. Dernières mesures insérées (top 10):'
SELECT 
    time,
    module_id,
    sensor_type,
    value
FROM measurements_new
ORDER BY time DESC
LIMIT 10;

\echo ''
\echo '3. Mesures par module et type de capteur:'
SELECT 
    module_id,
    sensor_type,
    COUNT(*) as count,
    MIN(time) as first_measurement,
    MAX(time) as last_measurement
FROM measurements_new
GROUP BY module_id, sensor_type
ORDER BY module_id, sensor_type;

\echo ''
\echo '4. Modules actifs dans device_system_status:'
SELECT 
    module_id,
    updated_at,
    rssi
FROM device_system_status
ORDER BY updated_at DESC;

\echo ''
\echo '5. Vérification des mesures des dernières 5 minutes:'
SELECT 
    COUNT(*) as recent_measurements,
    COUNT(DISTINCT module_id) as active_modules,
    COUNT(DISTINCT sensor_type) as active_sensors
FROM measurements_new
WHERE time > NOW() - INTERVAL '5 minutes';

\echo ''
\echo '=== FIN DU DIAGNOSTIC ==='

