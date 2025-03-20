/**
 * Script pour cru00e9er la table lead_status_history via l'API Supabase
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials are missing. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createHistoryTable() {
  console.log('Creating lead_status_history table...');
  
  try {
    // Vu00e9rifier si la table existe du00e9ju00e0
    const { error: checkError } = await supabase
      .from('lead_status_history')
      .select('id')
      .limit(1);
      
    if (!checkError) {
      console.log('Table lead_status_history already exists!');
      return true;
    }
    
    if (checkError.code !== '42P01') {
      // Si l'erreur n'est pas "table does not exist", c'est une autre erreur
      console.error('Unexpected error checking table:', checkError);
      return false;
    }
    
    // Cru00e9er la table - mu00e9thode alternative via API supabase.schema
    console.log('Table does not exist, creating it now...');
    
    // Pour le moment, nous devons dire u00e0 l'utilisateur de le faire manuellement
    console.log(`\n\n=== IMPORTANT ACTION REQUISE ===`);
    console.log(`La fonction run_sql n'est pas disponible dans notre instance Supabase.`);
    console.log(`Veuillez exu00e9cuter le script SQL suivant dans l'interface SQL de Supabase:\n`);
    
    // Afficher le SQL u00e0 exu00e9cuter
    console.log(`-- Table pour stocker l'historique des changements de statut des leads
` +
`CREATE TABLE IF NOT EXISTS lead_status_history (
` +
`  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
` +
`  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
` +
`  old_status TEXT,
` +
`  new_status TEXT NOT NULL,
` +
`  user_id UUID REFERENCES users(id),
` +
`  comment TEXT,
` +
`  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
` +
`);
` +
`
` +
`-- Cru00e9ation d'index sur les colonnes fru00e9quemment utilisu00e9es dans les recherches
` +
`CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
` +
`CREATE INDEX IF NOT EXISTS idx_lead_status_history_user_id ON lead_status_history(user_id);
` +
`CREATE INDEX IF NOT EXISTS idx_lead_status_history_created_at ON lead_status_history(created_at);
` +
`
` +
`-- Fonction trigger pour enregistrer les changements de statut
` +
`CREATE OR REPLACE FUNCTION log_lead_status_change()
` +
`RETURNS TRIGGER AS $$
` +
`BEGIN
` +
`  -- Ignorer si le statut n'a pas changu00e9
` +
`  IF OLD.status = NEW.status THEN
` +
`    RETURN NEW;
` +
`  END IF;
` +
`  
` +
`  -- Insu00e9rer une entru00e9e dans la table d'historique
` +
`  INSERT INTO lead_status_history (lead_id, old_status, new_status, user_id)
` +
`  VALUES (NEW.id, OLD.status, NEW.status, NEW.user_id);
` +
`  
` +
`  RETURN NEW;
` +
`END;
` +
`$$ LANGUAGE plpgsql;
` +
`
` +
`-- Cru00e9ation du trigger sur la table leads
` +
`DROP TRIGGER IF EXISTS lead_status_change_trigger ON leads;
` +
`CREATE TRIGGER lead_status_change_trigger
` +
`AFTER UPDATE OF status ON leads
` +
`FOR EACH ROW
` +
`EXECUTE FUNCTION log_lead_status_change();`);
    
    console.log(`\n=== FIN DU SCRIPT SQL ===`);
    console.log(`Apru00e8s avoir exu00e9cutu00e9 ce script dans l'interface SQL de Supabase,`);
    console.log(`exu00e9cutez la commande suivante pour tester le fonctionnement:`);
    console.log(`  node scripts/supabase-admin.js validate-d1`);
    
    return false;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

async function main() {
  const success = await createHistoryTable();
  console.log(success ? 'Operations completed successfully' : 'Some operations failed');
  process.exit(success ? 0 : 1);
}

main();
