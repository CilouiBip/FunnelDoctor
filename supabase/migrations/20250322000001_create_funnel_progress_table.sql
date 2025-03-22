-- Migration : Création de la table funnel_progress
-- Date : 2025-03-22

CREATE TABLE IF NOT EXISTS funnel_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id TEXT,
  current_stage TEXT NOT NULL, -- 'rdv_scheduled', 'rdv_completed', 'payment_succeeded'
  rdv_scheduled_at TIMESTAMP,
  rdv_completed_at TIMESTAMP,
  payment_at TIMESTAMP,
  amount NUMERIC(10,2),
  product_id TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches optimisées
CREATE INDEX IF NOT EXISTS idx_funnel_progress_visitor_id ON funnel_progress(visitor_id);
CREATE INDEX IF NOT EXISTS idx_funnel_progress_current_stage ON funnel_progress(current_stage);
CREATE INDEX IF NOT EXISTS idx_funnel_progress_user_id ON funnel_progress(user_id);

-- Créer une reference à visitors
ALTER TABLE funnel_progress
ADD CONSTRAINT fk_visitor_id
FOREIGN KEY (visitor_id)
REFERENCES visitors(visitor_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER set_timestamp_funnel_progress
BEFORE UPDATE ON funnel_progress
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Row Level Security (RLS)
ALTER TABLE funnel_progress ENABLE ROW LEVEL SECURITY;

-- Politique par défaut - Autoriser toutes les opérations
CREATE POLICY funnel_progress_policy ON funnel_progress FOR ALL USING (true);
