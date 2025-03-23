/**
 * Script de test pour simuler les webhooks Calendly v2
 */
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3001';

// Fonction pour générer un UUID aléatoire
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Génération d'un visitor_id de test
const testVisitorId = `visitor_${Date.now()}`;
console.log(`Test visitor_id: ${testVisitorId}`);

// Création d'un payload simulant un webhook "invitee.created"
const createEventPayload = {
  event: 'invitee.created',
  created_at: new Date().toISOString(),
  resource: {
    invitee: {
      uuid: generateUUID(),
      email: 'test@example.com',
      name: 'Test User',
      timezone: 'Europe/Paris'
    },
    scheduled_event: {
      uuid: generateUUID(),
      name: 'Test Consultation',
      start_time: new Date(Date.now() + 86400000).toISOString(),
      end_time: new Date(Date.now() + 86400000 + 1800000).toISOString(),
      uri: `https://api.calendly.com/scheduled_events/${generateUUID()}`
    },
    tracking: {
      utm_source: 'visitor_id',
      utm_medium: testVisitorId,
      utm_campaign: 'test_campaign'
    }
  }
};

// Simulation d'un webhook "invitee.created" (RDV planifié)
async function simulateInviteeCreated() {
  try {
    console.log('Simulation d\'un webhook "invitee.created" (RDV planifié)...');
    const response = await axios.post(
      `${API_URL}/api/rdv/webhook-v2`,
      createEventPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'calendly-webhook-signature': 'test-signature' // La vérification est désactivée en mode test
        }
      }
    );

    console.log('Réponse:', response.data);
    
    // Vérifier si le visiteur a été créé et lié à un lead
    setTimeout(async () => {
      try {
        console.log(`\nVérification de la création du visiteur ${testVisitorId}...`);
        const visitorResponse = await axios.get(`${API_URL}/api/visitors/${testVisitorId}`);
        console.log('Information visiteur:', visitorResponse.data);
        
        if (visitorResponse.data && visitorResponse.data.lead_id) {
          console.log(`\nLe visiteur a été associé au lead: ${visitorResponse.data.lead_id}`);
          
          // Vérifier les touchpoints créés
          console.log(`\nVérification des touchpoints pour ${testVisitorId}...`);
          const touchpointsResponse = await axios.get(`${API_URL}/api/visitors/${testVisitorId}/touchpoints`);
          console.log('Touchpoints:', touchpointsResponse.data);
          
          // Vérifier la progression du funnel
          if (visitorResponse.data.lead_id) {
            console.log(`\nVérification de la progression du funnel pour le lead ${visitorResponse.data.lead_id}...`);
            const progressResponse = await axios.get(`${API_URL}/api/funnel-progress/lead/${visitorResponse.data.lead_id}`);
            console.log('Progression du funnel:', progressResponse.data);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification:', error.response ? error.response.data : error.message);
      }
    }, 2000); // Attendre 2 secondes pour s'assurer que le traitement soit terminé
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la simulation du webhook:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Exécution des tests
async function runTests() {
  // Simuler un RDV planifié
  await simulateInviteeCreated();
}

runTests();
