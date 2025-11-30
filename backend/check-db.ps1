# Script PowerShell pour vérifier l'état de la base de données
# Nécessite psql dans le PATH

$env:PGPASSWORD = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "password" }
$dbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$dbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "iot_data" }

Write-Host "=== DIAGNOSTIC BASE DE DONNÉES ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Vérification de la table measurements_new:" -ForegroundColor Yellow
psql -h $dbHost -U $dbUser -d $dbName -c "
SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT module_id) as unique_modules,
    COUNT(DISTINCT sensor_type) as unique_sensors,
    MIN(time) as oldest_record,
    MAX(time) as newest_record
FROM measurements_new;
"

Write-Host ""
Write-Host "2. Dernières mesures insérées (top 10):" -ForegroundColor Yellow
psql -h $dbHost -U $dbUser -d $dbName -c "
SELECT 
    time,
    module_id,
    sensor_type,
    value
FROM measurements_new
ORDER BY time DESC
LIMIT 10;
"

Write-Host ""
Write-Host "3. Mesures par module et type de capteur:" -ForegroundColor Yellow
psql -h $dbHost -U $dbUser -d $dbName -c "
SELECT 
    module_id,
    sensor_type,
    COUNT(*) as count,
    MIN(time) as first_measurement,
    MAX(time) as last_measurement
FROM measurements_new
GROUP BY module_id, sensor_type
ORDER BY module_id, sensor_type;
"

Write-Host ""
Write-Host "4. Modules actifs dans device_system_status:" -ForegroundColor Yellow
psql -h $dbHost -U $dbUser -d $dbName -c "
SELECT 
    module_id,
    updated_at,
    rssi
FROM device_system_status
ORDER BY updated_at DESC;
"

Write-Host ""
Write-Host "5. Vérification des mesures des dernières 5 minutes:" -ForegroundColor Yellow
psql -h $dbHost -U $dbUser -d $dbName -c "
SELECT 
    COUNT(*) as recent_measurements,
    COUNT(DISTINCT module_id) as active_modules,
    COUNT(DISTINCT sensor_type) as active_sensors
FROM measurements_new
WHERE time > NOW() - INTERVAL '5 minutes';
"

Write-Host ""
Write-Host "=== FIN DU DIAGNOSTIC ===" -ForegroundColor Cyan

