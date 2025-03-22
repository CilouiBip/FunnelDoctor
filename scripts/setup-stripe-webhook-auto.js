/**
 * Script pour configurer automatiquement le webhook Stripe et mettre u00e0 jour les fichiers .env
 */

import { config } from 'dotenv';
import Stripe from 'stripe';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Configuration du chemin pour .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);
config({ path: `${projectRoot}/.env` });

// Instance Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Variables d'environnement requises
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const NGROK_PUBLIC_URL = process.env.NGROK_PUBLIC_URL || 'https://funnel.doctor.ngrok.app';

// Vu00e9rifier que toutes les variables nu00e9cessaires sont du00e9finies
if (!STRIPE_SECRET_KEY) {
  console.error('Erreur: STRIPE_SECRET_KEY manquant dans le fichier .env');
  process.exit(1);
}

// Fonction pour mettre u00e0 jour les fichiers .env avec le webhook secret
function updateEnvFiles(secret) {
  // Mettre u00e0 jour le fichier .env u00e0 la racine
  try {
    let rootEnvPath = `${projectRoot}/.env`;
    let rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
    
    // Remplacer le secret existant ou le placeholder
    if (rootEnvContent.includes('STRIPE_WEBHOOK_SECRET=')) {
      rootEnvContent = rootEnvContent.replace(
        /STRIPE_WEBHOOK_SECRET=.*/g, 
        `STRIPE_WEBHOOK_SECRET=${secret}`
      );
    } else {
      // Ajouter u00e0 la section Stripe si elle existe
      if (rootEnvContent.includes('# Stripe Configuration')) {
        rootEnvContent = rootEnvContent.replace(
          '# Stripe Configuration', 
          `# Stripe Configuration\nSTRIPE_WEBHOOK_SECRET=${secret}`
        );
      } else {
        // Ajouter u00e0 la fin du fichier
        rootEnvContent += `\n\n# Stripe Configuration\nSTRIPE_WEBHOOK_SECRET=${secret}`;
      }
    }
    
    fs.writeFileSync(rootEnvPath, rootEnvContent);
    console.log(`u2705 Fichier .env u00e0 la racine mis u00e0 jour avec le secret Stripe`);
  } catch (error) {
    console.error(`u274c Erreur lors de la mise u00e0 jour du fichier .env u00e0 la racine: ${error.message}`);
  }
  
  // Mettre u00e0 jour le fichier .env du backend
  try {
    let backendEnvPath = `${projectRoot}/backend/.env`;
    let backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
    
    // Vu00e9rifier si la clu00e9 existe du00e9ju00e0
    if (backendEnvContent.includes('STRIPE_WEBHOOK_SECRET=')) {
      backendEnvContent = backendEnvContent.replace(
        /STRIPE_WEBHOOK_SECRET=.*/g, 
        `STRIPE_WEBHOOK_SECRET=${secret}`
      );
    } else {
      // Ajouter apru00e8s les configs existantes
      if (backendEnvContent.includes('# NGROK Configuration')) {
        // Ajouter avant la configuration NGROK
        backendEnvContent = backendEnvContent.replace(
          '# NGROK Configuration', 
          `# Stripe Configuration\nSTRIPE_WEBHOOK_SECRET=${secret}\n\n# NGROK Configuration`
        );
      } else {
        // Ajouter u00e0 la fin du fichier
        backendEnvContent += `\n\n# Stripe Configuration\nSTRIPE_WEBHOOK_SECRET=${secret}`;
      }
    }
    
    fs.writeFileSync(backendEnvPath, backendEnvContent);
    console.log(`u2705 Fichier .env du backend mis u00e0 jour avec le secret Stripe`);
  } catch (error) {
    console.error(`u274c Erreur lors de la mise u00e0 jour du fichier .env du backend: ${error.message}`);
  }
}

// Configuration de la requu00eate pour cru00e9er le webhook
async function createStripeWebhook() {
  try {
    console.log('Cru00e9ation du webhook Stripe...');
    console.log(`URL cible: ${NGROK_PUBLIC_URL}/api/payments/webhook`);
    
    // Vu00e9rifier si un webhook existe du00e9ju00e0 avec cette URL
    const existingWebhooks = await stripe.webhookEndpoints.list();
    const existingWebhook = existingWebhooks.data.find(
      webhook => webhook.url === `${NGROK_PUBLIC_URL}/api/payments/webhook`
    );
    
    if (existingWebhook) {
      console.log('u26a0ufe0f Un webhook Stripe avec cette URL existe du00e9ju00e0:');
      console.log('ID:', existingWebhook.id);
      console.log('URL:', existingWebhook.url);
      console.log('Statut:', existingWebhook.status);
      console.log('\nMise u00e0 jour du webhook existant...');
      
      // Mise u00e0 jour du webhook existant
      const updatedWebhook = await stripe.webhookEndpoints.update(existingWebhook.id, {
        enabled_events: [
          'payment_intent.succeeded',
          'payment_intent.payment_failed',
          'checkout.session.completed',
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted'
        ]
      });
      
      console.log('✅ Webhook Stripe mis à jour avec succès!');
      
      // Lors d'une mise à jour, Stripe ne renvoie pas le secret
      console.log('\nNote: Stripe ne renvoie pas le secret lors d'une mise à jour.');
      console.log('Pour récupérer un nouveau secret, nous devons supprimer et recréer le webhook.');
      
      // Demander à l'utilisateur s'il souhaite récupérer un nouveau secret
      console.log('\nPour obtenir un nouveau secret:');
      console.log('1. Supprimez manuellement le webhook actuel dans le dashboard Stripe');
      console.log('2. Relancez ce script');
      
      return updatedWebhook;
    }
    
    // Cru00e9ation d'un nouveau webhook
    const webhook = await stripe.webhookEndpoints.create({
      url: `${NGROK_PUBLIC_URL}/api/payments/webhook`,
      enabled_events: [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted'
      ],
      description: 'Webhook FunnelDoctor pour le suivi des paiements'
    });
    
    console.log('u2705 Webhook Stripe cru00e9u00e9 avec succu00e8s!');
    console.log('ID:', webhook.id);
    console.log('URL:', webhook.url);
    console.log('Statut:', webhook.status);
    console.log('\nMise u00e0 jour automatique des fichiers .env avec le secret:');
    console.log(webhook.secret);
    
    // Mettre u00e0 jour les fichiers .env avec le secret
    updateEnvFiles(webhook.secret);
    
    return webhook;
  } catch (error) {
    console.error('u274c Erreur lors de la cru00e9ation du webhook Stripe:');
    console.error(error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('Conseil: Votre STRIPE_SECRET_KEY semble u00eatre invalide. Vu00e9rifiez qu\'elle est correcte dans votre fichier .env');
    } else if (error.type === 'StripePermissionError') {
      console.error('Conseil: Votre clu00e9 Stripe n\'a pas les permissions nu00e9cessaires pour cru00e9er des webhooks.');
    } else if (error.code === 'resource_missing') {
      console.error('Conseil: La ressource demandu00e9e n\'existe pas. Vu00e9rifiez que votre compte Stripe est correctement configuru00e9.');
    }
    
    process.exit(1);
  }
}

// Exu00e9cuter la fonction principale
createStripeWebhook();
