/**
 * Script pour configurer automatiquement le webhook Stripe
 * 
 * Ce script utilise l'API Stripe pour créer un webhook qui recevra
 * les événements de paiement (payment_intent.succeeded, checkout.session.completed, etc.)
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
      console.log('\u26a0\ufe0f Un webhook Stripe avec cette URL existe du00e9ju00e0:');
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
      
      console.log('\u2705 Webhook Stripe mis u00e0 jour avec succu00e8s!');
      console.log('Nouvel ID secret:', 'whsec_...' + updatedWebhook.secret.slice(-4));
      console.log('\nIMPORTANT: Mettez u00e0 jour la variable STRIPE_WEBHOOK_SECRET dans votre fichier .env avec:');
      console.log(updatedWebhook.secret);
      
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
    
    console.log('\u2705 Webhook Stripe cru00e9u00e9 avec succu00e8s!');
    console.log('ID:', webhook.id);
    console.log('URL:', webhook.url);
    console.log('Statut:', webhook.status);
    console.log('\nIMPORTANT: Mettez u00e0 jour la variable STRIPE_WEBHOOK_SECRET dans votre fichier .env avec:');
    console.log(webhook.secret);
    
    return webhook;
  } catch (error) {
    console.error('\u274c Erreur lors de la cru00e9ation du webhook Stripe:');
    console.error(error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('Conseil: Votre STRIPE_SECRET_KEY semble u00eatre invalide. Vu00e9rifiez qu\'elle est correcte dans votre fichier .env');
    } else if (error.type === 'StripePermissionError') {
      console.error('Conseil: Votre clé Stripe n\'a pas les permissions nu00e9cessaires pour cru00e9er des webhooks.');
    } else if (error.code === 'resource_missing') {
      console.error('Conseil: La ressource demandu00e9e n\'existe pas. Vu00e9rifiez que votre compte Stripe est correctement configuru00e9.');
    }
    
    process.exit(1);
  }
}

// Exu00e9cuter la fonction principale
createStripeWebhook();
