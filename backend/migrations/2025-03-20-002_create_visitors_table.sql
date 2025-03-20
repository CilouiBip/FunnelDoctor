-- Migration : Cru00e9ation de la table visitors
-- Date : 2025-03-20

CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id VARCHAR(255) NOT NULL UNIQUE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT,
    lead_id UUID REFERENCES leads(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les recherches optimisu00e9es
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_id ON visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitors_lead_id ON visitors(lead_id);

-- Trigger pour mettre u00e0 jour updated_at
CREATE TRIGGER set_timestamp_visitors
BEFORE UPDATE ON visitors
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Row Level Security (RLS)
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Politique par du00e9faut - Autoriser toutes les opu00e9rations
CREATE POLICY visitors_policy ON visitors FOR ALL USING (true);
