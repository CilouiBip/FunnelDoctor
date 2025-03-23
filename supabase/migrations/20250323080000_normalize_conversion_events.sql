-- Script de migration v1.2.3_normalize_conversion_events.sql
-- Date: 2025-03-23
-- Description: Normalisation de la table conversion_events
-- - Ajout de user_id pour remplacer created_by
-- - Ajout/vérification d'updated_at
-- - Vérification des colonnes event_data, page_url, site_id

-- Créer d'abord la fonction trigger si elle n'existe pas
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Ajout et normalisation des colonnes
DO $$
BEGIN
  -- Ajouter la colonne user_id si elle n'existe pas déjà
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'conversion_events' AND column_name = 'user_id') THEN
    ALTER TABLE conversion_events ADD COLUMN user_id UUID REFERENCES users(id);
  END IF;
  
  -- Ajouter event_name si elle n'existe pas déjà (mais devrait exister car NOT NULL)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'conversion_events' AND column_name = 'event_name') THEN
    ALTER TABLE conversion_events ADD COLUMN event_name VARCHAR NOT NULL DEFAULT 'legacy_event';
  END IF;
  
  -- Migration de données: si created_by existe mais user_id est NULL, copier la valeur
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'conversion_events' AND column_name = 'created_by') THEN
    UPDATE conversion_events SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
  END IF;

  -- Ajouter updated_at si elle n'existe pas déjà
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'conversion_events' AND column_name = 'updated_at') THEN
    ALTER TABLE conversion_events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    UPDATE conversion_events SET updated_at = created_at WHERE updated_at IS NULL;
  END IF;
  
  -- Vérifier que event_data est de type JSONB
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversion_events' AND column_name = 'event_data' AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE conversion_events ADD COLUMN event_data JSONB DEFAULT '{}';
  END IF;
  
  -- Vérifier page_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'conversion_events' AND column_name = 'page_url') THEN
    ALTER TABLE conversion_events ADD COLUMN page_url TEXT;
  END IF;
  
  -- Vérifier site_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'conversion_events' AND column_name = 'site_id') THEN
    ALTER TABLE conversion_events ADD COLUMN site_id TEXT DEFAULT 'default';
  END IF;
  
  -- Vérifier visitor_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'conversion_events' AND column_name = 'visitor_id') THEN
    ALTER TABLE conversion_events ADD COLUMN visitor_id UUID REFERENCES visitors(id);
  END IF;
  
  -- Vérifier le trigger pour updated_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_timestamp_conversion_events'
  ) THEN
    -- Créer le trigger si la fonction existe maintenant
    CREATE TRIGGER set_timestamp_conversion_events
    BEFORE UPDATE ON conversion_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

-- 2. Création des index pour performance
DO $$
BEGIN
  -- Index pour lead_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'conversion_events' AND indexname = 'idx_conversion_events_lead_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_conversion_events_lead_id ON conversion_events(lead_id);
  END IF;
  
  -- Index pour event_name
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'conversion_events' AND indexname = 'idx_conversion_events_event_name'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_conversion_events_event_name ON conversion_events(event_name);
  END IF;
  
  -- Index pour user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'conversion_events' AND indexname = 'idx_conversion_events_user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON conversion_events(user_id);
  END IF;
  
  -- Index pour created_at (pour tri chronologique)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'conversion_events' AND indexname = 'idx_conversion_events_created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON conversion_events(created_at);
  END IF;
END
$$;

-- 3. Commentaires sur les colonnes pour documentation
COMMENT ON COLUMN conversion_events.event_name IS 'Nom de l''événement, obligatoire (ex: rdv_scheduled, payment_received)'; 
COMMENT ON COLUMN conversion_events.user_id IS 'Référence à l''utilisateur qui a créé l''événement, remplace created_by';
COMMENT ON COLUMN conversion_events.event_data IS 'Données d''événement supplémentaires en format JSON';
COMMENT ON COLUMN conversion_events.visitor_id IS 'Référence au visiteur associé à l''événement de conversion';
