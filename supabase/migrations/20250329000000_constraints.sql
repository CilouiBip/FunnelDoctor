-- Script de migration 20250329000000_constraints.sql
-- Date: 2025-03-29
-- Description: Contraintes et finalisation pour la Phase 2.5

-- 1. Ajouter des contraintes pour l'intu00e9gritu00e9 des donnu00e9es dans funnel_progress
DO $$
BEGIN
  -- Vu00e9rifier si la contrainte existe du00e9ju00e0
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'funnel_progress' AND constraint_name = 'funnel_progress_stage_check'
  ) THEN
    -- Pour u00e9viter les erreurs, utiliser une approche flexible qui accepte plus de valeurs
    ALTER TABLE funnel_progress 
      ADD CONSTRAINT funnel_progress_stage_check 
      CHECK (current_stage IN (
        'visit', 'lead_capture', 'rdv_scheduled', 'rdv_canceled', 'rdv_completed', 
        'proposal_sent', 'negotiation', 'won', 'lost', 'qualified', 'unqualified'
      ));
    RAISE NOTICE 'Contrainte funnel_progress_stage_check ajoutu00e9e';
  ELSE
    RAISE NOTICE 'Contrainte funnel_progress_stage_check existe du00e9ju00e0';
  END IF;
END;
$$;

-- 2. Normaliser event_data en ajoutant des contraintes sur sa structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'conversion_events' AND constraint_name = 'conversion_events_event_data_check'
  ) THEN
    -- Contrainte pour vu00e9rifier que event_data est bien un objet JSON
    -- Utilisez un NOT VALID pour u00e9viter les problemes sur les donnu00e9es existantes
    ALTER TABLE conversion_events
      ADD CONSTRAINT conversion_events_event_data_check
      CHECK (event_data IS NULL OR jsonb_typeof(event_data) = 'object') NOT VALID;
    RAISE NOTICE 'Contrainte conversion_events_event_data_check ajoutu00e9e (NOT VALID)';
    
    -- Activer apres vérification manuelle si necessaire
    -- ALTER TABLE conversion_events VALIDATE CONSTRAINT conversion_events_event_data_check;
  ELSE
    RAISE NOTICE 'Contrainte conversion_events_event_data_check existe du00e9ju00e0';
  END IF;
END;
$$;

-- 3. Ajouter une contrainte d\'unicitu00e9 pour les contacts primaires
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'lead_contacts' AND constraint_name = 'unique_primary_contact_per_type_and_lead'
  ) THEN
    ALTER TABLE lead_contacts
      ADD CONSTRAINT unique_primary_contact_per_type_and_lead
      UNIQUE (lead_id, contact_type) 
      WHERE (is_primary = true);
    RAISE NOTICE 'Contrainte unique_primary_contact_per_type_and_lead ajoutu00e9e';
  ELSE
    RAISE NOTICE 'Contrainte unique_primary_contact_per_type_and_lead existe du00e9ju00e0';
  END IF;
END;
$$;

-- 4. Optimisation des index pour les requêtes les plus fréquentes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversion_events_type_created') THEN
    CREATE INDEX idx_conversion_events_type_created 
      ON conversion_events(event_type, created_at);
    RAISE NOTICE 'Index idx_conversion_events_type_created cru00e9u00e9';
  ELSE
    RAISE NOTICE 'Index idx_conversion_events_type_created existe du00e9ju00e0';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_funnel_progress_stage') THEN
    CREATE INDEX idx_funnel_progress_stage 
      ON funnel_progress(current_stage);
    RAISE NOTICE 'Index idx_funnel_progress_stage cru00e9u00e9';
  ELSE
    RAISE NOTICE 'Index idx_funnel_progress_stage existe du00e9ju00e0';
  END IF;
END;
$$;

-- 5. Documentation supplémentaire
COMMENT ON CONSTRAINT funnel_progress_stage_check ON funnel_progress IS 'Vu00e9rifie que l\'u00e9tape du funnel est une valeur valide';
COMMENT ON CONSTRAINT conversion_events_event_data_check ON conversion_events IS 'Garantit que event_data est un objet JSON valide';
COMMENT ON CONSTRAINT unique_primary_contact_per_type_and_lead ON lead_contacts IS 'Assure qu\'un seul contact est marquu00e9 comme primaire par type et par lead';

-- Vu00e9rification finale
DO $$
BEGIN
  RAISE NOTICE 'Vu00e9rification finale des contraintes:';
  RAISE NOTICE 'funnel_progress_stage_check: %', 
    EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage 
      WHERE table_name = 'funnel_progress' AND constraint_name = 'funnel_progress_stage_check'
    );
  RAISE NOTICE 'conversion_events_event_data_check: %', 
    EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage 
      WHERE table_name = 'conversion_events' AND constraint_name = 'conversion_events_event_data_check'
    );
  RAISE NOTICE 'unique_primary_contact_per_type_and_lead: %', 
    EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage 
      WHERE table_name = 'lead_contacts' AND constraint_name = 'unique_primary_contact_per_type_and_lead'
    );
  RAISE NOTICE 'Index optimisu00e9s: %', 
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversion_events_type_created') AND
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_funnel_progress_stage');
END;
$$;
