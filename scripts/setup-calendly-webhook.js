/**
 * Script pour configurer automatiquement le webhook Calendly
 * 
 * Ce script utilise l'API Calendly pour créer un webhook qui recevra
 * les événements invitee.created et invitee.canceled
 */

require('dotenv').config();
const axios = require('axios');

// Variables d'environnement requises
const CALENDLY_API_TOKEN = process.env.CALENDLY_API_TOKEN;
const CALENDLY_ORGANIZATION_URI = process.env.CALENDLY_ORGANIZATION_URI;
const NGROK_PUBLIC_URL = process.env.NGROK_PUBLIC_URL || 'https://funnel.doctor.ngrok.app';

// Vérifier que toutes les variables nécessaires sont définies
if (!CALENDLY_API_TOKEN) {
  console.error('Erreur: CALENDLY_API_TOKEN manquant dans le fichier .env');
  process.exit(1);
}

if (!CALENDLY_ORGANIZATION_URI) {
  console.error('Erreur: CALENDLY_ORGANIZATION_URI manquant dans le fichier .env');
  process.exit(1);
}

// Configuration de la requête pour créer le webhook
async function createCalendlyWebhook() {
  try {
    console.log('Création du webhook Calendly...');
    console.log(`URL cible: ${NGROK_PUBLIC_URL}/api/rdv/webhook`);
    
    const response = await axios({
      method: 'POST',
      url: 'https://api.calendly.com/webhook_subscriptions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CALENDLY_API_TOKEN}`
      },
      data: {
        url: `${NGROK_PUBLIC_URL}/api/rdv/webhook`,
        events: ['invitee.created', 'invitee.canceled'],
        organization: CALENDLY_ORGANIZATION_URI,
        scope: 'organization'
      }
    });
    
    console.log('✅ Webhook Calendly créé avec succès!');
    console.log('ID du webhook:', response.data.resource.uri);
    console.log('Events:', response.data.resource.events);
    console.log('URL cible:', response.data.resource.callback_url);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la création du webhook Calendly:');
    
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'état
      // qui ne fait pas partie de la plage 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      // Conseils spécifiques basés sur les codes d'erreur courants
      if (error.response.status === 401) {
        console.error('Conseil: Votre CALENDLY_API_TOKEN semble être invalide ou a expiré. Générez un nouveau token personnel sur https://calendly.com/integrations/api_webhooks');
      } else if (error.response.status === 400) {
        console.error('Conseil: Vérifiez le format de votre CALENDLY_ORGANIZATION_URI. Il devrait ressembler à: https://api.calendly.com/organizations/XXXXXXXXXXXXXXXX');
      } else if (error.response.status === 403) {
        console.error('Conseil: Votre token n\'a pas les permissions nécessaires pour créer des webhooks. Assurez-vous d\'utiliser un token personnel avec les scopes appropriés.');
      } else if (error.response.status === 422) {
        console.error('Conseil: Un webhook avec cette configuration existe peut-être déjà. Vérifiez les webhooks existants ou utilisez une URL différente.');
      }
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('Aucune réponse reçue. Vérifiez votre connexion internet.');
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Erreur:', error.message);
    }
    
    process.exit(1);
  }
}

// Exécuter la fonction principale
createCalendlyWebhook();
