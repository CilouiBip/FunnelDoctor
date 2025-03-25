import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { YouTubeAuthService } from '../integrations/youtube/youtube-auth.service';
import { IntegrationService } from '../integrations/integration.service';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testYouTubeOAuth() {
  console.log('Du00e9marrage du test d\'intu00e9gration OAuth YouTube...');
  
  // Cru00e9er une application NestJS pour l'injection de du00e9pendances
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Ru00e9cupu00e9rer les services nu00e9cessaires
    const youtubeAuthService = app.get(YouTubeAuthService);
    const integrationService = app.get(IntegrationService);
    
    // ID utilisateur de test
    const userId = 'test-user-1';
    
    // Gu00e9nu00e9rer l'URL d'autorisation
    console.log('\n1. Gu00e9nu00e9ration de l\'URL d\'autorisation YouTube...');
    const authUrl = await youtubeAuthService.generateAuthUrl(userId);
    console.log('URL d\'autorisation gu00e9nu00e9ru00e9e :\n', authUrl);
    
    // Vu00e9rifier si l'utilisateur a du00e9ju00e0 une intu00e9gration
    console.log('\n2. Vu00e9rification de l\'intu00e9gration existante...');
    const config = await integrationService.getIntegrationConfig(userId, 'youtube');
    
    if (config) {
      console.log('u2705 Intu00e9gration existante trouvu00e9e:');
      console.log('  - Access Token:', config.access_token.substring(0, 10) + '...');
      if (config.refresh_token) {
        console.log('  - Refresh Token:', config.refresh_token.substring(0, 10) + '...');
      }
      console.log('  - Expires At:', new Date(config.expires_at || 0).toLocaleString());
    } else {
      console.log('u274c Aucune intu00e9gration existante trouvu00e9e pour cet utilisateur');
    }
    
    // Simuler un stockage d'intu00e9gration
    console.log('\n3. Test de stockage d\'une nouvelle configuration...');
    const testConfig = {
      access_token: 'test_access_token_' + Date.now(),
      refresh_token: 'test_refresh_token_' + Date.now(),
      expires_at: Date.now() + 3600000, // expire dans 1 heure
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/youtube.readonly'
    };
    
    const stored = await integrationService.storeIntegrationConfig(userId, 'youtube', testConfig);
    
    if (stored) {
      console.log('u2705 Configuration stocku00e9e avec succu00e8s!');
    } else {
      console.log('u274c u00c9chec du stockage de la configuration');
    }
    
    // Vu00e9rifier que la configuration a bien u00e9tu00e9 stocku00e9e
    console.log('\n4. Vu00e9rification de la configuration stocku00e9e...');
    const storedConfig = await integrationService.getIntegrationConfig(userId, 'youtube');
    
    if (storedConfig && storedConfig.access_token === testConfig.access_token) {
      console.log('u2705 Configuration ru00e9cupu00e9ru00e9e avec succu00e8s et tokens correctement du00e9cryptu00e9s!');
    } else if (storedConfig) {
      console.log('u26a0ufe0f Configuration ru00e9cupu00e9ru00e9e mais les tokens ne correspondent pas:');
      console.log('  - Attendu:', testConfig.access_token.substring(0, 15) + '...');
      console.log('  - Reu00e7u:', storedConfig.access_token.substring(0, 15) + '...');
    } else {
      console.log('u274c u00c9chec de la ru00e9cupu00e9ration de la configuration');
    }
    
    // Tester la journalisation des u00e9vu00e9nements OAuth
    console.log('\n5. Test de journalisation des u00e9vu00e9nements OAuth...');
    await integrationService.logOAuthEvent({
      user_id: userId,
      integration_type: 'youtube',
      event_type: 'authorize', // Utiliser un type valide parmi 'authorize', 'callback', 'refresh', 'error', 'revoke'
      status: 'success',
      details: { test: true, timestamp: new Date().toISOString() }
    });
    
    console.log('u2705 u00c9vu00e9nement OAuth journalisu00e9');
    
    console.log('\nud83cudf89 Test d\'intu00e9gration OAuth YouTube TERMINu00c9 AVEC SUCCu00c8S! ud83cudf89');
    console.log('Vous pouvez maintenant tester le flux OAuth complet avec l\'URL d\'autorisation gu00e9nu00e9ru00e9e ci-dessus.');
    
  } catch (error) {
    console.error('u274c ERREUR lors du test d\'intu00e9gration OAuth YouTube:', error);
  } finally {
    await app.close();
  }
}

// Exu00e9cuter le test
testYouTubeOAuth();
