-- Migration : Lead Status History
-- Date : 2025-03-20

-- Tableaux de statuts possibles pour un lead
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE lead_status AS ENUM (
      'new',
      'contacted',
      'qualified',
      'negotiation',
      'won',
      'lost'
    );
  END IF;
END
$$;

-- Table d'historique des statuts de lead
CREATE TABLE IF NOT EXISTS lead_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  previous_status lead_status,
  new_status lead_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES users(id),
  note TEXT
);

-- Index pour des recherches optimisées
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id 
  ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_new_status 
  ON lead_status_history(new_status);

-- Vérifier et ajouter la colonne changed_at si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_status_history' AND column_name = 'changed_at') THEN
    ALTER TABLE lead_status_history ADD COLUMN changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END
$$;

-- Créer l'index sur changed_at après s'être assuré que la colonne existe
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at 
  ON lead_status_history(changed_at);

-- Trigger pour enregistrer automatiquement les changements de statut des leads
CREATE OR REPLACE FUNCTION record_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Vu00e9rifier si le statut a changé
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR
     (TG_OP = 'INSERT' AND NEW.status IS NOT NULL) THEN
    
    -- Insu00e9rer dans l'historique
    INSERT INTO lead_status_history (
      lead_id, 
      previous_status, 
      new_status, 
      changed_by
    ) VALUES (
      NEW.id, 
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::lead_status ELSE NULL END,
      NEW.status::lead_status, 
      COALESCE(auth.uid(), NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur les leads pour les mises u00e0 jour et insertions
DROP TRIGGER IF EXISTS lead_status_change ON leads;
CREATE TRIGGER lead_status_change
AFTER INSERT OR UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION record_lead_status_change();

-- Row Level Security pour l'historique
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;

-- Politique pour l'historique - accès uniquement par le propriétaire du lead
CREATE POLICY lead_status_history_policy ON lead_status_history
USING (EXISTS (
  SELECT 1 FROM leads 
  WHERE leads.id = lead_status_history.lead_id 
  AND leads.user_id = auth.uid()
));
