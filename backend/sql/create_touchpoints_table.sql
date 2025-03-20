CREATE TABLE IF NOT EXISTS touchpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id VARCHAR(255) NOT NULL REFERENCES visitors(visitor_id),
    tracking_link_id UUID REFERENCES tracking_links(id),
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB DEFAULT '{}',
    page_url TEXT,
    user_agent TEXT,
    ip_address TEXT, 
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les recherches optimisées
CREATE INDEX IF NOT EXISTS idx_touchpoints_visitor_id ON touchpoints(visitor_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_event_type ON touchpoints(event_type);
CREATE INDEX IF NOT EXISTS idx_touchpoints_created_at ON touchpoints(created_at);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER set_timestamp_touchpoints
BEFORE UPDATE ON touchpoints
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Row Level Security (RLS)
ALTER TABLE touchpoints ENABLE ROW LEVEL SECURITY;

-- Politique par défaut - Autoriser toutes les opérations pour les services backend
-- Cette politique sera affinée ultérieurement pour limiter l'accès par user_id
CREATE POLICY touchpoints_policy ON touchpoints FOR ALL USING (true);
