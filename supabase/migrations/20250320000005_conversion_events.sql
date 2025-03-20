-- Migration : Conversion Events
-- Date : 2025-03-20

-- Types d'u00e9vu00e9nements de conversion possibles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_event_type') THEN
    CREATE TYPE conversion_event_type AS ENUM (
      'VISIT',
      'SIGNUP',
      'DEMO_REQUEST',
      'TRIAL_STARTED',
      'PURCHASE_MADE',
      'CONTACT_FORM',
      'DOWNLOAD',
      'EMAIL_CLICK',
      'CUSTOM'
    );
  END IF;
END
$$;

-- Table des u00e9vu00e9nements de conversion
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type conversion_event_type NOT NULL,
  event_data JSONB DEFAULT '{}', -- Donnu00e9es spu00e9cifiques u00e0 l'u00e9vu00e9nement
  touchpoint_id UUID REFERENCES touchpoints(id), -- Lien optionnel vers un touchpoint
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) -- Utilisateur qui a enregistru00e9 l'u00e9vu00e9nement
);

-- Index pour des recherches optimisées
CREATE INDEX IF NOT EXISTS idx_conversion_events_lead_id 
  ON conversion_events(lead_id);

-- Vérifier et ajouter la colonne event_type si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversion_events' AND column_name = 'event_type') THEN
    ALTER TABLE conversion_events ADD COLUMN event_type conversion_event_type NOT NULL DEFAULT 'CUSTOM';
  END IF;
END
$$;

-- Créer l'index sur event_type après s'être assuré que la colonne existe
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type 
  ON conversion_events(event_type);

-- Vérifier et ajouter la colonne created_at si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversion_events' AND column_name = 'created_at') THEN
    ALTER TABLE conversion_events ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END
$$;

-- Créer l'index sur created_at après s'être assuré que la colonne existe
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at 
  ON conversion_events(created_at);

-- Trigger pour mettre u00e0 jour updated_at
CREATE TRIGGER set_timestamp_conversion_events
BEFORE UPDATE ON conversion_events
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Fonction pour la transition automatique de statut de lead en fonction des u00e9vu00e9nements
CREATE OR REPLACE FUNCTION update_lead_status_from_conversion()
RETURNS TRIGGER AS $$
DECLARE
  lead_current_status TEXT;
BEGIN
  -- Ru00e9cupu00e9rer le statut actuel du lead
  SELECT status INTO lead_current_status
  FROM leads WHERE id = NEW.lead_id;
  
  -- Appliquer les ru00e8gles de transition automatique basu00e9es sur le type d'u00e9vu00e9nement
  IF NEW.event_type = 'PURCHASE_MADE' THEN
    -- Si achat, passer au statut 'won'
    UPDATE leads SET status = 'won' WHERE id = NEW.lead_id AND status != 'won';
    
  ELSIF NEW.event_type = 'DEMO_REQUEST' AND lead_current_status IN ('new', 'contacted') THEN
    -- Si demande de du00e9mo et statut infu00e9rieur, passer u00e0 'qualified'
    UPDATE leads SET status = 'qualified' WHERE id = NEW.lead_id;
    
  ELSIF NEW.event_type = 'TRIAL_STARTED' AND lead_current_status IN ('new', 'contacted', 'qualified') THEN
    -- Si essai du00e9marru00e9 et statut infu00e9rieur, passer u00e0 'negotiation'
    UPDATE leads SET status = 'negotiation' WHERE id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger pour les mises u00e0 jour automatiques de statut
DROP TRIGGER IF EXISTS conversion_updates_lead_status ON conversion_events;
CREATE TRIGGER conversion_updates_lead_status
AFTER INSERT ON conversion_events
FOR EACH ROW
EXECUTE FUNCTION update_lead_status_from_conversion();

-- Row Level Security pour les u00e9vu00e9nements de conversion
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

-- Politique pour les u00e9vu00e9nements - accu00e8s uniquement par le propriu00e9taire du lead
CREATE POLICY conversion_events_policy ON conversion_events
USING (EXISTS (
  SELECT 1 FROM leads 
  WHERE leads.id = conversion_events.lead_id 
  AND leads.user_id = auth.uid()
));
