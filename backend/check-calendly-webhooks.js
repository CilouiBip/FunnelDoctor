/**
 * Script pour vu00e9rifier les webhooks Calendly existants
 * Ce script vu00e9rifie si un webhook pointant vers notre URL existe du00e9ju00e0
 * et s'il u00e9coute l'u00e9vu00e9nement 'invitee.canceled'
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CALENDLY_API_URL = 'https://api.calendly.com';
const BACKEND_URL = process.env.BACKEND_URL || 'https://funnel.doctor.ngrok.app';
const WEBHOOK_PATH = '/api/rdv/webhook-v2';

// Initialiser le client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getCalendlyIntegrationConfig() {
  console.log('Ru00e9cupu00e9ration des configurations Calendly depuis Supabase...');
  
  try {
    // Ru00e9cupu00e9rer toutes les configurations Calendly
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'calendly')
      .is('access_token', 'not.null')
      .is('organization_uri', 'not.null');
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.error('Aucune configuration Calendly trouvu00e9e dans la base de donnu00e9es');
      return null;
    }
    
    console.log(`${data.length} configuration(s) Calendly trouvu00e9e(s)`);
    return data[0]; // Prendre la premiu00e8re configuration disponible
  } catch (error) {
    console.error('Erreur lors de la ru00e9cupu00e9ration des configs Calendly:', error.message);
    return null;
  }
}

async function listWebhooks(config) {
  console.log('Vu00e9rification des webhooks existants pour l\'organisation...');
  console.log(`Organization URI: ${config.organization_uri}`);
  
  try {
    const response = await axios.get(
      `${CALENDLY_API_URL}/webhook_subscriptions?organization=${config.organization_uri}&scope=organization`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.access_token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la liste des webhooks:', 
                  error.response?.status, 
                  error.response?.data || error.message);
    return { collection: [] };
  }
}

async function main() {
  try {
    // 1. Ru00e9cupu00e9rer la configuration de l'intu00e9gration Calendly
    const config = await getCalendlyIntegrationConfig();
    if (!config) return;
    
    // 2. Ru00e9cupu00e9rer la liste des webhooks
    const webhooksData = await listWebhooks(config);
    const webhooks = webhooksData.collection || [];
    
    // 3. Chercher notre webhook spu00e9cifique
    const targetUrl = `${BACKEND_URL}${WEBHOOK_PATH}`;
    console.log(`\nRecherche de webhook pointant vers: ${targetUrl}`);
    
    const matchingWebhooks = webhooks.filter(webhook => webhook.url === targetUrl);
    
    if (matchingWebhooks.length === 0) {
      console.log('\nu274C AUCUN WEBHOOK TROUVu00C9 pointant vers notre URL de callback!');
      console.log('Le webhook doit u00eatre cru00e9u00e9 ou reconfiguru00e9.');
    } else {
      console.log(`\nu2705 ${matchingWebhooks.length} webhook(s) trouvu00e9(s) pointant vers notre URL!`);
      
      // 4. Vu00e9rifier les u00e9vu00e9nements u00e9coutu00e9s par chaque webhook
      matchingWebhooks.forEach((webhook, index) => {
        console.log(`\n=== Webhook #${index + 1} ===`);
        console.log(`URI: ${webhook.uri}`);
        console.log(`URL: ${webhook.url}`);
        console.log(`Cru00e9u00e9 le: ${webhook.created_at}`);
        console.log(`Scope: ${webhook.scope}`);
        console.log(`u00c9vu00e9nements u00e9coutu00e9s: ${webhook.events.join(', ')}`);
        
        // 5. Vu00e9rifier spu00e9cifiquement l'u00e9vu00e9nement d'annulation
        const listensToCancellation = webhook.events.includes('invitee.canceled');
        console.log(`u00c9coute 'invitee.canceled': ${listensToCancellation ? 'u2705 OUI' : 'u274C NON'}`);
      });
    }
  } catch (error) {
    console.error('Erreur lors de la vu00e9rification des webhooks:', error.message);
  }
}

main().then(() => {
  console.log('\nVu00e9rification terminu00e9e.');
}).catch(error => {
  console.error('Erreur dans le script principal:', error.message);
});
