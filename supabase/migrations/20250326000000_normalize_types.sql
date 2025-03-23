-- Script de migration 20250326000000_normalize_types.sql
-- Date: 2025-03-26
-- Description: Normalisation des types et enums pour la Phase 2.2

-- 1. Standardisation des types d\'\u00e9tapes du funnel
DO $$
BEGIN
  -- V\u00e9rifier si le type n\'existe pas d\u00e9j\u00e0
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funnel_stage') THEN
    CREATE TYPE funnel_stage AS ENUM (
      'visit', 'lead_capture', 'rdv_scheduled', 'rdv_canceled', 'rdv_completed', 'proposal_sent', 'negotiation', 'won', 'lost'
    );
    RAISE NOTICE 'Type funnel_stage cr\u00e9\u00e9 avec succ\u00e8s';
  ELSE
    RAISE NOTICE 'Type funnel_stage existe d\u00e9j\u00e0';
  END IF;
END;
$$;

-- 2. Documentation des valeurs accept\u00e9es pour conversion_event_type
DO $$
BEGIN
  -- Commentaire sur le type existant
  EXECUTE 'COMMENT ON TYPE conversion_event_type IS ''Types standardis\u00e9s d''\u00e9v\u00e9nements de conversion: PAYMENT, SIGNUP, LOGIN, DEMO_SCHEDULED, DEMO_CANCELED, OTHER''';
  RAISE NOTICE 'Commentaire ajout\u00e9 sur le type conversion_event_type';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Impossible d''ajouter un commentaire sur conversion_event_type: %', SQLERRM;
END;
$$;

-- 3. Ajouter des cat\u00e9gories d\'\u00e9v\u00e9nements pour une meilleure organisation
DO $$
BEGIN
  -- Ajouter les colonnes si elles n\'existent pas d\u00e9j\u00e0
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversion_events' AND column_name = 'event_category') THEN
    ALTER TABLE conversion_events ADD COLUMN event_category VARCHAR(50) NULL;
    RAISE NOTICE 'Colonne event_category ajout\u00e9e \u00e0 conversion_events';
  ELSE
    RAISE NOTICE 'Colonne event_category existe d\u00e9j\u00e0';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversion_events' AND column_name = 'source_system') THEN
    ALTER TABLE conversion_events ADD COLUMN source_system VARCHAR(50) NULL;
    RAISE NOTICE 'Colonne source_system ajout\u00e9e \u00e0 conversion_events';
  ELSE
    RAISE NOTICE 'Colonne source_system existe d\u00e9j\u00e0';
  END IF;
END;
$$;

-- 4. Commentaires pour les nouvelles colonnes
COMMENT ON COLUMN conversion_events.event_category IS 'Cat\u00e9gorie de l''\u00e9v\u00e9nement (marketing, vente, support, etc.)';
COMMENT ON COLUMN conversion_events.source_system IS 'Syst\u00e8me source de l''\u00e9v\u00e9nement (site web, CRM, Calendly, etc.)';

-- V\u00e9rification finale des modifications
DO $$
BEGIN
  RAISE NOTICE 'V\u00e9rification des colonnes ajout\u00e9es:';
  RAISE NOTICE 'event_category: %', 
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversion_events' AND column_name = 'event_category');
  RAISE NOTICE 'source_system: %', 
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversion_events' AND column_name = 'source_system');
  RAISE NOTICE 'Type funnel_stage: %', 
    EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funnel_stage');
END;
$$;
