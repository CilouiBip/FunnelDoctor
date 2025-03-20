-- Table pour stocker les événements de conversion
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id UUID NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- VISIT, SIGNUP, DEMO_REQUEST, TRIAL_STARTED, PURCHASE_MADE, etc.
  event_data JSONB DEFAULT '{}'::jsonb,
  page_url TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  site_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  tracking_link_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ajout d'index pour des performances optimales
  CONSTRAINT valid_event_type CHECK (
    event_type IN ('VISIT', 'SIGNUP', 'DEMO_REQUEST', 'TRIAL_STARTED', 'PURCHASE_MADE', 'FORM_SUBMIT', 'BUTTON_CLICK', 'PAGE_VIEW', 'CONTENT_VIEW')
  )
);

-- Création d'index sur les colonnes fréquemment utilisées dans les recherches et agrégations
CREATE INDEX IF NOT EXISTS idx_conversion_events_visitor_id ON conversion_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_lead_id ON conversion_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_events_site_id ON conversion_events(site_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_utm_source ON conversion_events(utm_source);

-- Fonction pour calculer le nombre d'événements par type pour un lead
CREATE OR REPLACE FUNCTION get_lead_events_count(p_lead_id UUID)
RETURNS TABLE (event_type TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT ce.event_type, COUNT(*) as count
  FROM conversion_events ce
  WHERE ce.lead_id = p_lead_id
  GROUP BY ce.event_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour automatiquement le statut d'un lead en fonction des événements
CREATE OR REPLACE FUNCTION update_lead_status_from_event()
RETURNS TRIGGER AS $$
DECLARE
  lead_current_status TEXT;
BEGIN
  -- Si l'événement n'est pas associé à un lead, on ne fait rien
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Récupérer le statut actuel du lead
  SELECT status INTO lead_current_status FROM leads WHERE id = NEW.lead_id;
  
  -- Mises à jour conditionnelles du statut en fonction du type d'événement
  -- Ces règles peuvent être ajustées selon les besoins métier
  IF NEW.event_type = 'PURCHASE_MADE' AND lead_current_status != 'won' THEN
    UPDATE leads SET status = 'won', updated_at = NOW() WHERE id = NEW.lead_id;
  ELSIF NEW.event_type = 'DEMO_REQUEST' AND lead_current_status = 'new' THEN
    UPDATE leads SET status = 'qualified', updated_at = NOW() WHERE id = NEW.lead_id;
  ELSIF NEW.event_type = 'TRIAL_STARTED' AND (lead_current_status = 'new' OR lead_current_status = 'contacted' OR lead_current_status = 'qualified') THEN
    UPDATE leads SET status = 'negotiation', updated_at = NOW() WHERE id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le statut du lead lors de nouveaux événements de conversion
DROP TRIGGER IF EXISTS update_lead_status_trigger ON conversion_events;
CREATE TRIGGER update_lead_status_trigger
AFTER INSERT ON conversion_events
FOR EACH ROW
EXECUTE FUNCTION update_lead_status_from_event();
