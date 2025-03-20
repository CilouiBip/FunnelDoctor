const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env' });
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3001/api';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  try {
    console.log('\n=== Test end-to-end du systu00e8me de statuts de leads ===\n');
    
    // 1. Cru00e9er un utilisateur de test s'il n'existe pas du00e9ju00e0
    console.log('\u00c9tape 1: Pru00e9paration d\'un utilisateur de test');
    const testEmail = 'test_user@example.com';
    const testPassword = 'password123';
    
    // Vu00e9rifier si l'utilisateur existe du00e9ju00e0
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', testEmail)
      .single();
    
    let userId;
    
    if (existingUser) {
      userId = existingUser.id;
      console.log(`Utilisateur de test existant trouvé avec l'ID: ${userId}`);
    } else {
      // Créer un nouvel utilisateur
      const { data: { user }, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (error) throw new Error(`Erreur lors de la création de l'utilisateur: ${error.message}`);
      
      userId = user.id;
      console.log(`Nouvel utilisateur créé avec l'ID: ${userId}`);
      
      // Attendre un moment pour que l'utilisateur soit créé côté serveur
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 2. Se connecter et récupérer un token JWT
    console.log('\n\u00c9tape 2: Connexion pour obtenir un token JWT');
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) throw new Error(`Erreur de connexion: ${loginError.message}`);
    
    const jwt = session.access_token;
    console.log(`Token JWT obtenu: ${jwt.substring(0, 15)}...`);
    
    // Configuration Axios avec notre token JWT
    const api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      }
    });
    
    // 3. Créer un nouveau lead
    console.log('\n\u00c9tape 3: Cru00e9ation d\'un nouveau lead');
    const timestamp = Date.now();
    const leadEmail = `test.lead.${timestamp}@example.com`;
    
    const createLeadResponse = await api.post('/leads', {
      email: leadEmail,
      first_name: 'Test',
      last_name: 'Lead'
    });
    
    const leadId = createLeadResponse.data.id;
    console.log(`Lead créé avec l'ID: ${leadId}`);
    console.log(`Statut initial du lead: ${createLeadResponse.data.status}`);
    
    // 4. Effectuer une transition valide (new -> contacted)
    console.log('\n\u00c9tape 4: Transition valide (new -> contacted)');
    const firstTransitionResponse = await api.post(`/leads/${leadId}/transition`, {
      status: 'contacted',
      comment: 'Premier contact par email'
    });
    
    console.log(`Nouvelle statut: ${firstTransitionResponse.data.status}`);
    if (firstTransitionResponse.data.status !== 'contacted') {
      throw new Error('Échec de la transition new -> contacted');
    }
    
    // 5. Tester une transition invalide (contacted -> won)
    console.log('\n\u00c9tape 5: Test de transition invalide (contacted -> won)');
    try {
      await api.post(`/leads/${leadId}/transition`, {
        status: 'won',
        comment: 'Tentative de passer directement à won (devrait échouer)'
      });
      
      throw new Error('La transition invalide a été acceptée, ce qui est une erreur!');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`✅ La validation fonctionne: ${err.response.data.message}`);
      } else {
        throw err;
      }
    }
    
    // 6. Vérifier l'historique des statuts
    console.log('\n\u00c9tape 6: Vu00e9rification de l\'historique des statuts');
    const historyResponse = await api.get(`/leads/${leadId}/status-history`);
    const history = historyResponse.data;
    
    console.log(`Nombre d'entrées dans l'historique: ${history.length}`);
    if (history.length < 1) {
      throw new Error("L'historique des statuts n'a pas été correctement enregistré");
    }
    
    console.log('Détails de la dernière transition:');
    console.log(`- De: ${history[0].old_status || 'null (état initial)'}`);
    console.log(`- À: ${history[0].new_status}`);
    console.log(`- Commentaire: ${history[0].comment || 'Aucun commentaire'}`);
    
    // 7. Effectuer une seconde transition valide
    console.log('\n\u00c9tape 7: Seconde transition valide (contacted -> qualified)');
    const secondTransitionResponse = await api.post(`/leads/${leadId}/transition`, {
      status: 'qualified',
      comment: 'Lead qualifié après évaluation des besoins'
    });
    
    console.log(`Nouveau statut: ${secondTransitionResponse.data.status}`);
    if (secondTransitionResponse.data.status !== 'qualified') {
      throw new Error('Échec de la transition contacted -> qualified');
    }
    
    // 8. Vérifier l'historique mis à jour
    console.log('\n\u00c9tape 8: Vu00e9rification de l\'historique mis u00e0 jour');
    const updatedHistoryResponse = await api.get(`/leads/${leadId}/status-history`);
    const updatedHistory = updatedHistoryResponse.data;
    
    console.log(`Nombre d'entrées dans l'historique mis à jour: ${updatedHistory.length}`);
    if (updatedHistory.length < 2) {
      throw new Error("La deuxième transition n'a pas été enregistrée dans l'historique");
    }
    
    console.log('Détails de la dernière transition:');
    console.log(`- De: ${updatedHistory[0].old_status}`);
    console.log(`- À: ${updatedHistory[0].new_status}`);
    console.log(`- Commentaire: ${updatedHistory[0].comment || 'Aucun commentaire'}`);
    
    console.log('\n✅ Test end-to-end réussi! Le système de gestion des statuts de leads fonctionne correctement.');
  } catch (error) {
    console.error('\n❌ Erreur lors du test:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runTest();
