/**
 * Script pour tester l'API touchpoints avec différents payloads
 */

const API_ENDPOINT = 'http://localhost:3001/api/touchpoints';

// Fonction pour envoyer une requête à l'API
async function testTouchpoint(payload, testName) {
  console.log(`\n----- Test: ${testName} -----`);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const status = response.status;
    console.log(`Status: ${status}`);
    
    try {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Impossible de parser la réponse comme JSON');
    }
    
    return status >= 200 && status < 300;
  } catch (error) {
    console.error('Erreur:', error.message);
    return false;
  }
}

// Série de tests pour identifier la structure valide
async function runTests() {
  // Test 1: Payload minimal
  const minimalPayload = {
    visitor_id: 'test-visitor-' + Date.now(),
    event_type: 'test_event'
  };
  await testTouchpoint(minimalPayload, 'Payload minimal');
  
  // Test 2: Avec event_data comme objet
  const withEventDataPayload = {
    visitor_id: 'test-visitor-' + Date.now(),
    event_type: 'test_event',
    event_data: {
      site_id: 'test-site',
      utm_params: { utm_source: 'test' }
    }
  };
  await testTouchpoint(withEventDataPayload, 'Avec event_data comme objet');
  
  // Test 3: Avec site_id à la racine
  const withSiteIdPayload = {
    visitor_id: 'test-visitor-' + Date.now(),
    event_type: 'test_event',
    site_id: 'test-site'
  };
  await testTouchpoint(withSiteIdPayload, 'Avec site_id à la racine');
  
  // Test 4: Avec tous les champs du DTO
  const completePayload = {
    visitor_id: 'test-visitor-' + Date.now(),
    event_type: 'test_event',
    page_url: 'https://example.com/test',
    page_title: 'Test Page',
    user_agent: 'Test Script',
    referrer: 'https://example.com',
    ip_address: '127.0.0.1',
    event_data: {
      site_id: 'test-site',
      utm_params: { utm_source: 'test' },
      custom_field: 'test value'
    }
  };
  await testTouchpoint(completePayload, 'Payload complet');
}

// Exécuter les tests
console.log('Démarrage des tests d\'API pour touchpoints...');
runTests();
