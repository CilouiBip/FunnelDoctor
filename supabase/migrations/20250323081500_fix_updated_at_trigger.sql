-- Script de migration 20250323081500_fix_updated_at_trigger.sql
-- Date: 2025-03-23
-- Description: Correction du trigger updated_at pour conversion_events

-- 1. Vérifier que la colonne updated_at existe bien
DO $$
BEGIN
  -- Assurer que updated_at existe et est du bon type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'conversion_events' AND column_name = 'updated_at') THEN
    ALTER TABLE conversion_events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- Suppression de l'ancien trigger s'il existe
  DROP TRIGGER IF EXISTS set_timestamp_conversion_events ON conversion_events;

  -- Recréation du trigger avec une définition plus robuste
  CREATE TRIGGER set_timestamp_conversion_events
  BEFORE UPDATE ON conversion_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
  
  -- Mise à jour des enregistrements existants pour initialiser updated_at si nécessaire
  UPDATE conversion_events 
  SET updated_at = created_at 
  WHERE updated_at IS NULL;
END;
$$;

-- Ajouter un commentaire sur la colonne pour documentation
COMMENT ON COLUMN conversion_events.updated_at IS 'Date et heure de dernière modification, mise à jour automatiquement';
