const { initTimescale } = require('./src/db/database');

async function checkDbSize() {
    // Initialiser la connexion à la base de données
    await initTimescale();
    
    const { getPool } = require('./src/db/database');
    const pool = getPool();
    if (!pool) {
        console.error('❌ Pool DB non disponible');
        process.exit(1);
    }

    try {
        // 1. Nombre total d'enregistrements
        const countResult = await pool.query(`
            SELECT COUNT(*) as count FROM measurements
        `);
        const totalRecords = parseInt(countResult.rows[0].count);

        // 2. Taille totale de la table measurements
        const tableSizeResult = await pool.query(`
            SELECT 
                pg_size_pretty(pg_total_relation_size('measurements')) as total_size,
                pg_total_relation_size('measurements') as total_size_bytes,
                pg_size_pretty(pg_relation_size('measurements')) as table_size,
                pg_relation_size('measurements') as table_size_bytes,
                pg_size_pretty(pg_indexes_size('measurements')) as indexes_size,
                pg_indexes_size('measurements') as indexes_size_bytes
        `);
        const sizes = tableSizeResult.rows[0];

        // 3. Taille moyenne par enregistrement (en incluant les index)
        const avgSizeBytes = totalRecords > 0 
            ? parseInt(sizes.total_size_bytes) / totalRecords 
            : 0;

        // 4. Exemple d'enregistrement réel avec gestion des NULL
        const sampleResult = await pool.query(`
            SELECT 
                time,
                topic,
                value,
                metadata,
                COALESCE(pg_column_size(time), 0) as time_size,
                COALESCE(pg_column_size(topic), 0) as topic_size,
                COALESCE(pg_column_size(value), 0) as value_size,
                COALESCE(pg_column_size(metadata), 0) as metadata_size,
                COALESCE(pg_column_size(time), 0) + 
                COALESCE(pg_column_size(topic), 0) + 
                COALESCE(pg_column_size(value), 0) + 
                COALESCE(pg_column_size(metadata), 0) as total_row_size
            FROM measurements
            LIMIT 10
        `);

        // 5. Statistiques par topic
        const topicStats = await pool.query(`
            SELECT 
                topic,
                COUNT(*) as count,
                pg_size_pretty(SUM(
                    COALESCE(pg_column_size(time), 0) + 
                    COALESCE(pg_column_size(topic), 0) + 
                    COALESCE(pg_column_size(value), 0) + 
                    COALESCE(pg_column_size(metadata), 0)
                )) as total_size,
                SUM(
                    COALESCE(pg_column_size(time), 0) + 
                    COALESCE(pg_column_size(topic), 0) + 
                    COALESCE(pg_column_size(value), 0) + 
                    COALESCE(pg_column_size(metadata), 0)
                ) as total_size_bytes
            FROM measurements
            GROUP BY topic
            ORDER BY count DESC
            LIMIT 10
        `);

        console.log('\n📊 ANALYSE DE LA BASE DE DONNÉES\n');
        console.log('═'.repeat(60));
        
        console.log('\n📈 Statistiques globales:');
        console.log(`   Total d'enregistrements: ${totalRecords.toLocaleString()}`);
        console.log(`   Taille totale (table + index): ${sizes.total_size}`);
        console.log(`   Taille table seule: ${sizes.table_size}`);
        console.log(`   Taille index: ${sizes.indexes_size}`);
        console.log(`   Taille moyenne par enregistrement: ${avgSizeBytes.toFixed(2)} bytes`);

        console.log('\n📋 Exemples d\'enregistrements (10 premiers):');
        sampleResult.rows.forEach((row, idx) => {
            console.log(`\n   Enregistrement ${idx + 1}:`);
            console.log(`     Topic: ${row.topic}`);
            console.log(`     Value: ${row.value}`);
            console.log(`     Taille time: ${row.time_size} bytes`);
            console.log(`     Taille topic: ${row.topic_size} bytes`);
            console.log(`     Taille value: ${row.value_size} bytes`);
            console.log(`     Taille metadata: ${row.metadata_size} bytes`);
            console.log(`     Taille totale ligne: ${row.total_row_size} bytes`);
        });

        // Calculer la moyenne réelle
        const avgRowSize = sampleResult.rows.length > 0
            ? sampleResult.rows.reduce((sum, row) => sum + parseInt(row.total_row_size), 0) / sampleResult.rows.length
            : 0;

        console.log(`\n   📊 Taille moyenne réelle par ligne: ${avgRowSize.toFixed(2)} bytes`);

        console.log('\n📊 Statistiques par topic:');
        topicStats.rows.forEach(row => {
            const avgSize = parseInt(row.count) > 0 && row.total_size_bytes
                ? parseInt(row.total_size_bytes) / parseInt(row.count)
                : 0;
            console.log(`   ${row.topic}:`);
            console.log(`     Enregistrements: ${parseInt(row.count).toLocaleString()}`);
            console.log(`     Taille totale: ${row.total_size}`);
            console.log(`     Taille moyenne: ${avgSize.toFixed(2)} bytes/enregistrement`);
        });

        // 6. Vérifier la compression TimescaleDB
        const compressionResult = await pool.query(`
            SELECT 
                COUNT(*) as compressed_chunks,
                pg_size_pretty(SUM(total_bytes)) as compressed_size
            FROM timescaledb_information.chunks
            WHERE is_compressed = true
        `).catch(() => ({ rows: [{ compressed_chunks: 0, compressed_size: 'N/A' }] }));

        console.log('\n🗜️  Compression TimescaleDB:');
        console.log(`   Chunks compressés: ${compressionResult.rows[0].compressed_chunks}`);
        console.log(`   Taille compressée: ${compressionResult.rows[0].compressed_size}`);

        // 7. Projection avec les valeurs réelles
        console.log('\n📈 PROJECTION AVEC VALEURS RÉELLES:\n');
        const intervals = [10, 30, 60, 120, 300];
        const secondsPerYear = 365 * 24 * 3600;
        
        intervals.forEach(interval => {
            const recordsPerYear = secondsPerYear / interval;
            const sizePerYear = recordsPerYear * avgRowSize;
            const sizePerYearCompressed = sizePerYear * 0.1; // Estimation compression
            
            console.log(`   Intervalle ${interval}s:`);
            console.log(`     Enregistrements/an: ${Math.round(recordsPerYear).toLocaleString()}`);
            console.log(`     Taille/an (brut): ${formatBytes(sizePerYear)}`);
            console.log(`     Taille/an (compressé): ${formatBytes(sizePerYearCompressed)}`);
            console.log(`     Taille/10 ans (compressé): ${formatBytes(sizePerYearCompressed * 10)}`);
        });

        console.log('\n' + '═'.repeat(60));
        console.log('\n💡 Recommandations:');
        console.log(`   - Taille moyenne réelle: ${avgRowSize.toFixed(2)} bytes (vs 50 bytes estimés)`);
        if (avgRowSize > 50) {
            console.log(`   ⚠️  Les enregistrements sont ${(avgRowSize / 50).toFixed(1)}x plus gros que prévu`);
        } else if (avgRowSize < 50) {
            console.log(`   ✅ Les enregistrements sont plus petits que prévu (bonne nouvelle!)`);
        } else {
            console.log(`   ✅ Les estimations sont proches de la réalité`);
        }

        await pool.end();
    } catch (err) {
        console.error('❌ Erreur:', err);
        process.exit(1);
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return Math.round(bytes) + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

checkDbSize();

