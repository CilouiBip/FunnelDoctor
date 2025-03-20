require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials are missing. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeQuery(query) {
  try {
    console.log(`Executing query: ${query}`);
    
    // Utiliser la fonction PostgreSQL pour exécuter la requête SQL
    const { data, error } = await supabase.rpc('run_sql', { sql: query });
    
    if (error) {
      console.error('Error executing query:', error);
      process.exit(1);
    }
    
    console.log('Query executed successfully');
    console.log('Result:', data);
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function queryTable(tableName, limit = 10) {
  try {
    console.log(`Querying table: ${tableName}`);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(limit);
    
    if (error) {
      console.error('Error querying table:', error);
      process.exit(1);
    }
    
    console.log(`Table ${tableName} data:`);
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function updateLeadStatus(leadId, newStatus, comment = '') {
  try {
    console.log(`Updating lead ${leadId} status to: ${newStatus}`);
    
    const { data, error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating lead status:', error);
      return null;
    }
    
    console.log('Lead status updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function checkLeadStatusHistory(leadId, limit = 10) {
  try {
    console.log(`Checking lead status history for lead: ${leadId}`);
    
    const { data, error } = await supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error querying lead status history:', error);
      return null;
    }
    
    console.log(`Found ${data.length} history entries:`);
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function createConversionEvent(leadId, eventType, eventData = {}, amount = null) {
  try {
    console.log(`Creating conversion event for lead ${leadId}, type: ${eventType}`);
    
    // Récupérer l'utilisateur pour associer à l'événement
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('Error getting user for conversion event:', userError || 'No users found');
      return null;
    }
    
    const userId = users[0].id;
    
    const { data, error } = await supabase
      .from('conversion_events')
      .insert({
        lead_id: leadId,
        event_type: eventType,
        event_data: eventData,
        amount: amount,
        user_id: userId
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating conversion event:', error);
      return null;
    }
    
    console.log('Conversion event created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function createD1Tables() {
  // Lire le fichier SQL pour D1
  const fs = require('fs');
  const path = require('path');
  const sqlPath = path.resolve(__dirname, '../sql/lead_status_history.sql');
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    return false;
  }
  
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Afficher le contenu SQL pour copier-coller dans l'interface Supabase
  console.log('\n===== SCRIPT SQL POUR CRÉER LA TABLE LEAD_STATUS_HISTORY ET LE TRIGGER =====');
  console.log(sqlContent);
  console.log('\n=== COPIEZ CE SCRIPT DANS L\'INTERFACE SQL DE SUPABASE ET EXÉCUTEZ-LE ===');
  
  return true;
}

async function createD2Tables() {
  const createConversionEventsTableQuery = `
    -- Table pour stocker les événements de conversion
    CREATE TABLE IF NOT EXISTS conversion_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_data JSONB DEFAULT '{}'::jsonb,
      amount NUMERIC(10,2),
      user_id UUID REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Contraintes et index
      CONSTRAINT fk_leads FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      CONSTRAINT fk_users FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    -- Index pour optimiser les performances
    CREATE INDEX IF NOT EXISTS idx_conversion_events_lead_id ON conversion_events(lead_id);
    CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type ON conversion_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON conversion_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON conversion_events(user_id);
  `;
  
  console.log('\n===== SCRIPT SQL POUR CRÉER LA TABLE CONVERSION_EVENTS =====');
  console.log(createConversionEventsTableQuery);
  console.log('\n=== COPIEZ CE SCRIPT DANS L\'INTERFACE SQL DE SUPABASE ET EXÉCUTEZ-LE ===');
  
  return true;
}

async function checkStatusHistoryWorks() {
  console.log('\n===== TEST DE VALIDATION DE L\'HISTORIQUE DES STATUTS =====');
  
  // 1. Récupérer un lead existant
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, name, email, status')
    .limit(1);
  
  if (leadsError || !leads || leads.length === 0) {
    console.error('Erreur ou aucun lead trouvé:', leadsError || 'Pas de leads');
    return false;
  }
  
  const lead = leads[0];
  console.log(`Lead utilisé pour le test: ID=${lead.id}, Nom=${lead.name}, Statut actuel=${lead.status}`);
  
  // 2. Déterminer le nouveau statut à appliquer
  let newStatus;
  if (lead.status === 'new') newStatus = 'contacted';
  else if (lead.status === 'contacted') newStatus = 'qualified';
  else if (lead.status === 'qualified') newStatus = 'negotiation';
  else if (lead.status === 'negotiation') newStatus = 'won';
  else if (lead.status === 'won') newStatus = 'new'; // Pour reboucler
  else if (lead.status === 'lost') newStatus = 'new'; // Pour reboucler
  else newStatus = 'contacted'; // Valeur par défaut
  
  console.log(`Transition à tester: ${lead.status} -> ${newStatus}`);
  
  // 3. Changer le statut du lead
  const updatedLead = await updateLeadStatus(lead.id, newStatus);
  if (!updatedLead) {
    console.error('Échec de la mise à jour du statut');
    return false;
  }
  
  // 4. Vérifier l'historique
  console.log('\nAttendu: une entrée dans lead_status_history avec old_status=' + lead.status + ' et new_status=' + newStatus);
  console.log('Vérification de l\'historique après 2 secondes pour laisser le temps au trigger de s\'exécuter...');
  
  // Attendre 2 secondes pour que le trigger s'exécute
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const history = await checkLeadStatusHistory(lead.id, 1);
  if (!history || history.length === 0) {
    console.error('Aucune entrée d\'historique trouvée ! Le trigger ne fonctionne pas correctement.');
    return false;
  }
  
  // 5. Vérifier si l'entrée d'historique correspond à notre changement
  const lastEntry = history[0];
  const successful = lastEntry.old_status === lead.status && lastEntry.new_status === newStatus;
  
  if (successful) {
    console.log('\n✅ TEST RÉUSSI: Le système d\'historisation des statuts fonctionne correctement!');
  } else {
    console.log('\n❌ TEST ÉCHOUÉ: L\'entrée d\'historique ne correspond pas aux statuts attendus');
    console.log(`Attendu: old_status=${lead.status}, new_status=${newStatus}`);  
    console.log(`Trouvé: old_status=${lastEntry.old_status}, new_status=${lastEntry.new_status}`);  
  }
  
  return successful;
}

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.error('Please provide a command');
    console.log('Commands disponibles:');
    console.log('- query <sql>: Exécuter une requête SQL');
    console.log('- select-table <table> [limit]: Afficher les données d\'une table');
    console.log('- update-lead-status <lead_id> <new_status>: Mettre à jour le statut d\'un lead');
    console.log('- check-history <lead_id>: Vérifier l\'historique des statuts d\'un lead');
    console.log('- create-d1-tables: Générer le script SQL pour la table d\'historique et le trigger');
    console.log('- create-d2-tables: Générer le script SQL pour la table d\'événements de conversion');
    console.log('- validate-d1: Tester le fonctionnement du système d\'historisation des statuts');
    console.log('- create-event <lead_id> <event_type> [amount]: Créer un événement de conversion');
    process.exit(1);
  }
  
  if (command === 'query') {
    const query = process.argv[3];
    if (!query) {
      console.error('Please provide a SQL query as an argument');
      process.exit(1);
    }
    await executeQuery(query);
  } else if (command === 'select-table') {
    const tableName = process.argv[3];
    const limit = process.argv[4] || 10;
    if (!tableName) {
      console.error('Please provide a table name');
      process.exit(1);
    }
    await queryTable(tableName, limit);
  } else if (command === 'update-lead-status') {
    const leadId = process.argv[3];
    const newStatus = process.argv[4];
    const comment = process.argv[5] || '';
    if (!leadId || !newStatus) {
      console.error('Please provide a lead ID and new status');
      process.exit(1);
    }
    await updateLeadStatus(leadId, newStatus, comment);
  } else if (command === 'check-history') {
    const leadId = process.argv[3];
    const limit = process.argv[4] || 10;
    if (!leadId) {
      console.error('Please provide a lead ID');
      process.exit(1);
    }
    await checkLeadStatusHistory(leadId, limit);
  } else if (command === 'create-d1-tables') {
    await createD1Tables();
  } else if (command === 'create-d2-tables') {
    await createD2Tables();
  } else if (command === 'validate-d1') {
    await checkStatusHistoryWorks();
  } else if (command === 'create-event') {
    const leadId = process.argv[3];
    const eventType = process.argv[4];
    const amount = process.argv[5] ? parseFloat(process.argv[5]) : null;
    if (!leadId || !eventType) {
      console.error('Please provide a lead ID and event type');
      process.exit(1);
    }
    await createConversionEvent(leadId, eventType, {}, amount);
  } else {
    console.error('Unknown command.');
    process.exit(1);
  }
}

main();
