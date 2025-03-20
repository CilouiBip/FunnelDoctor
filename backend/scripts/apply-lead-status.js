const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Utiliser la clu00e9 de service pour les opu00e9rations admin

// Cru00e9ation du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Script SQL pour cru00e9er le type enum et la table d'historique
const SQL_SCRIPT = `
-- Cru00e9ation du type enum pour les status de lead
CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted', 
  'qualified', 
  'negotiation', 
  'won', 
  'lost'
);

-- Mise u00e0 jour de la table leads pour utiliser le type enum
ALTER TABLE leads
  ALTER COLUMN status TYPE lead_status USING status::lead_status,
  ALTER COLUMN status SET DEFAULT 'new'::lead_status;

-- Cru00e9ation de la table d'historique des statuts de lead
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

-- Cru00e9ation d'une politique RLS pour la table lead_status_history
CREATE POLICY lead_status_history_policy ON lead_status_history
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cru00e9ation d'un trigger pour enregistrer automatiquement les changements de statut
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
`;

async function applyLeadStatusChanges() {
  console.log('Application des modifications pour le systu00e8me de statut des leads...');
  
  try {
    // Exu00e9cuter le script SQL via l'API Supabase
    const { error } = await supabase.rpc('pg_execute', { query_text: SQL_SCRIPT });
    
    if (error) {
      console.error('Erreur lors de l\'application des modifications:', error);
      return;
    }
    
    console.log('Modifications appliquu00e9es avec succu00e8s!');
    console.log('Systu00e8me de statut des leads installu00e9 :');
    console.log('- Type enum \'lead_status\' cru00e9u00e9');
    console.log('- Colonne \'status\' de la table \'leads\' convertie en lead_status');
    console.log('- Table \'lead_status_history\' cru00e9u00e9e');
    console.log('- Trigger de suivi des changements de statut installu00e9');
  } catch (err) {
    console.error('Exception lors de l\'exu00e9cution du script:', err);
  }
}

applyLeadStatusChanges();
