// Script pour exécuter le renommage des tables
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

async function executeSQL(sql) {
    try {
        await pool.query(sql);
        return true;
    } catch (err) {
        console.error('Erreur SQL:', err.message);
        throw err;
    }
}

async function renameTables() {
    console.log('=== Renommage des tables ===\n');
    
    try {
        // Vérification
        console.log('1. Vérification des données...');
        const newCount = await pool.query('SELECT COUNT(*) as count FROM measurements_new');
        const oldCount = await pool.query("SELECT COUNT(*) as count FROM measurements WHERE topic LIKE '%/sensors/%'");
        
        console.log(`   measurements_new: ${newCount.rows[0].count} lignes`);
        console.log(`   measurements (old): ${oldCount.rows[0].count} lignes`);
        
        if (parseInt(newCount.rows[0].count) === 0) {
            throw new Error('❌ measurements_new est vide ! Ne pas continuer.');
        }
        
        // Renommer l'ancienne table
        console.log('\n2. Renommage measurements → measurements_old...');
        await executeSQL('ALTER TABLE IF EXISTS measurements RENAME TO measurements_old');
        console.log('   ✓ Fait');
        
        // Renommer la nouvelle table
        console.log('\n3. Renommage measurements_new → measurements...');
        await executeSQL('ALTER TABLE measurements_new RENAME TO measurements');
        console.log('   ✓ Fait');
        
        // Renommer les index
        console.log('\n4. Renommage des index...');
        try {
            await executeSQL('ALTER INDEX IF EXISTS idx_measurements_new_module_sensor_time RENAME TO idx_measurements_module_sensor_time');
            console.log('   ✓ idx_measurements_module_sensor_time');
        } catch (e) {
            console.log('   - Index déjà renommé ou inexistant');
        }
        
        try {
            await executeSQL('ALTER INDEX IF EXISTS idx_measurements_new_time RENAME TO idx_measurements_time');
            console.log('   ✓ idx_measurements_time');
        } catch (e) {
            console.log('   - Index déjà renommé ou inexistant');
        }
        
        try {
            await executeSQL('ALTER INDEX IF EXISTS idx_measurements_new_module_time RENAME TO idx_measurements_module_time');
            console.log('   ✓ idx_measurements_module_time');
        } catch (e) {
            console.log('   - Index déjà renommé ou inexistant');
        }
        
        // Vérification finale
        console.log('\n5. Vérification finale...');
        const finalCount = await pool.query('SELECT COUNT(*) as count FROM measurements');
        console.log(`   ✓ Table measurements: ${finalCount.rows[0].count} lignes`);
        
        // Vérifier les politiques TimescaleDB
        const policies = await pool.query(`
            SELECT proc_name, hypertable_name
            FROM timescaledb_information.jobs
            WHERE hypertable_name = 'measurements'
        `);
        
        if (policies.rows.length > 0) {
            console.log(`   ✓ Politiques TimescaleDB: ${policies.rows.length} active(s)`);
        } else {
            console.log('   ⚠ Aucune politique TimescaleDB trouvée');
        }
        
        console.log('\n✅ Renommage terminé avec succès !');
        console.log('\n📋 Prochaines étapes:');
        console.log('  1. Mettre à jour le code (renommer measurements_new → measurements)');
        console.log('  2. Redémarrer le backend');
        console.log('  3. Tester que tout fonctionne');
        
    } catch (err) {
        console.error('\n❌ Erreur lors du renommage:', err.message);
        throw err;
    } finally {
        await pool.end();
    }
}

renameTables().catch(err => {
    console.error(err);
    process.exit(1);
});

