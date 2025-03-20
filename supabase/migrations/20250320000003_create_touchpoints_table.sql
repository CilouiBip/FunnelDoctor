-- Migration : Cru00e9ation de la table touchpoints
-- Date : 2025-03-20

-- Supprimer la table existante qui pourrait contenir des erreurs
DROP TABLE IF EXISTS touchpoints;

-- Recru00e9er la table avec la bonne ru00e9fu00e9rence
CREATE TABLE IF NOT EXISTS touchpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id VARCHAR(255) NOT NULL,  
    tracking_link_id UUID REFERENCES tracking_links(id),
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB DEFAULT '{}',
    page_url TEXT,
    user_agent TEXT,
    ip_address TEXT, 
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Contrainte de clu00e9 u00e9trangère corrigu00e9e:
    CONSTRAINT fk_visitor FOREIGN KEY (visitor_id) REFERENCES visitors(visitor_id)
);

-- Index pour les recherches optimisu00e9es
CREATE INDEX IF NOT EXISTS idx_touchpoints_visitor_id ON touchpoints(visitor_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_event_type ON touchpoints(event_type);
CREATE INDEX IF NOT EXISTS idx_touchpoints_created_at ON touchpoints(created_at);

-- Trigger pour mettre u00e0 jour updated_at
CREATE TRIGGER set_timestamp_touchpoints
BEFORE UPDATE ON touchpoints
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Row Level Security (RLS)
ALTER TABLE touchpoints ENABLE ROW LEVEL SECURITY;

-- Politique par du00e9faut - Autoriser toutes les opu00e9rations
CREATE POLICY touchpoints_policy ON touchpoints FOR ALL USING (true);
