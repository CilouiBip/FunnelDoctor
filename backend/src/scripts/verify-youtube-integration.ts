/**
 * Script de diagnostic complet pour l'intégration YouTube
 * Vérifie toutes les parties du système: DB, env vars, routes, tokens
 */
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Type générique pour éviter l'erreur d'importation
type Database = any;

dotenv.config({ path: join(process.cwd(), '.env') });

/**
 * Configuration et préparation
 */
const startTime = Date.now();
let passedTests = 0;
let failedTests = 0;
let warningTests = 0;

// Configuration et couleurs pour l'affichage console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

const TEST_USER_ID = '1';
const INTEGRATION_TYPE = 'youtube';

/**
 * Fonctions utilitaires
 */
function log(message: string, color = colors.white): void {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string): void {
  console.log('\n' + colors.bold + colors.blue + '='.repeat(80) + colors.reset);
  console.log(colors.bold + colors.blue + ` ${title} ` + colors.reset);
  console.log(colors.bold + colors.blue + '='.repeat(80) + colors.reset + '\n');
}

function logSuccess(message: string): void {
  passedTests++;
  console.log(`${colors.green}✓ SUCCÈS: ${message}${colors.reset}`);
}

function logWarning(message: string): void {
  warningTests++;
  console.log(`${colors.yellow}⚠ ATTENTION: ${message}${colors.reset}`);
}

function logError(message: string): void {
  failedTests++;
  console.log(`${colors.red}✗ ERREUR: ${message}${colors.reset}`);
}

async function runTest<T>(name: string, test: () => Promise<T>): Promise<T | null> {
  try {
    log(`Exécution du test: ${name}...`, colors.cyan);
    const result = await test();
    logSuccess(name);
    return result;
  } catch (error) {
    logError(`${name} - ${(error as Error).message}`);
    return null;
  }
}

/**
 * Vérification des variables d'environnement
 */
async function checkEnvironmentVariables() {
  logSection('VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT');
  
  // Variables d'environnement requises
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'YOUTUBE_CLIENT_ID',
    'YOUTUBE_CLIENT_SECRET',
    'YOUTUBE_REDIRECT_URI',
    'YOUTUBE_SCOPES',
    'ENCRYPTION_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logError(`Variable d'environnement ${envVar} manquante ou vide`);
    } else {
      logSuccess(`Variable d'environnement ${envVar} présente`);
    }
  }
  
  // Vérification spécifique de l'URL de redirection YouTube
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || '';
  if (!redirectUri.includes('ngrok') && !redirectUri.includes('localhost')) {
    logWarning(`L'URL de redirection YouTube ne contient ni 'ngrok' ni 'localhost': ${redirectUri}`)
  }
  
  // Vérification de la correspondance entre BACKEND_URL et YOUTUBE_REDIRECT_URI
  const backendUrl = process.env.BACKEND_URL || '';
  if (backendUrl && redirectUri) {
    const backendDomain = new URL(backendUrl).hostname;
    const redirectDomain = new URL(redirectUri).hostname;
    
    if (backendDomain !== redirectDomain) {
      logWarning(`Le domaine de BACKEND_URL (${backendDomain}) ne correspond pas au domaine de YOUTUBE_REDIRECT_URI (${redirectDomain})`);
    } else {
      logSuccess(`Les domaines de BACKEND_URL et YOUTUBE_REDIRECT_URI correspondent`);
    }
  }
}

/**
 * Vérification de la base de données
 */
async function checkDatabase() {
  logSection('VÉRIFICATION DE LA BASE DE DONNÉES');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logError('Impossible de vérifier la base de données: variables d\'environnement Supabase manquantes');
    return;
  }
  
  // Créer le client Supabase
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Vérifier si la table integrations existe et sa structure
  const { data: tableInfo, error: tableError } = await supabase
    .from('integrations')
    .select('id, name, user_id, integration_type, config')
    .limit(1);
  
  if (tableError) {
    if (tableError.message.includes('does not exist')) {
      logError('La table "integrations" n\'existe pas');
    } else if (tableError.message.includes('column')) {
      logError(`Problème de structure de table: ${tableError.message}`);
    } else {
      logError(`Erreur lors de la vérification de la table: ${tableError.message}`);
    }
    return;
  }
  
  logSuccess('La table "integrations" existe et est accessible');
  
  // Vérifier les intégrations YouTube existantes
  const { data: youtubeIntegrations, error: youtubeError } = await supabase
    .from('integrations')
    .select('id, name, user_id, integration_type, config')
    .eq('integration_type', INTEGRATION_TYPE);
  
  if (youtubeError) {
    logError(`Erreur lors de la vérification des intégrations YouTube: ${youtubeError.message}`);
    return;
  }
  
  if (youtubeIntegrations && youtubeIntegrations.length > 0) {
    logSuccess(`${youtubeIntegrations.length} intégration(s) YouTube trouvée(s) dans la base de données`);
    
    // Vérifier les tokens expirés
    const now = Math.floor(Date.now() / 1000);
    const expiredTokens = youtubeIntegrations.filter(integration => {
      const expiresAt = integration.config?.expires_at;
      return expiresAt && typeof expiresAt === 'number' && expiresAt < now;
    });
    
    if (expiredTokens.length > 0) {
      logWarning(`${expiredTokens.length} intégration(s) YouTube ont des tokens expirés`);
    } else {
      logSuccess('Tous les tokens YouTube sont valides');
    }
    
    // Vérifier l'utilisation de name vs user_id
    const integrationsWithUserId = youtubeIntegrations.filter(integration => integration.user_id !== null);
    if (integrationsWithUserId.length > 0) {
      logSuccess(`${integrationsWithUserId.length}/${youtubeIntegrations.length} intégrations ont un user_id défini`);
    } else {
      logWarning('Aucune intégration n\'a de user_id défini, toutes utilisent name pour le stockage d\'ID');
    }
  } else {
    logWarning('Aucune intégration YouTube trouvée dans la base de données');
  }
}

/**
 * Vérification des routes d'API
 */
async function checkApiRoutes() {
  logSection('VÉRIFICATION DES ROUTES D\'API');
  
  const backendUrl = process.env.NGROK_PUBLIC_URL || 'http://localhost:3001';
  const baseApiUrl = `${backendUrl}/api/auth/youtube`;
  
  const routes = [
    { path: '/diagnostic', method: 'GET' },
    { path: '/test-authorize', method: 'GET' },
    { path: `/debug/${TEST_USER_ID}`, method: 'GET' },
    { path: `/revoke/${TEST_USER_ID}`, method: 'POST' },
  ];
  
  for (const route of routes) {
    const url = `${baseApiUrl}${route.path}`;
    try {
      log(`Test de la route ${route.method} ${url}...`, colors.cyan);
      
      let response;
      if (route.method === 'GET') {
        response = await axios.get(url, { timeout: 5000 });
      } else {
        response = await axios.post(url, {}, { timeout: 5000 });
      }
      
      if (response.status >= 200 && response.status < 300) {
        logSuccess(`Route ${route.method} ${url} disponible (${response.status})`);
      } else {
        logWarning(`Route ${route.method} ${url} a retourné un statut ${response.status}`);
      }
    } catch (error) {
      const axiosError = error as any;
      if (axiosError.response) {
        logError(`Route ${route.method} ${url} a échoué avec le statut ${axiosError.response.status}`);
      } else if (axiosError.request) {
        logError(`Route ${route.method} ${url} n'a pas répondu (timeout ou serveur indisponible)`);
      } else {
        logError(`Test de la route ${route.method} ${url} a échoué: ${axiosError.message}`);
      }
    }
  }
}

/**
 * Exécution principale
 */
async function main() {
  logSection('DIAGNOSTIC DE L\'INTÉGRATION YOUTUBE');
  log('Démarrage du diagnostic complet...', colors.bold);
  
  await checkEnvironmentVariables();
  await checkDatabase();
  await checkApiRoutes();
  
  // Résumé des tests
  const totalTests = passedTests + failedTests + warningTests;
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  logSection('RÉSUMÉ DU DIAGNOSTIC');
  log(`Tests exécutés: ${totalTests} en ${elapsedTime} secondes`, colors.bold);
  log(`✓ Tests réussis: ${passedTests}`, colors.green);
  log(`⚠ Avertissements: ${warningTests}`, colors.yellow);
  log(`✗ Tests échoués: ${failedTests}`, colors.red);
  
  if (failedTests === 0 && warningTests === 0) {
    log('✓ DIAGNOSTIC COMPLET: TOUT EST OK!', colors.green + colors.bold);
  } else if (failedTests === 0) {
    log('⚠ DIAGNOSTIC COMPLET: OK AVEC AVERTISSEMENTS', colors.yellow + colors.bold);
  } else {
    log('✗ DIAGNOSTIC COMPLET: PROBLÈMES DÉTECTÉS', colors.red + colors.bold);
  }
}

// Exécuter le script
main().catch(error => {
  console.error('Erreur lors de l\'exécution du script de diagnostic:', error);
  process.exit(1);
});
