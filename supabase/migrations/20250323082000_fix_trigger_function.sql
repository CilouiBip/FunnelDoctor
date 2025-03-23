-- Script de migration 20250323082000_fix_trigger_function.sql
-- Date: 2025-03-23
-- Description: Correction définitive du trigger_set_timestamp et du trigger associé

-- Recréer correctement la fonction trigger_set_timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que la colonne updated_at existe sur la table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- S'assurer que updated_at existe sur conversion_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'conversion_events' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE conversion_events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END;
$$;

-- Supprimer et recréer le trigger
DROP TRIGGER IF EXISTS set_timestamp_conversion_events ON conversion_events;

CREATE TRIGGER set_timestamp_conversion_events
BEFORE UPDATE ON conversion_events
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Initialiser updated_at avec created_at pour tous les enregistrements existants
UPDATE conversion_events SET updated_at = created_at WHERE updated_at IS NULL;

-- Confirmer que la colonne updated_at et le trigger existent
DO $$
BEGIN
  RAISE NOTICE 'Vérification de la colonne updated_at: %', 
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversion_events' AND column_name = 'updated_at');
  RAISE NOTICE 'Vérification du trigger set_timestamp_conversion_events: %', 
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_conversion_events');
END;
$$;
