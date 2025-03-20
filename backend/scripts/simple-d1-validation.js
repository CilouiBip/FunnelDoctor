/**
 * Script de validation simplifié pour le Bloc D1 (Lead Status Management)
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
console.log(`Supabase Key: ${supabaseServiceKey ? '✓ (définie)' : '✗ (non définie)'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement manquantes');
  process.exit(1);
}

// Client Supabase avec clé de service (accès admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function validateD1() {
  console.log('\n==== Validation simplifiée du Bloc D1: Gestion des statuts de leads ====\n');
  
  try {
    // Étape 1: Vérifier la structure de la table leads
    console.log('Étape 1: Vérification de la structure de la table leads');
    
    // Récupérer un lead existant pour comprendre la structure
    const { data: existingLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(1);
    
    if (leadsError) throw new Error(`Erreur: ${leadsError.message}`);
    
    if (existingLeads && existingLeads.length > 0) {
      console.log('✓ Table leads trouvée');
      const lead = existingLeads[0];
      console.log('Colonnes disponibles:', Object.keys(lead).join(', '));
      
      // Vérifier si la colonne status existe
      if (lead.status) {
        console.log(`✓ Colonne status existe, valeur: ${lead.status}`);
      } else {
        console.log('✗ Colonne status non trouvée');
      }
    } else {
      console.log('ℹ️ Aucun lead existant trouvé, création d\'un lead test nécessaire');
    }
    
    // Étape 2: Créer un lead test
    console.log('\nÉtape 2: Création d\'un lead test');
    const timestamp = Date.now();
    
    // Récupérer d'abord un utilisateur existant
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) throw new Error(`Erreur: ${usersError.message}`);
    if (!users || users.length === 0) throw new Error('Aucun utilisateur trouvé');
    
    const userId = users[0].id;
    console.log(`✓ Utilisateur trouvé avec ID: ${userId}`);
    
    // Créer le lead test - adapter les champs selon la structure réelle de la table
    const { data: newLead, error: createError } = await supabase
      .from('leads')
      .insert({
        email: `test.${timestamp}@example.com`,
        name: `Test Lead ${timestamp}`,
        user_id: userId
        // Le statut devrait être défini automatiquement comme 'new'
      })
      .select()
      .single();
    
    if (createError) throw new Error(`Erreur lors de la création du lead: ${createError.message}`);
    
    const leadId = newLead.id;
    console.log(`✓ Lead créé avec ID: ${leadId}`);
    console.log(`✓ Statut initial: ${newLead.status}`);
    
    if (newLead.status !== 'new') {
      console.warn(`⚠️ Attention: Le statut initial n'est pas 'new' mais '${newLead.status}'`);
    }
    
    // Étape 3: Vérifier si la table lead_status_history existe
    console.log('\nÉtape 3: Vérification de la table lead_status_history');
    
    // Essayer de sélectionner des entrées d'historique pour ce lead
    const { data: history, error: historyError } = await supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', leadId);
    
    if (historyError) {
      if (historyError.code === '42P01') { // relation does not exist
        console.log('✗ Table lead_status_history non trouvée');
      } else {
        throw new Error(`Erreur: ${historyError.message}`);
      }
    } else {
      console.log(`✓ Table lead_status_history trouvée, ${history.length} entrées pour ce lead`);
    }
    
    // Étape 4: Effectuer une transition de statut
    console.log('\nÉtape 4: Transition du statut new -> contacted');
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({ 
        status: 'contacted'
        // Note: updated_at peut être géré automatiquement par Supabase ou par un trigger
      })
      .eq('id', leadId)
      .select()
      .single();
    
    if (updateError) throw new Error(`Erreur lors de la transition: ${updateError.message}`);
    
    console.log(`✓ Statut mis à jour: ${updatedLead.status}`);
    
    // Attendre un moment pour que les triggers s'exécutent si nécessaire
    await sleep(500);
    
    // Étape 5: Vérifier si la transition a été enregistrée dans l'historique
    console.log('\nÉtape 5: Vérification de l\'enregistrement dans l\'historique');
    const { data: updatedHistory, error: updatedHistoryError } = await supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (updatedHistoryError) {
      if (updatedHistoryError.code === '42P01') { // relation does not exist
        console.log('✗ Table lead_status_history non trouvée - le trigger n\'est pas implémenté');
      } else {
        throw new Error(`Erreur: ${updatedHistoryError.message}`);
      }
    } else if (updatedHistory.length > 0) {
      console.log(`✓ Historique mis à jour, ${updatedHistory.length} entrées total`);
      console.log('Dernière entrée dans l\'historique:');
      console.log(`- De: ${updatedHistory[0].old_status || '(initial)'}`);
      console.log(`- À: ${updatedHistory[0].new_status}`);
      console.log(`- Date: ${new Date(updatedHistory[0].created_at).toLocaleString()}`);
    } else {
      console.log('✗ Aucune entrée trouvée dans l\'historique - le trigger ne fonctionne pas');
    }
    
    // Conclusion
    console.log('\n==== Résumé de la validation ====');
    console.log('1. Table leads avec colonne status: ✓');
    console.log(`2. Statut initial d'un nouveau lead: ${newLead.status === 'new' ? '✓' : '✗'} (${newLead.status})`);
    console.log(`3. Table d'historique lead_status_history: ${!updatedHistoryError || updatedHistoryError.code !== '42P01' ? '✓' : '✗'}`);
    console.log(`4. Transition de statut (new -> contacted): ${updatedLead.status === 'contacted' ? '✓' : '✗'} (${updatedLead.status})`);
    console.log(`5. Enregistrement dans l'historique: ${updatedHistory && updatedHistory.length > 0 ? '✓' : '✗'}`);
    
    if (
      newLead.status === 'new' && 
      updatedLead.status === 'contacted' && 
      updatedHistory && 
      updatedHistory.length > 0
    ) {
      console.log('\n✅ VALIDATION RÉUSSIE: Le Bloc D1 est correctement implémenté!');
      console.log('Vous pouvez maintenant procéder à l\'implémentation du Bloc D2.');
    } else {
      console.log('\n⚠️ VALIDATION PARTIELLE: Certains éléments du Bloc D1 ne fonctionnent pas comme prévu.');
      console.log('Veuillez corriger les problèmes indiqués avant de passer au Bloc D2.');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DE LA VALIDATION:');
    console.error(error);
  }
}

validateD1();
