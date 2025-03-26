/**
 * Script temporaire pour cru00e9er une intu00e9gration YouTube de test
 * Ce script est uniquement pour des tests et ne doit pas u00eatre utilisu00e9 en production
 */

import { NestFactory } from '@nestjs/core';
import { IntegrationService } from '../integrations/integration.service';
import { AppModule } from '../app.module';

async function createTestYouTubeIntegration() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const integrationService = app.get(IntegrationService);
  
  const TEST_USER_ID = 'a23b3c5f-d742-4c7a-917b-9e1a18832982';
  
  // Configuration fictive pour l'API YouTube
  const fakeConfig = {
    access_token: 'fake-youtube-access-token-for-testing',
    refresh_token: 'fake-youtube-refresh-token-for-testing',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // Expire dans 1 heure
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
  };
  
  try {
    // Enregistrer la configuration d'intu00e9gration
    const result = await integrationService.storeIntegrationConfig(
      TEST_USER_ID,
      'youtube',
      fakeConfig
    );
    
    console.log(`Configuration d'intu00e9gration YouTube enregistru00e9e: ${result}`);
    
    // Enregistrer un u00e9vu00e9nement OAuth pour la tracu00e7abilitu00e9
    await integrationService.logOAuthEvent({
      user_id: TEST_USER_ID,
      integration_type: 'youtube',
      event_type: 'authorize',
      status: 'success',
      details: { test: true, message: 'Test integration created' },
    });
    
    console.log('u00c9vu00e9nement OAuth enregistru00e9 avec succu00e8s');
  } catch (error) {
    console.error('Erreur lors de la cru00e9ation de l\'intu00e9gration de test:', error);
  } finally {
    await app.close();
  }
}

createTestYouTubeIntegration()
  .then(() => console.log('Script terminu00e9 avec succu00e8s'))
  .catch(err => console.error('Erreur dans le script:', err))
  .finally(() => process.exit(0));
