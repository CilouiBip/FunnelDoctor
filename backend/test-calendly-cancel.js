/**
 * Script de test pour simuler un webhook d'annulation Calendly
 * Ce script envoie une requête POST à l'endpoint d'annulation avec un payload valide
 * mais en contournant la validation d'URI utilisateur
 */

const axios = require('axios');

// Configuration
const ENDPOINT = 'http://localhost:3001/api/rdv/webhook-v2/canceled';

// Payload valide pour un événement invitee.canceled
const payload = {
  "event": "invitee.canceled",
  "created_at": "2025-04-10T12:00:00.000Z",
  "payload": {
    "cancellation": {
      "canceler_type": "invitee",
      "reason": "Test simulation (payload fiable)",
      "canceled_at": "2025-04-10T10:59:00.000Z"
    },
    "scheduled_event": {
      "uri": "https://api.calendly.com/scheduled_events/FAKE_EVENT_URI_123", 
      "start_time": "2025-04-11T16:00:00.000Z",
      "end_time": "2025-04-11T17:00:00.000Z",
      "event_memberships": [
        { "user": "https://api.calendly.com/users/TEST_USER_ID_123" }
      ],
      "event_type": {
        "uri": "https://api.calendly.com/event_types/FAKE_TYPE_URI_456",
        "name": "RDV Test pour Annulation Fiable"
      }
    },
    "invitee": {
      "uri": "https://api.calendly.com/scheduled_events/FAKE_EVENT_URI_123/invitees/VALID_INVITEE_URI",
      "email": "test-cancel-webhook-real@funneldoctor.test", 
      "name": "Testeur Annulation Fiable",
      "status": "canceled",
      "rescheduled": false
    },
    "tracking": {
      "utm_campaign": null, "utm_source": null, "utm_medium": null,
      "utm_content": null, "utm_term": null, "salesforce_uuid": null
    }
  }
};

async function testCancellationWebhook() {
  console.log('Envoi du webhook de test pour Calendly (annulation)...');
  
  try {
    const response = await axios.post(ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json',
        'calendly-webhook-signature': 'test-signature'
      }
    });
    
    console.log('\nRÉPONSE:');
    console.log(`Statut: ${response.status}`);
    console.log('Données:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('\nERREUR:');
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'état qui n'est pas dans la plage 2xx
      console.error(`Statut: ${error.response.status}`);
      console.error('Données:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('Pas de réponse du serveur');
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Erreur:', error.message);
    }
    throw error;
  }
}

// Exécuter le test
testCancellationWebhook().then(() => {
  console.log('\nTest terminé.');
}).catch(() => {
  console.log('\nTest échoué.');
});
