/**
 * Script de test E2E pour valider l'intégration YouTube OAuth
 * Exécuter avec: npx ts-node src/scripts/verify-youtube-oauth.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { YouTubeAuthService } from '../integrations/youtube/youtube-auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import * as readline from 'readline';

// ID utilisateur de test (à remplacer par un ID valide si besoin)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

async function bootstrap() {
  console.log('⏳ Initialisation du contexte NestJS...');
  // Créer l'application avec le contexte complet
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    console.log('✅ Contexte NestJS initialisé');
    
    // Récupérer les services nécessaires
    const youtubeAuthService = app.get(YouTubeAuthService);
    const supabaseService = app.get(SupabaseService);
    
    console.log(`\n=== Test YouTube OAuth pour utilisateur ${TEST_USER_ID} ===`);
    
    // 1. Vérifier si l'intégration existe déjà
    console.log('\n📋 Vérification d\'une intégration existante...');
    const hasIntegration = await youtubeAuthService.hasValidIntegration(TEST_USER_ID);
    console.log(`Intégration existante: ${hasIntegration ? '✅ OUI' : '❌ NON'}`);
    
    if (hasIntegration) {
      // Afficher les détails de l'intégration
      console.log('\n📋 Détails de l\'intégration:');
      const config = await youtubeAuthService.getIntegrationConfig(TEST_USER_ID, 'youtube');
      
      if (config) {
        console.log(`- Type d'intégration: YouTube`);
        console.log(`- Access token: ${config.access_token ? '[ENCRYPTED]' : '[MISSING]'}`);
        console.log(`- Refresh token: ${config.refresh_token ? '[ENCRYPTED]' : '[MISSING]'}`);
        
        // Vérifier si le token est expiré
        if (config.expires_at) {
          const expiresAt = new Date(config.expires_at * 1000);
          const now = new Date();
          console.log(`- Expiration du token: ${expiresAt}`);
          console.log(`- Heure actuelle: ${now}`);
          console.log(`- Statut: ${expiresAt > now ? '✅ VALIDE' : '⚠️ EXPIRÉ'}`);
          
          // Si expiré, suggérer un refresh
          if (expiresAt <= now) {
            console.log('\n⚠️ Le token est expiré - test du rafraîchissement...');
            const refreshed = await youtubeAuthService.refreshAccessToken(TEST_USER_ID);
            console.log(`Rafraîchissement: ${refreshed ? '✅ RÉUSSI' : '❌ ÉCHEC'}`);
            
            if (refreshed) {
              const newConfig = await youtubeAuthService.getIntegrationConfig(TEST_USER_ID, 'youtube');
              if (newConfig && newConfig.expires_at) {
                const newExpiresAt = new Date(newConfig.expires_at * 1000);
                console.log(`- Nouvelle expiration: ${newExpiresAt}`);
              }
            }
          }
        } else {
          console.log(`- Expiration du token: [INCONNUE]`);
        }
      } else {
        console.log(`- Aucune configuration trouvée`);
      }
    }
    
    // 2. Menu des actions
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n📋 Options disponibles:');
    console.log('1. Générer une URL d\'autorisation');
    if (hasIntegration) {
      console.log('2. Rafraîchir le token existant');
      console.log('3. Révoquer l\'intégration');
      console.log('4. Simuler un callback OAuth complet');
      console.log('5. Quitter');
    } else {
      console.log('2. Simuler un callback OAuth complet');
      console.log('3. Quitter');
    }
    
    rl.question('\nEntrez votre choix: ', async (answer) => {
      try {
        if (answer === '1') {
          // Générer l'URL d'autorisation
          console.log('\n⏳ Génération de l\'URL d\'autorisation...');
          const authUrl = await youtubeAuthService.generateAuthUrl(TEST_USER_ID);
          console.log(`\n✅ URL d'autorisation générée:`);
          console.log(`\n${authUrl}\n`);
          console.log('Ouvrez cette URL dans votre navigateur pour autoriser l\'application.');
          console.log('Après l\'autorisation, vous serez redirigé vers l\'URL de callback configurée.');
        } 
        else if (answer === '2' && hasIntegration) {
          // Rafraîchir le token
          console.log('\n⏳ Rafraîchissement du token...');
          const refreshed = await youtubeAuthService.refreshAccessToken(TEST_USER_ID);
          console.log(`Rafraîchissement: ${refreshed ? '✅ RÉUSSI' : '❌ ÉCHEC'}`);
          
          if (refreshed) {
            const newConfig = await youtubeAuthService.getIntegrationConfig(TEST_USER_ID, 'youtube');
            if (newConfig && newConfig.expires_at) {
              const newExpiresAt = new Date(newConfig.expires_at * 1000);
              console.log(`- Nouvelle expiration: ${newExpiresAt}`);
            }
          }
        } 
        else if ((answer === '3' && hasIntegration) || (answer === '2' && !hasIntegration)) {
          // Simuler un callback complet
          console.log('\n⚠️ Simulation d\'un callback OAuth complet...');
          console.log('Cette opération va simuler un retour d\'autorisation OAuth avec un code fictif');
          console.log('Note: Dans un flux réel, ce code serait fourni par Google après autorisation');
          
          // Générer d'abord un état et le stocker
          console.log('\n⏳ Génération d\'un état OAuth...');
          const authUrl = await youtubeAuthService.generateAuthUrl(TEST_USER_ID);
          
          // Extraire l'état de l'URL générée
          const stateMatch = authUrl.match(/state=([^&]*)/);
          if (!stateMatch) {
            console.log('❌ Impossible d\'extraire l\'état de l\'URL d\'autorisation');
            return;
          }
          
          const state = stateMatch[1];
          console.log(`État OAuth extrait: ${state}`);
          
          // Code d'autorisation fictif - dans un flux réel, fourni par Google
          const fakeCode = 'fake_authorization_code_' + Date.now();
          
          console.log('\n⚠️ Cette simulation échouera car le code est fictif');
          console.log('L\'objectif est de valider que le flux appelle correctement l\'API Google');
          
          try {
            console.log('\n⏳ Tentative de traitement du callback avec code fictif...');
            const result = await youtubeAuthService.handleCallback(fakeCode, state);
            console.log(`Résultat du callback: ${result.success ? '✅ RÉUSSI' : '❌ ÉCHEC'}`);
            if (!result.success && result.error) {
              console.log(`Erreur: ${result.error}`);
            }
          } catch (callbackError) {
            console.log(`❌ Erreur lors du traitement du callback: ${callbackError.message}`);
          }
          
          console.log('\n📝 Note: Un échec ici est normal car le code est fictif');
          console.log('Dans un flux réel, vous utiliseriez le lien d\'autorisation généré');
          console.log('et Google vous fournirait un vrai code d\'autorisation.');
        }
        else if ((answer === '4' && hasIntegration) || (answer === '3' && !hasIntegration)) {
          // Quitter
          console.log('\n👋 Au revoir!');
        }
        else if (answer === '3' && hasIntegration) {
          // Révoquer l'intégration
          console.log('\n⏳ Révocation de l\'intégration...');
          const revoked = await youtubeAuthService.revokeIntegration(TEST_USER_ID);
          console.log(`Révocation: ${revoked ? '✅ RÉUSSIE' : '❌ ÉCHEC'}`);
        }
        else if (answer === '5' && hasIntegration) {
          // Quitter
          console.log('\n👋 Au revoir!');
        }
        else {
          console.log('\n❌ Choix invalide!');
        }
      } catch (error) {
        console.error(`\n❌ Erreur lors de l'exécution: ${error.message}`);
      } finally {
        rl.close();
        await app.close();
      }
    });
  } catch (error) {
    console.error(`\n❌ Erreur fatale: ${error.message}`);
    console.error('Trace de la pile:', error.stack);
    await app.close();
  }
}

bootstrap();
