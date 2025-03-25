/**
 * Script pour vu00e9rifier les tables Supabase nu00e9cessaires u00e0 l'intu00e9gration YouTube
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SupabaseService } from '../supabase/supabase.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('CheckSupabaseTables');
  logger.log('Initialisation du contexte NestJS...');
  
  try {
    // Cru00e9er l'application avec le contexte complet
    const app = await NestFactory.createApplicationContext(AppModule);
    const supabaseService = app.get(SupabaseService);
    
    logger.log('Vu00e9rification des tables Supabase pour l\'intu00e9gration YouTube...');
    
    // Vu00e9rifier la table oauth_states
    const { data: oauthStatesData, error: oauthStatesError } = await supabaseService.getAdminClient()
      .from('oauth_states')
      .select('count')
      .limit(1);
    
    if (oauthStatesError) {
      logger.error(`Erreur lors de la vu00e9rification de la table oauth_states: ${oauthStatesError.message}`);
      if (oauthStatesError.code === '42P01') { // Code PostgreSQL pour "relation does not exist"
        logger.error(`La table oauth_states n'existe pas dans la base de donnu00e9es.`);
      }
    } else {
      logger.log(`Table oauth_states trouvu00e9e et accessible.`);
    }
    
    // Vu00e9rifier la table integrations
    const { data: integrationsData, error: integrationsError } = await supabaseService.getAdminClient()
      .from('integrations')
      .select('count')
      .limit(1);
    
    if (integrationsError) {
      logger.error(`Erreur lors de la vu00e9rification de la table integrations: ${integrationsError.message}`);
      if (integrationsError.code === '42P01') {
        logger.error(`La table integrations n'existe pas dans la base de donnu00e9es.`);
      }
    } else {
      logger.log(`Table integrations trouvu00e9e et accessible.`);
    }
    
    // Vu00e9rifier la table oauth_events
    const { data: oauthEventsData, error: oauthEventsError } = await supabaseService.getAdminClient()
      .from('oauth_events')
      .select('count')
      .limit(1);
    
    if (oauthEventsError) {
      logger.error(`Erreur lors de la vu00e9rification de la table oauth_events: ${oauthEventsError.message}`);
      if (oauthEventsError.code === '42P01') {
        logger.error(`La table oauth_events n'existe pas dans la base de donnu00e9es.`);
      }
    } else {
      logger.log(`Table oauth_events trouvu00e9e et accessible.`);
    }
    
    await app.close();
  } catch (error) {
    logger.error(`Erreur: ${error.message}`);
    process.exit(1);
  }
}

bootstrap();
