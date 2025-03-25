import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { YouTubeAuthService } from '../integrations/youtube/youtube-auth.service';

async function getYouTubeAuthUrl() {
  // Créer une application NestJS pour l'injection de dépendances
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const youtubeAuthService = app.get(YouTubeAuthService);
    
    // Utiliser un ID utilisateur réel
    const userId = 'mehdi';
    
    console.log('Génération de l\'URL d\'autorisation YouTube pour', userId);
    const authUrl = await youtubeAuthService.generateAuthUrl(userId);
    
    console.log('\nURL d\'autorisation YouTube:');
    console.log('\n' + authUrl + '\n');
    console.log('Copiez cette URL dans votre navigateur pour autoriser l\'accès à votre compte YouTube');
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL d\'autorisation:', error);
  } finally {
    await app.close();
  }
}

getYouTubeAuthUrl();
