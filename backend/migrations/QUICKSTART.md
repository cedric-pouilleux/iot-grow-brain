# Quick Start - Database Migration

## Windows PowerShell

```powershell
# Navigate to backend directory
cd d:\dev-iot\backend

# Run migration script (note the .\ prefix for PowerShell)
.\migrate-database.bat
```

## Linux/Mac

```bash
# Navigate to backend directory
cd /path/to/dev-iot/backend

# Make script executable
chmod +x migrate-database.sh

# Run migration
./migrate-database.sh
```

## What the Script Does

1. ✅ Creates backup of current database
2. ✅ Creates optimized TimescaleDB schema
3. ✅ Migrates all existing data
4. ✅ Enables compression (90% storage reduction)
5. ✅ Sets up retention policy (1 year)
6. ✅ Creates continuous aggregates (10x faster queries)
7. ✅ Shows migration results and statistics

## Expected Results

- **Storage**: 5GB → 500MB (90% reduction)
- **Query Speed**: 500ms → 50ms (10x faster)
- **Insert Speed**: 1000/s → 5000/s (5x faster)

## Troubleshooting

### "migrate-database.bat is not recognized"

**PowerShell requires `.\` prefix:**
```powershell
.\migrate-database.bat  # Correct
migrate-database.bat    # Wrong
```

### "pg_dump: command not found"

Add PostgreSQL to your PATH or use full path:
```powershell
# Windows
"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" -h localhost -U postgres -d iot_data > backup.sql

# Or add to PATH
$env:Path += ";C:\Program Files\PostgreSQL\14\bin"
```

### Permission denied (Linux/Mac)

```bash
chmod +x migrate-database.sh
```

## Manual Migration

If scripts don't work, run SQL files directly:

```bash
# Backup
pg_dump -h localhost -U postgres -d iot_data > backup.sql

# Run migrations
psql -h localhost -U postgres -d iot_data -f migrations/001_optimize_schema.sql
psql -h localhost -U postgres -d iot_data -f migrations/002_run_migration.sql
```

## Next Steps

After successful migration:

1. Update backend code (see main README.md)
2. Test application thoroughly
3. Monitor for 24-48 hours
4. Clean up old tables if all is well

For detailed documentation, see [migrations/README.md](README.md)
