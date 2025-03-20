const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  try {
    console.log('\n=== Test end-to-end du systu00e8me de statuts de leads ===\n');
    
    // 1. Login pour obtenir un token JWT
    console.log('1. Login pour obtenir un token JWT');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const jwt = loginResponse.data.access_token;
    console.log(`Token JWT: ${jwt ? jwt.substring(0, 15) + '...' : 'null'}`);
    
    if (!jwt) {
      throw new Error('Impossible de se connecter. Vu00e9rifiez les identifiants.');
    }
    
    // Configuration pour les requu00eates authentifiu00e9es
    const api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      }
    });
    
    // 2. Cru00e9ation d'un lead
    console.log('\n2. Cru00e9ation d\'un lead');
    const timestamp = Date.now();
    const leadResponse = await api.post('/leads', {
      email: `test.${timestamp}@example.com`,
      first_name: 'Test',
      last_name: 'D1'
    });
    
    const leadId = leadResponse.data.id;
    console.log(`Lead cru00e9u00e9 avec ID: ${leadId}`);
    console.log(`Statut initial: ${leadResponse.data.status}`);
    
    // 3. Transition valide: new -> contacted
    console.log('\n3. Transition valide: new -> contacted');
    const firstTransition = await api.post(`/leads/${leadId}/transition`, {
      status: 'contacted',
      comment: 'Premier contact par email'
    });
    
    console.log(`Nouveau statut: ${firstTransition.data.status}`);
    
    // 4. Test transition invalide: contacted -> won (doit u00e9chouer)
    console.log('\n4. Test transition invalide: contacted -> won');
    try {
      await api.post(`/leads/${leadId}/transition`, {
        status: 'won',
        comment: 'Transition invalide qui doit u00e9chouer'
      });
      console.log('\u274c ERREUR: La transition invalide a u00e9tu00e9 acceptu00e9e!');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`\u2705 La validation fonctionne correctement: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }
    
    // 5. Vu00e9rification de l'historique
    console.log('\n5. Vu00e9rification de l\'historique des statuts');
    const history = await api.get(`/leads/${leadId}/status-history`);
    
    console.log(`Nombre d'entru00e9es dans l'historique: ${history.data.length}`);
    if (history.data.length > 0) {
      console.log('Derniu00e8re transition:');
      console.log(` - De: ${history.data[0].old_status || '(initial)'}`);
      console.log(` - u00c0: ${history.data[0].new_status}`);
      console.log(` - Commentaire: ${history.data[0].comment || 'Aucun'}`);
    }
    
    // 6. Deuxiu00e8me transition valide: contacted -> qualified
    console.log('\n6. Deuxiu00e8me transition valide: contacted -> qualified');
    const secondTransition = await api.post(`/leads/${leadId}/transition`, {
      status: 'qualified',
      comment: 'Lead qualifiu00e9 apru00e8s discussion'
    });
    
    console.log(`Nouveau statut: ${secondTransition.data.status}`);
    
    // 7. Vu00e9rification de l'historique mis u00e0 jour
    console.log('\n7. Vu00e9rification de l\'historique mis u00e0 jour');
    const updatedHistory = await api.get(`/leads/${leadId}/status-history`);
    
    console.log(`Nombre d'entru00e9es dans l'historique: ${updatedHistory.data.length}`);
    if (updatedHistory.data.length > 1) {
      console.log('Derniu00e8re transition:');
      console.log(` - De: ${updatedHistory.data[0].old_status}`);
      console.log(` - u00c0: ${updatedHistory.data[0].new_status}`);
      console.log(` - Commentaire: ${updatedHistory.data[0].comment || 'Aucun'}`);
    }
    
    console.log('\n\u2705 TEST D1 RU00c9USSI: Le systu00e8me de gestion des statuts de leads fonctionne correctement!');
  } catch (error) {
    console.error('\n\u274c ERREUR LORS DU TEST:');
    if (error.response) {
      console.error(` - Status: ${error.response.status}`);
      console.error(` - Message: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error);
    }
  }
}

runTest();
