/**
 * Script pour tester manuellement l'intu00e9gration OAuth de YouTube
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { YouTubeAuthService } from '../integrations/youtube/youtube-auth.service';
import { YouTubeAnalyticsService } from '../integrations/youtube/youtube-analytics.service';
import { Logger } from '@nestjs/common';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function bootstrap() {
  const logger = new Logger('YouTubeOAuthTest');
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000000'; // ID de test

  logger.log('=== Test Manuel de l\'intu00e9gration YouTube OAuth ===');
  logger.log(`Utilisation de l'ID utilisateur de test: ${TEST_USER_ID}\n`);

  try {
    // Initier l'application NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    const youtubeAuthService = app.get(YouTubeAuthService);
    const youtubeAnalyticsService = app.get(YouTubeAnalyticsService);

    // Vu00e9rifier si l'intu00e9gration existe du00e9ju00e0
    logger.log('Vu00e9rification de l\'intu00e9gration existante...');
    const config = await youtubeAuthService.getIntegrationConfig(TEST_USER_ID, 'youtube');
    const hasValidIntegration = await youtubeAuthService.hasValidIntegration(TEST_USER_ID);
    logger.log(`Intu00e9gration existante: ${config ? 'OUI' : 'NON'}`);
    logger.log(`Intu00e9gration valide: ${hasValidIntegration ? 'OUI' : 'NON'}\n`);

    if (config) {
      // Afficher les du00e9tails de l'intu00e9gration existante
      logger.log('Du00e9tails de l\'intu00e9gration:');
      logger.log(`Access token: ${config.access_token ? '✓ Pru00e9sent' : '✗ Absent'}`);
      logger.log(`Refresh token: ${config.refresh_token ? '✓ Pru00e9sent' : '✗ Absent'}`);
      
      // Vu00e9rifier si les tokens sont expiru00e9s
      const expiresAt = config.expires_at ? new Date(config.expires_at * 1000) : new Date();
      const now = new Date();
      const isExpired = expiresAt < now;
      
      logger.log(`Tokens expiru00e9s: ${isExpired ? 'OUI' : 'NON'}`);
      if (isExpired) {
        logger.log('Les tokens sont expiru00e9s, gu00e9nu00e9ration d\'une nouvelle URL d\'autorisation...');
      } else {
        logger.log(`Expire dans: ${Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))} heures`);
        
        // Tester la ru00e9cupu00e9ration des statistiques
        logger.log('\nTest de ru00e9cupu00e9ration des statistiques YouTube...');
        const startDateStr = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 jours en arriu00e8re
        const endDateStr = formatDate(new Date());
        
        try {
          // const basicMetrics = await youtubeAnalyticsService.getBasicMetrics(TEST_USER_ID, startDateStr, endDateStr);
          // logger.log('\nMu00e9triques de base:');
          // console.log(basicMetrics);
          
          // const topVideos = await youtubeAnalyticsService.getTopVideos(TEST_USER_ID, startDateStr, endDateStr, 5);
          // logger.log('\nTop 5 vidu00e9os:');
          // console.log(topVideos);
          
          // const executiveSummary = await youtubeAnalyticsService.getExecutiveSummary(TEST_USER_ID);
          // logger.log('\nRu00e9sumu00e9 exu00e9cutif:');
          // console.log(executiveSummary);
          
          logger.log('\nTest de ru00e9cupu00e9ration des statistiques ru00e9ussi!');
        } catch (error) {
          logger.error(`Erreur lors de la ru00e9cupu00e9ration des statistiques: ${error.message}`);
          if (error.response) {
            logger.error(`Ru00e9ponse d'erreur: ${JSON.stringify(error.response.data)}`);
          }
        }
        
        logger.log('\nVoulez-vous ru00e9voquer cette intu00e9gration? (oui/non)');
        rl.question('> ', async (answer) => {
          if (answer.toLowerCase() === 'oui') {
            logger.log('Ru00e9vocation de l\'intu00e9gration...');
            await youtubeAuthService.revokeIntegration(TEST_USER_ID);
            logger.log('Intu00e9gration ru00e9voqnu00e9e avec succu00e8s!');
          } else {
            logger.log('Conservation de l\'intu00e9gration existante.');
          }
          rl.close();
          await app.close();
          process.exit(0);
        });
        return;
      }
    }

    // Gu00e9nu00e9rer une URL d'autorisation
    logger.log('Gu00e9nu00e9ration d\'une nouvelle URL d\'autorisation...');
    const authUrl = await youtubeAuthService.generateAuthUrl(TEST_USER_ID);
    
    logger.log(`\nURL d'autorisation: ${authUrl}\n`);
    logger.log('Ouvrez cette URL dans votre navigateur pour autoriser l\'application.');
    logger.log('Apru00e8s l\'autorisation, vous serez redigu00e9 vers l\'URL de callback.');
    
    logger.log('\nUne fois redigu00e9, entrez le code d\'autorisation et l\'u00e9tat (state) de l\'URL:');
    logger.log('Format de l\'URL de redirection: https://funnel.doctor.ngrok.app/api/auth/youtube/callback?code=CODE&state=STATE');
    
    rl.question('Code: ', async (code) => {
      rl.question('State: ', async (state) => {
        try {
          logger.log('\nTraitement du callback...');
          const result = await youtubeAuthService.handleCallback(code, state);
          
          if (result.success) {
            logger.log('Autorisation ru00e9ussie!');
            logger.log(`User ID: ${result.userId}`);
            
            // Tester l'intu00e9gration
            logger.log('\nTest de l\'intu00e9gration avec YouTube Analytics...');
            const startDateStr = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 jours en arriu00e8re
            const endDateStr = formatDate(new Date());
            
            try {
              // const basicMetrics = await youtubeAnalyticsService.getBasicMetrics(TEST_USER_ID, startDateStr, endDateStr);
              // logger.log('\nMu00e9triques de base:');
              // console.log(basicMetrics);
              
              // const topVideos = await youtubeAnalyticsService.getTopVideos(TEST_USER_ID, startDateStr, endDateStr, 5);
              // logger.log('\nTop 5 vidu00e9os:');
              // console.log(topVideos);
              
              // const executiveSummary = await youtubeAnalyticsService.getExecutiveSummary(TEST_USER_ID);
              // logger.log('\nRu00e9sumu00e9 exu00e9cutif:');
              // console.log(executiveSummary);
              
              logger.log('\nIntu00e9gration YouTube ru00e9ussie!');
            } catch (error) {
              logger.error(`Erreur lors de la ru00e9cupu00e9ration des statistiques: ${error.message}`);
              if (error.response) {
                logger.error(`Ru00e9ponse d'erreur: ${JSON.stringify(error.response.data)}`);
              }
            }
          } else {
            logger.error(`Erreur lors de l'autorisation: ${result.error || 'Erreur inconnue'}`);
          }
        } catch (error) {
          logger.error(`Erreur lors du traitement du callback: ${error.message}`);
          if (error.response) {
            logger.error(`Ru00e9ponse d'erreur: ${JSON.stringify(error.response.data)}`);
          }
        }
        
        rl.close();
        await app.close();
      });
    });
  } catch (error) {
    logger.error(`Erreur: ${error.message}`);
    process.exit(1);
  }
}

// Fonction pour formater une date au format YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

bootstrap();
