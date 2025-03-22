/**
 * Script pour configurer automatiquement le webhook Stripe et mettre à jour les fichiers .env
 * Version améliorée : supprime et recrée automatiquement le webhook existant pour obtenir un nouveau secret
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

// Vérifier que toutes les variables nécessaires sont définies
if (!STRIPE_SECRET_KEY) {
  console.error('Erreur: STRIPE_SECRET_KEY manquant dans le fichier .env');
  process.exit(1);
}

// Fonction pour mettre à jour les fichiers .env avec le webhook secret
function updateEnvFiles(secret) {
  // Mettre à jour le fichier .env à la racine
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
      // Ajouter à la section Stripe si elle existe
      if (rootEnvContent.includes('# Stripe Configuration')) {
        rootEnvContent = rootEnvContent.replace(
          '# Stripe Configuration', 
          `# Stripe Configuration\nSTRIPE_WEBHOOK_SECRET=${secret}`
        );
      } else {
        // Ajouter à la fin du fichier
        rootEnvContent += `\n\n# Stripe Configuration\nSTRIPE_WEBHOOK_SECRET=${secret}`;
      }
    }
    
    fs.writeFileSync(rootEnvPath, rootEnvContent);
    console.log(`✅ Fichier .env à la racine mis à jour avec le secret Stripe`);
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour du fichier .env à la racine: ${error.message}`);
  }
  
  // Mettre à jour le fichier .env du backend
  try {
    let backendEnvPath = `${projectRoot}/backend/.env`;
    let backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
    
    // Vérifier si la clé existe déjà
    if (backendEnvContent.includes('STRIPE_WEBHOOK_SECRET=')) {
      backendEnvContent = backendEnvContent.replace(
        /STRIPE_WEBHOOK_SECRET=.*/g, 
        `STRIPE_WEBHOOK_SECRET=${secret}`
      );
    } else {
      // Ajouter après les configs existantes
      if (backendEnvContent.includes('# NGROK Configuration')) {
        // Ajouter avant la configuration NGROK
        backendEnvContent = backendEnvContent.replace(
          '# NGROK Configuration', 
          `# Stripe Configuration\nSTRIPE_WEBHOOK_SECRET=${secret}\n\n# NGROK Configuration`
        );
      } else {
        // Ajouter à la fin du fichier
        backendEnvContent += `\n\n# Stripe Configuration\nSTRIPE_WEBHOOK_SECRET=${secret}`;
      }
    }
    
    fs.writeFileSync(backendEnvPath, backendEnvContent);
    console.log(`✅ Fichier .env du backend mis à jour avec le secret Stripe`);
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour du fichier .env du backend: ${error.message}`);
  }
}

// Configuration de la requête pour créer le webhook
async function createStripeWebhook() {
  try {
    console.log('Création du webhook Stripe...');
    console.log(`URL cible: ${NGROK_PUBLIC_URL}/api/payments/webhook`);
    
    // Vérifier si un webhook existe déjà avec cette URL
    const existingWebhooks = await stripe.webhookEndpoints.list();
    const existingWebhook = existingWebhooks.data.find(
      webhook => webhook.url === `${NGROK_PUBLIC_URL}/api/payments/webhook`
    );
    
    if (existingWebhook) {
      console.log('⚠️ Un webhook Stripe avec cette URL existe déjà:');
      console.log('ID:', existingWebhook.id);
      console.log('URL:', existingWebhook.url);
      console.log('Statut:', existingWebhook.status);
      
      // Supprimer le webhook existant pour en créer un nouveau et obtenir un nouveau secret
      console.log('\nSuppression du webhook existant pour en créer un nouveau...');
      await stripe.webhookEndpoints.del(existingWebhook.id);
      console.log(`✅ Webhook supprimé avec succès`);
    }
    
    // Création d'un nouveau webhook (qu'il y en ait eu un précédemment ou non)
    console.log('\nCréation d\'un nouveau webhook...');
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
    
    console.log('✅ Webhook Stripe créé avec succès!');
    console.log('ID:', webhook.id);
    console.log('URL:', webhook.url);
    console.log('Statut:', webhook.status);
    console.log('Secret:', 'whsec_...' + webhook.secret.slice(-4));
    console.log('\nMise à jour automatique des fichiers .env avec le secret:');
    
    // Mettre à jour les fichiers .env avec le secret
    updateEnvFiles(webhook.secret);
    
    return webhook;
  } catch (error) {
    console.error('❌ Erreur lors de la création du webhook Stripe:');
    console.error(error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('Conseil: Votre STRIPE_SECRET_KEY semble être invalide. Vérifiez qu\'elle est correcte dans votre fichier .env');
    } else if (error.type === 'StripePermissionError') {
      console.error('Conseil: Votre clé Stripe n\'a pas les permissions nécessaires pour créer des webhooks.');
    } else if (error.code === 'resource_missing') {
      console.error('Conseil: La ressource demandée n\'existe pas. Vérifiez que votre compte Stripe est correctement configuré.');
    }
    
    process.exit(1);
  }
}

// Exécuter la fonction principale
createStripeWebhook();
