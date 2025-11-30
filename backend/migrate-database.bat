@echo off
REM Database Migration Script for Windows
REM This script migrates the IoT database to the optimized schema

setlocal enabledelayedexpansion

echo === IoT Database Migration ===
echo.

REM Configuration
set DB_HOST=localhost
set DB_USER=postgres
set DB_NAME=iot_data
set BACKUP_DIR=backups
set MIGRATION_DIR=migrations

REM Try to find PostgreSQL
set PSQL_CMD=
set PG_DUMP_CMD=

REM Check if psql is in PATH
where psql >nul 2>&1
if %errorlevel% equ 0 (
    set PSQL_CMD=psql
    set PG_DUMP_CMD=pg_dump
    echo [OK] PostgreSQL found in PATH
    goto :found_postgres
)

REM Check common PostgreSQL installation paths
for %%v in (16 15 14 13 12) do (
    if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
        set PSQL_CMD="C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
        set PG_DUMP_CMD="C:\Program Files\PostgreSQL\%%v\bin\pg_dump.exe"
        echo [OK] PostgreSQL %%v found
        goto :found_postgres
    )
)

REM Try Docker as fallback
echo PostgreSQL not found in PATH, trying Docker...
docker ps >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Using Docker for database access
    set USE_DOCKER=1
    goto :use_docker
) else (
    echo.
    echo [ERROR] PostgreSQL not found!
    echo.
    echo Please either:
    echo 1. Add PostgreSQL to PATH
    echo 2. Install PostgreSQL from https://www.postgresql.org/download/windows/
    echo 3. Use Docker: docker-compose up -d timescaledb
    echo.
    echo Or run migrations manually:
    echo   psql -h localhost -U postgres -d iot_data -f migrations\001_optimize_schema.sql
    echo   psql -h localhost -U postgres -d iot_data -f migrations\002_run_migration.sql
    pause
    exit /b 1
)

:found_postgres
REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Backup database
set BACKUP_FILE=%BACKUP_DIR%\backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%
echo Creating backup: %BACKUP_FILE%
%PG_DUMP_CMD% -h %DB_HOST% -U %DB_USER% -d %DB_NAME% > "%BACKUP_FILE%"
if errorlevel 1 (
    echo [ERROR] Backup failed
    echo Make sure PostgreSQL is running and credentials are correct
    pause
    exit /b 1
)
echo [OK] Backup created
echo.

REM Get current database size
echo Current database size:
%PSQL_CMD% -h %DB_HOST% -U %DB_USER% -d %DB_NAME% -c "SELECT pg_size_pretty(pg_database_size(current_database())) as size;"
echo.

REM Run schema migration
echo Running schema migration (001_optimize_schema.sql)...
%PSQL_CMD% -h %DB_HOST% -U %DB_USER% -d %DB_NAME% -f "%MIGRATION_DIR%\001_optimize_schema.sql"
if errorlevel 1 (
    echo [ERROR] Schema migration failed
    pause
    exit /b 1
)
echo [OK] Schema migration complete
echo.

REM Run data migration
echo Running data migration (002_run_migration.sql)...
echo This may take several minutes depending on data size...
%PSQL_CMD% -h %DB_HOST% -U %DB_USER% -d %DB_NAME% -f "%MIGRATION_DIR%\002_run_migration.sql"
if errorlevel 1 (
    echo [ERROR] Data migration failed
    pause
    exit /b 1
)
echo [OK] Data migration complete
echo.

goto :show_results

:use_docker
REM Using Docker
echo Using Docker container for migration...
echo.

REM Detect container name
for /f "tokens=*" %%i in ('docker ps --format "{{.Names}}" ^| findstr /i "timescale"') do set CONTAINER_NAME=%%i

if not defined CONTAINER_NAME (
    echo [ERROR] TimescaleDB container not found
    echo Please start the container: docker-compose up -d
    pause
    exit /b 1
)

echo [OK] Found container: %CONTAINER_NAME%
echo.

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Backup database
set BACKUP_FILE=%BACKUP_DIR%\backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%
echo Creating backup: %BACKUP_FILE%
docker exec -i %CONTAINER_NAME% pg_dump -U postgres iot_data > "%BACKUP_FILE%"
if errorlevel 1 (
    echo [ERROR] Backup failed
    echo Make sure Docker container is running: docker-compose up -d
    pause
    exit /b 1
)
echo [OK] Backup created
echo.

REM Run schema migration
echo Running schema migration (001_optimize_schema.sql)...
docker exec -i %CONTAINER_NAME% psql -U postgres -d iot_data < "%MIGRATION_DIR%\001_optimize_schema.sql"
if errorlevel 1 (
    echo [ERROR] Schema migration failed
    pause
    exit /b 1
)
echo [OK] Schema migration complete
echo.

REM Run data migration
echo Running data migration (002_run_migration.sql)...
docker exec -i %CONTAINER_NAME% psql -U postgres -d iot_data < "%MIGRATION_DIR%\002_run_migration.sql"
if errorlevel 1 (
    echo [ERROR] Data migration failed
    pause
    exit /b 1
)
echo [OK] Data migration complete
echo.

:show_results
REM Show results
echo === Migration Results ===
echo.

if defined USE_DOCKER (
    echo Table sizes:
    docker exec -i %CONTAINER_NAME% psql -U postgres -d iot_data -c "SELECT * FROM table_sizes WHERE tablename LIKE 'measurements%%' OR tablename LIKE 'device%%' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
    echo.
    
    echo Data counts:
    docker exec -i %CONTAINER_NAME% psql -U postgres -d iot_data -c "SELECT 'measurements (old)' as table, COUNT(*) as rows FROM measurements WHERE topic LIKE '%%/sensors/%%' UNION ALL SELECT 'measurements_new' as table, COUNT(*) as rows FROM measurements_new;"
) else (
    echo Table sizes:
    %PSQL_CMD% -h %DB_HOST% -U %DB_USER% -d %DB_NAME% -c "SELECT * FROM table_sizes WHERE tablename LIKE 'measurements%%' OR tablename LIKE 'device%%' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
    echo.
    
    echo Data counts:
    %PSQL_CMD% -h %DB_HOST% -U %DB_USER% -d %DB_NAME% -c "SELECT 'measurements (old)' as table, COUNT(*) as rows FROM measurements WHERE topic LIKE '%%/sensors/%%' UNION ALL SELECT 'measurements_new' as table, COUNT(*) as rows FROM measurements_new;"
)

echo.
echo === Migration Complete! ===
echo.
echo Next steps:
echo 1. Review the migration results above
echo 2. Update backend code to use optimized schema
echo 3. Test the application thoroughly
echo 4. Monitor performance for 24-48 hours
echo.
echo Rollback:
echo If you need to rollback, restore from: %BACKUP_FILE%
if defined USE_DOCKER (
    echo docker exec -i %CONTAINER_NAME% psql -U postgres -d iot_data ^< "%BACKUP_FILE%"
) else (
    echo %PSQL_CMD% -h %DB_HOST% -U %DB_USER% -d %DB_NAME% ^< "%BACKUP_FILE%"
)
echo.
pause

endlocal
