import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { YouTubeAuthService } from '../integrations/youtube/youtube-auth.service';
import * as readline from 'readline';

async function bootstrap() {
  // Créer une application NestJS
  const app = await NestFactory.createApplicationContext(AppModule);
  const youtubeAuthService = app.get(YouTubeAuthService);
  
  // ID utilisateur de test
  const userId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000';
  
  console.log('=== YouTube OAuth Manual Test ===');
  console.log(`Using test user ID: ${userId}`);
  
  // Vérifier si l'intégration existe déjà
  console.log('\nChecking for existing integration...');
  const hasIntegration = await youtubeAuthService.hasValidIntegration(userId);
  console.log(`Existing integration: ${hasIntegration ? 'YES' : 'NO'}`);
  
  if (hasIntegration) {
    // Afficher les détails de l'intégration
    console.log('\nExisting integration details:');
    const config = await youtubeAuthService.getIntegrationConfig(userId, 'youtube');
    console.log(`- Integration type: YouTube`);
    
    if (config) {
      console.log(`- Access token: ${config.access_token ? '[ENCRYPTED]' : '[MISSING]'}`);
      console.log(`- Refresh token: ${config.refresh_token ? '[ENCRYPTED]' : '[MISSING]'}`);
      
      // Vérifier si le token est expiré
      if (config.expires_at) {
        const expiresAt = new Date(config.expires_at * 1000);
        const now = new Date();
        console.log(`- Token expires: ${expiresAt}`);
        console.log(`- Current time: ${now}`);
        console.log(`- Status: ${expiresAt > now ? 'VALID' : 'EXPIRED'}`);
      } else {
        console.log(`- Token expiration: [UNKNOWN]`);
      }
    } else {
      console.log(`- No configuration found`);
    }
    
    // Proposer des options
    console.log('\nOptions:');
    console.log('1. Generate new authorization URL (will replace existing integration)');
    console.log('2. Refresh existing token');
    console.log('3. Delete existing integration and exit');
    console.log('4. Exit');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Enter your choice (1-4): ', async (answer) => {
      switch (answer) {
        case '1':
          console.log('\nGenerating new authorization URL...');
          const authUrl = await youtubeAuthService.generateAuthUrl(userId);
          console.log(`\nAuthorization URL: ${authUrl}`);
          console.log('\nOpen this URL in your browser to authorize the application.');
          console.log('After authorization, you will be redirected to the callback URL.');
          break;
        case '2':
          try {
            console.log('\nRefreshing token...');
            const refreshResult = await youtubeAuthService.refreshAccessToken(userId);
            console.log('Token refresh result:', refreshResult ? 'SUCCESS' : 'FAILED');
            if (refreshResult) {
              const newConfig = await youtubeAuthService.getIntegrationConfig(userId, 'youtube');
              if (newConfig && newConfig.expires_at) {
                const newExpiresAt = new Date(newConfig.expires_at * 1000);
                console.log(`- New expiration: ${newExpiresAt}`);
              } else {
                console.log(`- New expiration: [UNKNOWN]`);
              }
            }
          } catch (e) {
            console.error('Error refreshing token:', e.message);
          }
          break;
        case '3':
          try {
            console.log('\nRevoking integration...');
            const revokeResult = await youtubeAuthService.revokeIntegration(userId);
            console.log('Integration revoke result:', revokeResult ? 'SUCCESS' : 'FAILED');
          } catch (e) {
            console.error('Error revoking integration:', e.message);
          }
          break;
        case '4':
          console.log('\nExiting...');
          break;
        default:
          console.log('\nInvalid choice. Exiting...');
          break;
      }
      
      rl.close();
      await app.close();
    });
  } else {
    // Generate new authorization URL
    console.log('\nGenerating new authorization URL...');
    const authUrl = await youtubeAuthService.generateAuthUrl(userId);
    console.log(`\nAuthorization URL: ${authUrl}`);
    console.log('\nOpen this URL in your browser to authorize the application.');
    console.log('After authorization, you will be redirected to the callback URL.');
    
    await app.close();
  }
}

bootstrap();
