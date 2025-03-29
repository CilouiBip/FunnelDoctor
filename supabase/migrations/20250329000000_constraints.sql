-- Script de migration 20250329000000_constraints.sql
-- Date: 2025-03-29
-- Description: Contraintes et finalisation pour la Phase 2.5

-- 1. Ajouter des contraintes pour l'intégrité des données dans funnel_progress
DO $$
BEGIN
  -- Vérifier si la contrainte existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'funnel_progress' AND constraint_name = 'funnel_progress_stage_check'
  ) THEN
    -- Pour éviter les erreurs, utiliser une approche flexible qui accepte plus de valeurs
    ALTER TABLE funnel_progress 
      ADD CONSTRAINT funnel_progress_stage_check 
      CHECK (current_stage IN (
        'visit', 'lead_capture', 'rdv_scheduled', 'rdv_canceled', 'rdv_completed', 
        'proposal_sent', 'negotiation', 'won', 'lost', 'qualified', 'unqualified'
      ));
    RAISE NOTICE 'Contrainte funnel_progress_stage_check ajoutée';
  ELSE
    RAISE NOTICE 'Contrainte funnel_progress_stage_check existe déjà';
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
    -- Contrainte pour vérifier que event_data est bien un objet JSON
    -- Utilisez un NOT VALID pour éviter les problemes sur les données existantes
    ALTER TABLE conversion_events
      ADD CONSTRAINT conversion_events_event_data_check
      CHECK (event_data IS NULL OR jsonb_typeof(event_data) = 'object') NOT VALID;
    RAISE NOTICE 'Contrainte conversion_events_event_data_check ajoutée (NOT VALID)';
    
    -- Activer apres vérification manuelle si necessaire
    -- ALTER TABLE conversion_events VALIDATE CONSTRAINT conversion_events_event_data_check;
  ELSE
    RAISE NOTICE 'Contrainte conversion_events_event_data_check existe déjà';
  END IF;
END;
$$;

-- 3. Ajouter une contrainte d'unicité pour les contacts primaires
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'lead_contacts' AND constraint_name = 'unique_primary_contact_per_type_and_lead'
  ) THEN
    -- Utiliser un index partiel unique au lieu d'une contrainte conditionnelle
    CREATE UNIQUE INDEX unique_primary_contact_per_type_and_lead
      ON lead_contacts(lead_id, contact_type)
      WHERE is_primary = true;
    RAISE NOTICE 'Contrainte unique_primary_contact_per_type_and_lead ajoutée';
  ELSE
    RAISE NOTICE 'Contrainte unique_primary_contact_per_type_and_lead existe déjà';
  END IF;
END;
$$;

-- 4. Optimisation des index pour les requêtes les plus fréquentes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversion_events_type_created') THEN
    CREATE INDEX idx_conversion_events_type_created 
      ON conversion_events(event_type, created_at);
    RAISE NOTICE 'Index idx_conversion_events_type_created créé';
  ELSE
    RAISE NOTICE 'Index idx_conversion_events_type_created existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_funnel_progress_stage') THEN
    CREATE INDEX idx_funnel_progress_stage 
      ON funnel_progress(current_stage);
    RAISE NOTICE 'Index idx_funnel_progress_stage créé';
  ELSE
    RAISE NOTICE 'Index idx_funnel_progress_stage existe déjà';
  END IF;
END;
$$;

-- 5. Documentation supplémentaire
COMMENT ON CONSTRAINT funnel_progress_stage_check ON funnel_progress IS 'Vérifie que le funnel est valide';
COMMENT ON CONSTRAINT conversion_events_event_data_check ON conversion_events IS 'Garantit que event_data est un objet JSON valide';
COMMENT ON INDEX unique_primary_contact_per_type_and_lead IS 'Assure que seul un contact est marqué comme primaire par type et par lead';

-- Verification finale
DO $$
BEGIN
  RAISE NOTICE 'Verification finale des contraintes:';
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
  RAISE NOTICE 'Index optimises: %', 
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversion_events_type_created') AND
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_funnel_progress_stage');
END;
$$;
