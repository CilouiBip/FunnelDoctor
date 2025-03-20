-- Cr\u00e9ation du type enum pour les status de lead
CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted', 
  'qualified', 
  'negotiation', 
  'won', 
  'lost'
);

-- Mise \u00e0 jour de la table leads pour utiliser le type enum
ALTER TABLE leads
  ALTER COLUMN status TYPE lead_status USING status::lead_status,
  ALTER COLUMN status SET DEFAULT 'new'::lead_status;

-- Cr\u00e9ation de la table d'historique des statuts de lead
CREATE TABLE IF NOT EXISTS lead_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
  old_status lead_status,
  new_status lead_status NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activation du Row Level Security (RLS) sur la nouvelle table
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;

-- Cr\u00e9ation d'une politique RLS pour la table lead_status_history
CREATE POLICY lead_status_history_policy ON lead_status_history
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cr\u00e9ation d'un trigger pour enregistrer automatiquement les changements de statut
CREATE OR REPLACE FUNCTION trigger_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_status_history (lead_id, user_id, old_status, new_status)
    VALUES (NEW.id, NEW.user_id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application du trigger sur la table leads
CREATE TRIGGER record_lead_status_change
AFTER UPDATE ON leads
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trigger_lead_status_change();
