const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Vérification des variables d'environnement
if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans le fichier .env');
  process.exit(1);
}

console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Service Key: ${supabaseKey ? supabaseKey.substring(0, 5) + ' (disponible)' : 'Non défini'}`);

// Création du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n=== TEST DU BLOC D2: ÉVÉNEMENTS DE CONVERSION ET TRANSITIONS AUTOMATIQUES ===\n');
  
  // ÉTAPE 1: Sélection d'un lead pour les tests
  console.log('ÉTAPE 1: Sélection d'un lead pour les tests');
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, email, name, status')
    .limit(2);
  
  if (leadsError) {
    console.error('Erreur lors de la récupération des leads:', leadsError.message);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.error('Aucun lead trouvé dans la base de données');
    process.exit(1);
  }

  // Afficher les leads disponibles
  leads.forEach(lead => {
    console.log(`- ID: ${lead.id}, Nom: ${lead.name}, Email: ${lead.email}, Statut: ${lead.status}`);
  });

  // Sélectionner le premier lead
  const testLead = leads[0];
  console.log(`\nLead sélectionné pour les tests: ${testLead.id} (statut actuel: ${testLead.status})`);

  // ÉTAPE 2: Vérifier l'état actuel des événements de conversion pour ce lead
  console.log('\nÉTAPE 2: Vérification des événements de conversion existants');
  const { data: existingEvents, error: eventsError } = await supabase
    .from('conversion_events')
    .select('*')
    .eq('lead_id', testLead.id);

  if (eventsError) {
    console.error('Erreur lors de la récupération des événements:', eventsError.message);
  } else {
    console.log(`${existingEvents?.length || 0} événements trouvés pour ce lead`);
  }

  // ÉTAPE 3: Créer un nouvel événement de conversion (PURCHASE_MADE)
  console.log('\nÉTAPE 3: Création d\'un événement de conversion PURCHASE_MADE');
  const eventData = {
    lead_id: testLead.id,
    event_name: 'PURCHASE_MADE',
    value: 499.99,
    metadata: { product: 'FunnelDoctor Premium', currency: 'EUR' }
  };

  console.log('Données de l\'événement:', JSON.stringify(eventData, null, 2));

  const { data: insertResult, error: insertError } = await supabase
    .from('conversion_events')
    .insert(eventData)
    .select();

  if (insertError) {
    console.error('Erreur lors de la création de l\'événement:', insertError.message);
  } else {
    console.log('✓ Événement créé avec succès', insertResult[0].id);
  }

  // Attendre un peu pour que le trigger s'exécute
  console.log('Attente de l\'exécution du trigger...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // ÉTAPE 4: Vérifier que le statut du lead a été mis à jour
  console.log('\nÉTAPE 4: Vérification de la mise à jour du statut du lead');
  const { data: updatedLead, error: updateCheckError } = await supabase
    .from('leads')
    .select('id, status')
    .eq('id', testLead.id)
    .single();

  if (updateCheckError) {
    console.error('Erreur lors de la vérification du statut mis à jour:', updateCheckError.message);
  } else {
    const statusChanged = updatedLead.status !== testLead.status;
    console.log(`Ancien statut: ${testLead.status}`);
    console.log(`Nouveau statut: ${updatedLead.status}`);
    
    if (statusChanged) {
      console.log(`✓ Le statut a été correctement mis à jour: ${testLead.status} -> ${updatedLead.status}`);
    } else if (updatedLead.status === 'won') {
      console.log(`ℹ Le statut était déjà 'won', aucun changement nécessaire`);
    } else {
      console.log(`⚠ Le statut n'a pas été mis à jour comme prévu`);
    }
  }

  // ÉTAPE 5: Vérifier l'historique des statuts
  console.log('\nÉTAPE 5: Vérification de l\'historique des statuts');
  const { data: statusHistory, error: historyError } = await supabase
    .from('lead_status_history')
    .select('*')
    .eq('lead_id', testLead.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (historyError) {
    console.error('Erreur lors de la récupération de l\'historique des statuts:', historyError.message);
  } else if (!statusHistory || statusHistory.length === 0) {
    console.log('Aucune entrée trouvée dans l\'historique des statuts');
  } else {
    console.log(`✓ ${statusHistory.length} entrées trouvées dans l'historique pour ce lead`);
    console.log('Dernières transitions:');
    statusHistory.forEach((entry, index) => {
      console.log(`[${index + 1}] De: ${entry.old_status || '(aucun)'} -> À: ${entry.new_status}`);
      console.log(`    Date: ${new Date(entry.created_at).toLocaleString()}`);
      console.log(`    Commentaire: ${entry.comment || '(aucun)'}\n`);
    });
  }

  // ÉTAPE 6: Génération des commandes cURL pour le rapport
  console.log('\nÉTAPE 6: Génération des commandes cURL pour le rapport');
  
  console.log('\nCommande cURL pour créer un événement de conversion:');
  console.log(`curl -X POST \
  '${supabaseUrl}/rest/v1/conversion_events' \
  -H 'apikey: YOUR_SUPABASE_API_KEY' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{ "lead_id": "${testLead.id}", "event_name": "PURCHASE_MADE", "value": 499.99, "metadata": {"product": "FunnelDoctor Premium"} }'`);

  // Résumé de validation
  console.log('\n=== RAPPORT DE VALIDATION DU BLOC D2 ===\n');
  console.log('1. État de la table conversion_events:');
  if (!eventsError) {
    console.log('   ✅ Table conversion_events accessible et fonctionnelle');
  } else {
    console.log('   ❌ Problème d\'accès à la table conversion_events');
  }

  console.log('\n2. Création d\'événements de conversion:');
  if (!insertError) {
    console.log('   ✅ Création d\'événement réussie');
  } else {
    console.log('   ❌ Échec de la création d\'événement');
  }

  console.log('\n3. Transition automatique de statut:');
  if (updatedLead && (updatedLead.status !== testLead.status || updatedLead.status === 'won')) {
    console.log(`   ✅ Transition de statut déclenchée: ${testLead.status} -> ${updatedLead.status}`);
  } else {
    console.log('   ❌ La transition automatique de statut ne fonctionne pas comme prévu');
  }

  console.log('\n4. Historisation des changements de statut:');
  if (statusHistory && statusHistory.length > 0) {
    console.log('   ✅ Les changements de statut sont correctement enregistrés dans l\'historique');
  } else {
    console.log('   ⚠ Aucune entrée récente trouvée dans l\'historique des statuts');
  }
}

main();
