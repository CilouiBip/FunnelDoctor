-- add_bridging_fields.sql
-- Migration pour la mise en place du système de bridging Visitor-Lead
-- Date : 2025-03-21

-- 1. Ajout des champs pour la table leads
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS value NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS source_data JSONB DEFAULT '{}'::jsonb;

-- 2. Ajout des nouvelles valeurs au type enum conversion_event_type
DO $$
BEGIN
    -- Ajouter les nouvelles valeurs à l'enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_event_type' AND 
                  'FORM_SUBMIT' = ANY(enum_range(NULL::conversion_event_type)::text[])) THEN
        ALTER TYPE conversion_event_type ADD VALUE 'FORM_SUBMIT';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_event_type' AND 
                  'BUTTON_CLICK' = ANY(enum_range(NULL::conversion_event_type)::text[])) THEN
        ALTER TYPE conversion_event_type ADD VALUE 'BUTTON_CLICK';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_event_type' AND 
                  'PAGE_VIEW' = ANY(enum_range(NULL::conversion_event_type)::text[])) THEN
        ALTER TYPE conversion_event_type ADD VALUE 'PAGE_VIEW';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_event_type' AND 
                  'CONTENT_VIEW' = ANY(enum_range(NULL::conversion_event_type)::text[])) THEN
        ALTER TYPE conversion_event_type ADD VALUE 'CONTENT_VIEW';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_event_type' AND 
                  'PAYMENT' = ANY(enum_range(NULL::conversion_event_type)::text[])) THEN
        ALTER TYPE conversion_event_type ADD VALUE 'PAYMENT';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_event_type' AND 
                  'RDV' = ANY(enum_range(NULL::conversion_event_type)::text[])) THEN
        ALTER TYPE conversion_event_type ADD VALUE 'RDV';
    END IF;
END$$;

-- Mise à jour des contraintes event_type
ALTER TABLE conversion_events 
DROP CONSTRAINT IF EXISTS valid_event_type;

ALTER TABLE conversion_events 
ADD CONSTRAINT valid_event_type CHECK (
  event_type IN ('VISIT', 'SIGNUP', 'DEMO_REQUEST', 'TRIAL_STARTED', 'PURCHASE_MADE', 
                'FORM_SUBMIT', 'BUTTON_CLICK', 'PAGE_VIEW', 'CONTENT_VIEW', 'PAYMENT', 'RDV')
);

-- 3. Ajout d'index pour optimiser les requêtes de bridging
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_converted_at ON leads(converted_at);

-- 4. Ajout d'un nouveau statut 'merged' pour les leads fusionnés
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status' AND 
                  'merged' = ANY(enum_range(NULL::lead_status)::text[])) THEN
        ALTER TYPE lead_status ADD VALUE 'merged' AFTER 'lost';
    END IF;
END$$;

-- 5. Ajout d'une colonne notes pour documenter les fusions de leads
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 6. Fonction pour fusionner des leads (lors du bridging)
CREATE OR REPLACE FUNCTION merge_leads(
    source_lead_id UUID,
    target_lead_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    success BOOLEAN;
BEGIN
    -- Mise à jour du status du lead source à 'merged'
    UPDATE leads
    SET status = 'merged',
        notes = COALESCE(notes, '') || 'Merged with lead ' || target_lead_id || ' on ' || NOW() || ';'
    WHERE id = source_lead_id;
    
    -- Mise à jour des visiteurs associés au lead source
    UPDATE visitors
    SET lead_id = target_lead_id
    WHERE lead_id = source_lead_id;
    
    -- Mise à jour des événements de conversion associés au lead source
    UPDATE conversion_events
    SET lead_id = target_lead_id
    WHERE lead_id = source_lead_id;
    
    success := FOUND;
    
    RETURN success;
END;
$$ LANGUAGE plpgsql;
