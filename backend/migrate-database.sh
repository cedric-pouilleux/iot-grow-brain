#!/bin/bash

# Database Migration Script
# This script migrates the IoT database to the optimized schema

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-iot_data}"
BACKUP_DIR="./backups"
MIGRATION_DIR="./migrations"

echo -e "${GREEN}=== IoT Database Migration ===${NC}"
echo ""

# Check if TimescaleDB is available
echo -e "${YELLOW}Checking TimescaleDB extension...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';" -t | grep -q '.' || {
    echo -e "${RED}Error: TimescaleDB extension not found${NC}"
    echo "Please install TimescaleDB first: https://docs.timescale.com/install"
    exit 1
}
echo -e "${GREEN}✓ TimescaleDB found${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
echo -e "${YELLOW}Creating backup: $BACKUP_FILE${NC}"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created${NC}"

# Get current database size
echo -e "${YELLOW}Current database size:${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT pg_size_pretty(pg_database_size(current_database())) as size;
"

# Run schema migration
echo -e "${YELLOW}Running schema migration (001_optimize_schema.sql)...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_DIR/001_optimize_schema.sql"
echo -e "${GREEN}✓ Schema migration complete${NC}"

# Run data migration
echo -e "${YELLOW}Running data migration (002_run_migration.sql)...${NC}"
echo "This may take several minutes depending on data size..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_DIR/002_run_migration.sql"
echo -e "${GREEN}✓ Data migration complete${NC}"

# Show results
echo ""
echo -e "${GREEN}=== Migration Results ===${NC}"

# Table sizes
echo -e "${YELLOW}Table sizes:${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT * FROM table_sizes 
    WHERE tablename LIKE 'measurements%' OR tablename LIKE 'device%'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Compression stats
echo -e "${YELLOW}Compression stats:${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT * FROM compression_stats LIMIT 5;
"

# Data counts
echo -e "${YELLOW}Data counts:${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        'measurements (old)' as table, 
        COUNT(*) as rows 
    FROM measurements 
    WHERE topic LIKE '%/sensors/%'
    UNION ALL
    SELECT 
        'measurements_new' as table, 
        COUNT(*) as rows 
    FROM measurements_new;
"

echo ""
echo -e "${GREEN}=== Migration Complete! ===${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the migration results above"
echo "2. Update backend code to use optimized schema"
echo "3. Test the application thoroughly"
echo "4. Monitor performance for 24-48 hours"
echo "5. If all is well, drop old tables with: ./cleanup-old-tables.sh"
echo ""
echo -e "${YELLOW}Rollback:${NC}"
echo "If you need to rollback, restore from: $BACKUP_FILE"
echo "psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
