-- ============================================
-- Phase 4: Cleanup - Supprimer l'ancienne table
-- ============================================
-- 
-- ⚠️  À exécuter UNIQUEMENT après avoir vérifié que tout fonctionne correctement
-- ⚠️  pendant au moins 1 semaine après la migration
-- ⚠️  Faire un backup avant !

-- Vérification finale avant suppression
DO $$
DECLARE
  new_count BIGINT;
  old_count BIGINT;
  days_since_migration INTEGER;
BEGIN
  -- Compter les lignes
  SELECT COUNT(*) INTO new_count FROM measurements;
  SELECT COUNT(*) INTO old_count FROM measurements_old WHERE topic LIKE '%/sensors/%';
  
  -- Vérifier qu'on a bien des données dans la nouvelle table
  IF new_count = 0 THEN
    RAISE EXCEPTION '❌ La table measurements est vide ! Ne pas supprimer measurements_old.';
  END IF;
  
  -- Vérifier qu'on a bien migré toutes les données
  IF old_count > 0 AND new_count < old_count THEN
    RAISE WARNING '⚠️  La nouvelle table a moins de données que l''ancienne !';
    RAISE WARNING '  measurements: % lignes', new_count;
    RAISE WARNING '  measurements_old: % lignes', old_count;
    RAISE EXCEPTION 'Ne pas supprimer measurements_old - données manquantes !';
  END IF;
  
  RAISE NOTICE 'Vérification:';
  RAISE NOTICE '  measurements: % lignes', new_count;
  RAISE NOTICE '  measurements_old: % lignes', old_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Vérification OK, suppression de measurements_old...';
END $$;

-- Supprimer l'ancienne table
DROP TABLE IF EXISTS measurements_old CASCADE;

-- Nettoyer l'espace (optionnel, peut être long)
-- VACUUM FULL;

RAISE NOTICE '✅ Nettoyage terminé !';
RAISE NOTICE '  L''ancienne table measurements_old a été supprimée.';

