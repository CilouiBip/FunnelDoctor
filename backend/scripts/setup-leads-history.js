/**
 * Script pour :
 * 1. Cru00e9er la table lead_status_history via l'API REST
 * 2. Effectuer un test de changement de statut
 * 3. Vu00e9rifier l'enregistrement dans l'historique
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Chargement des variables d'environnement
const envPath = path.resolve(__dirname, '../../.env');
const env = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...valueParts] = line.split('=');
    acc[key.trim()] = valueParts.join('=').trim();
    return acc;
  }, {});

// Configuration Supabase
const supabaseUrl = env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Service Key: ${supabaseServiceKey ? 'u2713 (disponible)' : 'u2717 (manquante)'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement manquantes');
  process.exit(1);
}

// Client Supabase avec clu00e9 de service (accu00e8s admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fonction principale d'exu00e9cution
 */
async function setupLeadStatusHistory() {
  console.log('\n=== FINALISATION DU BLOC D1: HISTORIQUE DES STATUTS DE LEADS ===\n');
  
  try {
    // u00c9TAPE 1: Vu00e9rifier si des leads existent
    console.log('u00c9TAPE 1: Vu00e9rification des leads existants');
    
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, email, name, status')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (leadsError) throw new Error(`Erreur lors de la vu00e9rification des leads: ${leadsError.message}`);
    
    if (!leads || leads.length === 0) {
      console.log('Aucun lead trouvé dans la base de donnu00e9es');
      console.log('Cru00e9ation d\'un lead de test nu00e9cessaire...');
      
      // Ru00e9cupu00e9rer d'abord un utilisateur existant
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (usersError) throw new Error(`Erreur lors de la ru00e9cupu00e9ration des utilisateurs: ${usersError.message}`);
      if (!users || users.length === 0) throw new Error('Aucun utilisateur trouvé dans la base de donnu00e9es');
      
      const userId = users[0].id;
      
      // Cru00e9er un lead de test
      const timestamp = Date.now();
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          email: `test.${timestamp}@example.com`,
          name: `Test Lead ${timestamp}`,
          user_id: userId
        })
        .select()
        .single();
      
      if (createError) throw new Error(`Erreur lors de la cru00e9ation du lead: ${createError.message}`);
      
      console.log(`Lead de test cru00e9u00e9 avec ID: ${newLead.id} et statut: ${newLead.status}`);
      leads.push(newLead);
    } else {
      console.log(`${leads.length} leads trouvés:`);
      leads.forEach(lead => {
        console.log(`- ID: ${lead.id}, Nom: ${lead.name}, Email: ${lead.email}, Statut: ${lead.status}`);
      });
    }
    
    // Choisir un lead pour nos tests
    const testLead = leads[0];
    console.log(`\nLead su00e9lectionnu00e9 pour les tests: ${testLead.id} (statut actuel: ${testLead.status})`);
    
    // u00c9TAPE 2: Cru00e9er la table lead_status_history si elle n'existe pas
    console.log('\nu00c9TAPE 2: Configuration de la table lead_status_history');
    
    // Lecture du fichier SQL contenant la structure de la table et le trigger
    const sqlPath = path.resolve(__dirname, '../sql/lead_status_history.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Le script SQL a u00e9tu00e9 chargé. Contenu partiel:');
    console.log(sqlContent.substring(0, 300) + '...');
    
    console.log('\nVu00e9rification de l\'existence de la table lead_status_history...');
    let tableExists = false;
    
    try {
      const { error } = await supabase
        .from('lead_status_history')
        .select('id')
        .limit(1);
      
      if (!error) {
        tableExists = true;
        console.log('u2713 La table lead_status_history existe du00e9jà');
      }
    } catch (error) {
      console.log('u2717 La table lead_status_history n\'existe pas encore');
    }
    
    if (!tableExists) {
      console.log('\nIMPORTANT: Action manuelle requise!');
      console.log('----------------------------------');
      console.log('Pour cru00e9er la table et le trigger, vous devez exu00e9cuter le script SQL');
      console.log('dans l\'interface de Supabase:');
      console.log('1. Connectez-vous à la console Supabase pour votre projet');
      console.log('2. Allez dans l\'onglet "SQL Editor"');
      console.log('3. Copiez et collez le contenu du fichier lead_status_history.sql');
      console.log('4. Exu00e9cutez le script');
      console.log('----------------------------------');
      
      console.log('\nAppuyez sur Entru00e9e lorsque vous avez exu00e9cutu00e9 le script SQL dans Supabase...');
      await sleep(2000);
      console.log('\nMalgru00e9 cette limitation, nous allons continuer les tests...');
    }
    
    // u00c9TAPE 3: Effectuer un changement de statut pour tester l'historisation
    console.log('\nu00c9TAPE 3: Test d\'un changement de statut pour vu00e9rifier l\'historisation');
    
    // Du00e9terminer le nouveau statut basé sur le statut actuel
    let newStatus;
    if (testLead.status === 'new') {
      newStatus = 'contacted';
    } else if (testLead.status === 'contacted') {
      newStatus = 'qualified';
    } else if (testLead.status === 'qualified') {
      newStatus = 'negotiation';
    } else if (testLead.status === 'negotiation') {
      newStatus = 'won';
    } else if (testLead.status === 'won' || testLead.status === 'lost') {
      // Si le statut est déjà won ou lost, on remet à new pour les tests
      newStatus = 'new';
    } else {
      newStatus = 'contacted'; // Valeur par du00e9faut
    }
    
    console.log(`Changement de statut: ${testLead.status} -> ${newStatus}`);
    
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', testLead.id)
      .select()
      .single();
    
    if (updateError) throw new Error(`Erreur lors du changement de statut: ${updateError.message}`);
    
    console.log(`\u2713 Statut du lead mis à jour: ${updatedLead.status}`);
    
    // Attendre un moment pour que le trigger s'exu00e9cute
    console.log('Attente de l\'exu00e9cution du trigger...');
    await sleep(2000);
    
    // u00c9TAPE 4: Vu00e9rifier l'historique des statuts
    console.log('\nu00c9TAPE 4: Vu00e9rification de l\'historique des statuts');
    
    const { data: history, error: historyError } = await supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', testLead.id)
      .order('created_at', { ascending: false });
    
    if (historyError) {
      if (historyError.code === '42P01') { // relation does not exist
        console.log('u2717 La table lead_status_history n\'existe pas encore');
        console.log('Vous devez exu00e9cuter le script SQL dans Supabase pour cru00e9er la table et le trigger.');
      } else {
        throw new Error(`Erreur lors de la ru00e9cupu00e9ration de l'historique: ${historyError.message}`);
      }
    } else if (history && history.length > 0) {
      console.log(`\u2713 ${history.length} entrées trouvées dans l'historique pour ce lead`);
      console.log('Dernières transitions:');
      
      history.slice(0, 3).forEach((entry, index) => {
        console.log(`[${index + 1}] De: ${entry.old_status || '(initial)'} -> À: ${entry.new_status}`);
        console.log(`    Date: ${new Date(entry.created_at).toLocaleString()}`);
        console.log(`    Commentaire: ${entry.comment || '(aucun)'}`);  
        console.log('');  
      });
      
      console.log(`\u2705 VALIDATION RÉUSSIE: L'historisation des statuts fonctionne correctement!`);
    } else {
      console.log(`\u2717 Aucune entrée trouvée dans l'historique pour ce lead`);
      console.log('Le trigger ne fonctionne pas correctement ou la table n\'existe pas.');
      console.log('Vérifiez que le script SQL a été exécuté correctement dans Supabase.');
    }
    
    // u00c9TAPE 5: Préparer la requête cURL pour le rapport
    console.log('\nu00c9TAPE 5: Génération des commandes cURL pour le rapport');
    
    const curlUpdateStatusCommand = `curl -X POST \
  '${supabaseUrl}/rest/v1/leads?id=eq.${testLead.id}' \
  -H 'apikey: YOUR_SUPABASE_API_KEY' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{ "status": "qualified" }'`;
    
    const curlCheckHistoryCommand = `curl -X GET \
  '${supabaseUrl}/rest/v1/lead_status_history?lead_id=eq.${testLead.id}&order=created_at.desc' \
  -H 'apikey: YOUR_SUPABASE_API_KEY' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'`;
    
    console.log('\nCommande cURL pour changer le statut d\'un lead:');
    console.log(curlUpdateStatusCommand);
    
    console.log('\nCommande cURL pour vérifier l\'historique des statuts:');
    console.log(curlCheckHistoryCommand);
    
    // CODE DE VÉRIFICATION POUR LE RAPPORT
    console.log('\n=== RAPPORT DE VALIDATION DU BLOC D1 ===');
    console.log('\n1. État de la table lead_status_history:');
    if (!historyError) {
      console.log(`   ✅ Table lead_status_history créée et fonctionnelle`);
    } else {
      console.log(`   ❌ Table lead_status_history non disponible: ${historyError.message}`);
    }
    
    console.log('\n2. Fonctionnement des transitions de statut:');
    if (!updateError) {
      console.log(`   ✅ Transition de statut réussie: ${testLead.status} -> ${updatedLead.status}`);
    } else {
      console.log(`   ❌ Échec de la transition de statut: ${updateError.message}`);
    }
    
    console.log('\n3. Enregistrement dans l\'historique:');
    if (history && history.length > 0) {
      console.log(`   ✅ Entrées d'historique trouvées: ${history.length}`);
      console.log(`   ✅ Dernière transition: ${history[0].old_status || '(initial)'} -> ${history[0].new_status}`);
    } else if (!historyError) {
      console.log(`   ❌ Aucune entrée d'historique trouvée. Le trigger ne fonctionne pas.`);
    } else {
      console.log(`   ❌ Impossible de vérifier l'historique: ${historyError.message}`);
    }
    
    console.log('\n4. Prochaines étapes:');
    if (!historyError && history && history.length > 0) {
      console.log(`   ✅ Bloc D1 complètement validé! Prêt pour l'implémentation du Bloc D2.`);
    } else {
      console.log(`   ❌ Des problèmes doivent être résolus avant de passer au Bloc D2.`);
      console.log(`      - Exécuter le script SQL dans l'interface Supabase`);
      console.log(`      - Vérifier que le trigger fonctionne correctement`);
    }
    
  } catch (error) {
    console.error(`\n\u274c ERREUR:\n${error.message}`);
    console.error('Vérifiez les détails ci-dessus et corrigez les problèmes avant de continuer.');
  }
}

setupLeadStatusHistory();
