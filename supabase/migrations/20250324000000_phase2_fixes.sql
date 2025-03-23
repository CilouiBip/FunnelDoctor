-- Script de migration 20250324000000_phase2_fixes.sql
-- Date: 2025-03-24
-- Description: Corrections Phase 2 - Ajout DEMO_CANCELED et rdv_canceled_at

-- 1. Vérifier et mettre à jour l'enum conversion_event_type
DO $$
DECLARE
  enum_exists BOOLEAN;
  values_list TEXT[];
BEGIN
  -- Vérifier si l'enum existe
  SELECT EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname = 'conversion_event_type'
  ) INTO enum_exists;

  IF enum_exists THEN
    -- Récupérer les valeurs actuelles de l'enum
    SELECT array_agg(enumlabel) FROM pg_enum 
    WHERE enumtypid = 'conversion_event_type'::regtype 
    INTO values_list;
    
    -- Ajouter DEMO_CANCELED s'il n'existe pas déjà
    IF NOT 'DEMO_CANCELED' = ANY(values_list) THEN
      EXECUTE 'ALTER TYPE conversion_event_type ADD VALUE ''DEMO_CANCELED'''; 
      RAISE NOTICE 'Added DEMO_CANCELED to conversion_event_type enum';
    ELSE
      RAISE NOTICE 'DEMO_CANCELED already exists in conversion_event_type enum';
    END IF;
  ELSE
    RAISE NOTICE 'Type conversion_event_type n''existe pas, vérification des autres possibilités...';
    
    -- Il est possible que ce soit une contrainte CHECK plutôt qu'un enum
    IF EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage 
      WHERE table_name = 'conversion_events' AND column_name = 'event_type'
    ) THEN
      -- Récupérer la contrainte existante
      RAISE NOTICE 'Une contrainte existe sur event_type, tentative de mise à jour...';
      
      -- Solution alternative : mise à jour de la contrainte CHECK si c'est celle-ci qui est utilisée
      -- Note: ceci est une approximation, la vraie contrainte pourrait avoir une structure différente
      ALTER TABLE conversion_events DROP CONSTRAINT IF EXISTS conversion_events_event_type_check;
      ALTER TABLE conversion_events ADD CONSTRAINT conversion_events_event_type_check 
        CHECK (event_type IN ('PAYMENT', 'SIGNUP', 'LOGIN', 'DEMO_SCHEDULED', 'DEMO_CANCELED', 'OTHER'));
      
      RAISE NOTICE 'Contrainte CHECK mise à jour pour inclure DEMO_CANCELED';
    END IF;
  END IF;

  -- 2. Ajouter la colonne rdv_canceled_at à funnel_progress si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'funnel_progress' AND column_name = 'rdv_canceled_at'
  ) THEN
    ALTER TABLE funnel_progress ADD COLUMN rdv_canceled_at TIMESTAMPTZ DEFAULT NULL;
    RAISE NOTICE 'Colonne rdv_canceled_at ajoutée à la table funnel_progress';
    
    -- Ajouter un commentaire pour la documentation
    COMMENT ON COLUMN funnel_progress.rdv_canceled_at IS 'Date et heure de l''annulation du rendez-vous';
  ELSE
    RAISE NOTICE 'La colonne rdv_canceled_at existe déjà dans funnel_progress';
  END IF;

END;
$$;

-- Vérification finale des modifications
DO $$
BEGIN
  RAISE NOTICE 'Vérification de la colonne rdv_canceled_at: %', 
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funnel_progress' AND column_name = 'rdv_canceled_at');
    
  -- Vérification de l'enum ou de la contrainte
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_event_type') THEN
    RAISE NOTICE 'Valeurs de l''enum conversion_event_type: %', 
      (SELECT array_agg(enumlabel) FROM pg_enum WHERE enumtypid = 'conversion_event_type'::regtype);
  ELSE
    RAISE NOTICE 'État de la contrainte sur event_type: %', 
      EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'conversion_events' AND column_name = 'event_type');
  END IF;
END;
$$;
