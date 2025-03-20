-- Table pour stocker l'historique des changements de statut des leads
CREATE TABLE IF NOT EXISTS lead_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ajout d'index pour des performances optimales lors des requêtes
  CONSTRAINT fk_leads FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Création d'index sur les colonnes fréquemment utilisées dans les recherches
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_user_id ON lead_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_created_at ON lead_status_history(created_at);

-- Fonction trigger pour enregistrer les changements de statut
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Ignorer si le statut n'a pas changé
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Insérer une entrée dans la table d'historique
  INSERT INTO lead_status_history (lead_id, old_status, new_status, user_id)
  VALUES (NEW.id, OLD.status, NEW.status, NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du trigger sur la table leads
DROP TRIGGER IF EXISTS lead_status_change_trigger ON leads;
CREATE TRIGGER lead_status_change_trigger
AFTER UPDATE OF status ON leads
FOR EACH ROW
EXECUTE FUNCTION log_lead_status_change();
