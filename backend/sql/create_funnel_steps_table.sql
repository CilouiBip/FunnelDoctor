-- Migration pour créer la table funnel_steps
CREATE TABLE IF NOT EXISTS funnel_steps (
    step_id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    color VARCHAR(20),
    position INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pour mettre à jour automatiquement le champ updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_funnel_steps_modtime
    BEFORE UPDATE ON funnel_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Index pour accélérer les recherches par user_id
CREATE INDEX IF NOT EXISTS idx_funnel_steps_user_id ON funnel_steps(user_id);

-- Index pour optimiser le tri par position
CREATE INDEX IF NOT EXISTS idx_funnel_steps_position ON funnel_steps(position);
