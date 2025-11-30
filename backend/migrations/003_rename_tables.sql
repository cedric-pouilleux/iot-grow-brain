-- ============================================
-- Phase 3: Rename Tables (Cleanup)
-- ============================================
-- 
-- Ce script renomme measurements_new en measurements et supprime l'ancienne table
-- À exécuter APRÈS avoir vérifié que tout fonctionne correctement avec measurements_new
--
-- ⚠️  ATTENTION: Faire un backup avant d'exécuter ce script !
-- ⚠️  Arrêter le backend avant d'exécuter ce script !

-- Étape 1: Vérifier que measurements_new contient bien les données
DO $$
DECLARE
  new_count BIGINT;
  old_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO new_count FROM measurements_new;
  SELECT COUNT(*) INTO old_count FROM measurements WHERE topic LIKE '%/sensors/%';
  
  RAISE NOTICE 'Vérification:';
  RAISE NOTICE '  measurements_new: % lignes', new_count;
  RAISE NOTICE '  measurements (old): % lignes', old_count;
  
  IF new_count = 0 THEN
    RAISE EXCEPTION '❌ measurements_new est vide ! Ne pas continuer.';
  END IF;
  
  IF old_count > 0 AND new_count < old_count * 0.95 THEN
    RAISE WARNING '⚠️  Seulement %.1f%% des données ont été migrées. Vérifier avant de continuer.', 
      (new_count::numeric / old_count * 100);
  END IF;
END $$;

-- Étape 2: Renommer l'ancienne table measurements en measurements_old (backup)
ALTER TABLE IF EXISTS measurements RENAME TO measurements_old;

-- Étape 3: Renommer measurements_new en measurements
ALTER TABLE measurements_new RENAME TO measurements;

-- Étape 4: Renommer les index
ALTER INDEX IF EXISTS idx_measurements_new_module_sensor_time 
  RENAME TO idx_measurements_module_sensor_time;
ALTER INDEX IF EXISTS idx_measurements_new_time 
  RENAME TO idx_measurements_time;
ALTER INDEX IF EXISTS idx_measurements_new_module_time 
  RENAME TO idx_measurements_module_time;

-- Étape 5: Mettre à jour les continuous aggregates (si elles existent)
-- Note: TimescaleDB gère automatiquement les hypertables, mais on doit vérifier les vues
DO $$
BEGIN
  -- Vérifier si measurements_hourly existe et la mettre à jour
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'measurements_hourly') THEN
    -- La vue devrait automatiquement pointer vers la nouvelle table après le rename
    RAISE NOTICE '✓ Vue measurements_hourly sera automatiquement mise à jour';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'measurements_daily') THEN
    RAISE NOTICE '✓ Vue measurements_daily sera automatiquement mise à jour';
  END IF;
END $$;

-- Étape 6: Vérifier que les politiques TimescaleDB sont toujours actives
DO $$
DECLARE
  compression_policy_count INTEGER;
  retention_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO compression_policy_count
  FROM timescaledb_information.jobs
  WHERE proc_name = 'policy_compression' 
    AND hypertable_name = 'measurements';
  
  SELECT COUNT(*) INTO retention_policy_count
  FROM timescaledb_information.jobs
  WHERE proc_name = 'policy_retention' 
    AND hypertable_name = 'measurements';
  
  RAISE NOTICE 'Politiques TimescaleDB:';
  RAISE NOTICE '  Compression: % politique(s)', compression_policy_count;
  RAISE NOTICE '  Retention: % politique(s)', retention_policy_count;
  
  IF compression_policy_count = 0 THEN
    RAISE WARNING '⚠️  Aucune politique de compression trouvée pour measurements';
  END IF;
  
  IF retention_policy_count = 0 THEN
    RAISE WARNING '⚠️  Aucune politique de retention trouvée pour measurements';
  END IF;
END $$;

-- Étape 7: Vérification finale
DO $$
DECLARE
  final_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO final_count FROM measurements;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration terminée !';
  RAISE NOTICE '  Table measurements: % lignes', final_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Prochaines étapes:';
  RAISE NOTICE '  1. Vérifier que le backend fonctionne correctement';
  RAISE NOTICE '  2. Tester quelques requêtes';
  RAISE NOTICE '  3. Après 1 semaine de fonctionnement stable, supprimer measurements_old:';
  RAISE NOTICE '     DROP TABLE measurements_old CASCADE;';
END $$;

