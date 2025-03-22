// Utilisation de dotenv pour charger les variables d'environnement
// Pointons vers le fichier .env à la racine du projet
require('dotenv').config({ path: '../../.env' });
const axios = require('axios');

/**
 * Obtient un token d'API Calendly à partir des credentials client
 * (Client ID et Client Secret)
 */
async function getCalendlyAccessToken() {
  try {
    const clientId = process.env.CALENDLY_CLIENT_ID;
    const clientSecret = process.env.CALENDLY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('CALENDLY_CLIENT_ID ou CALENDLY_CLIENT_SECRET manquant dans .env');
    }
    
    console.log('Obtention du token d\'accès Calendly...');
    
    // Échange des credentials contre un token OAuth
    const response = await axios.post('https://auth.calendly.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Token d\'accès obtenu avec succès!');
    return response.data.access_token;
  } catch (error) {
    console.error('Erreur lors de l\'obtention du token d\'accès:');
    if (error.response) {
      console.error('Réponse d\'erreur:', error.response.status, error.response.statusText);
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

/**
 * Obtient l'URI de l'organisation Calendly pour l'utilisateur courant
 */
async function getCalendlyOrganizationUri(accessToken) {
  try {
    console.log('Récupération des informations utilisateur...');
    
    // Obtenir les informations de l'utilisateur courant
    const userResponse = await axios.get('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const currentUser = userResponse.data.resource;
    console.log(`Utilisateur identifié: ${currentUser.name}`);
    
    // Récupérer l'URI de l'organisation
    const organizationUri = currentUser.current_organization;
    
    if (!organizationUri) {
      throw new Error('Aucune organisation associée à cet utilisateur');
    }
    
    console.log(`Organisation identifiée: ${organizationUri}`);
    return organizationUri;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URI de l\'organisation:');
    if (error.response) {
      console.error('Réponse d\'erreur:', error.response.status, error.response.statusText);
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

/**
 * Met à jour les webhooks Calendly pour pointer vers la nouvelle URL ngrok
 */
async function updateCalendlyWebhook() {
  try {
    // Nouvelle URL ngrok
    const ngrokUrl = 'https://e317024e00e3.ngrok.app';
    
    // Obtenir un token d'accès
    const accessToken = await getCalendlyAccessToken();
    
    // Obtenir l'URI de l'organisation
    const organizationUri = await getCalendlyOrganizationUri(accessToken);
    
    // Vérifier si un webhook existe déjà
    console.log('Vérification des webhooks existants...');
    const listResponse = await axios.get('https://api.calendly.com/webhook_subscriptions', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const existingWebhooks = listResponse.data.collection;
    console.log(`${existingWebhooks.length} webhooks trouvés`);
    
    // Supprimer les webhooks existants
    for (const webhook of existingWebhooks) {
      console.log(`Suppression du webhook: ${webhook.uri}`);
      await axios.delete(webhook.uri, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    }
    
    // Créer un nouveau webhook
    console.log('Création du nouveau webhook avec URL ngrok:', ngrokUrl);
    const response = await axios.post('https://api.calendly.com/webhook_subscriptions', {
      url: `${ngrokUrl}/api/rdv/webhook`,
      events: ['invitee.created', 'invitee.canceled'],
      organization: organizationUri,
      scope: 'organization'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('Webhook créé avec succès!');
    console.log('Détails du webhook:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du webhook Calendly:');
    if (error.response) {
      console.error('Réponse d\'erreur:', error.response.status, error.response.statusText);
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

// Exécution du script
updateCalendlyWebhook();
