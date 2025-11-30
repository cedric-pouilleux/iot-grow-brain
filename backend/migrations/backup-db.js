// Script de backup de la base de données
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'iot_data',
});

async function backupTable(tableName) {
    console.log(`Backup de la table ${tableName}...`);
    const result = await pool.query(`SELECT * FROM ${tableName}`);
    return {
        table: tableName,
        rows: result.rows,
        count: result.rows.length
    };
}

async function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, `backup_before_rename_${timestamp}.json`);
    
    console.log('=== Création du backup ===\n');
    
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            tables: {}
        };
        
        // Backup des tables importantes
        const tables = ['measurements', 'measurements_new', 'device_system_status', 'sensor_config', 'sensor_status'];
        
        for (const table of tables) {
            try {
                const data = await backupTable(table);
                backup.tables[table] = data;
                console.log(`✓ ${table}: ${data.count} lignes`);
            } catch (err) {
                if (err.message.includes('does not exist')) {
                    console.log(`- ${table}: n'existe pas (ignoré)`);
                } else {
                    console.error(`✗ Erreur pour ${table}:`, err.message);
                }
            }
        }
        
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
        console.log(`\n✓ Backup créé: ${backupFile}`);
        return backupFile;
    } catch (err) {
        console.error('✗ Erreur lors du backup:', err.message);
        throw err;
    } finally {
        await pool.end();
    }
}

createBackup().catch(err => {
    console.error(err);
    process.exit(1);
});

