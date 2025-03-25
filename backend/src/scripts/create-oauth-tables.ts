/**
 * Script pour cru00e9er les tables Supabase nu00e9cessaires u00e0 l'intu00e9gration YouTube OAuth
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SupabaseService } from '../supabase/supabase.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('CreateOAuthTables');
  logger.log('Initialisation du contexte NestJS...');
  
  try {
    // Cru00e9er l'application avec le contexte complet
    const app = await NestFactory.createApplicationContext(AppModule);
    const supabaseService = app.get(SupabaseService);
    
    logger.log('Cru00e9ation de la table oauth_states si elle n\'existe pas...');
    
    const createOAuthStatesTable = `
      CREATE TABLE IF NOT EXISTS public.oauth_states (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        state VARCHAR(255) NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        user_id UUID
      );
      
      CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states(state);
      CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at);
    `;
    
    const { error } = await supabaseService.getAdminClient().rpc('exec_sql', { sql: createOAuthStatesTable });
    
    if (error) {
      logger.error(`Erreur lors de la cru00e9ation de la table oauth_states: ${error.message}`);
      logger.log('Essai avec une autre mu00e9thode...');
      
      // Essai avec une mu00e9thode alternative sans la fonction RPC
      try {
        const { error: postgrestError } = await supabaseService.getAdminClient()
          .from('oauth_states')
          .select('id')
          .limit(1);
          
        if (postgrestError?.code === '42P01') {
          logger.log('La table oauth_states est manquante, mu00e9thode RPC a u00e9chouu00e9. Veuillez cru00e9er la table manuellement:');
          logger.log('Contactez l\'administrateur pour cru00e9er la table avec la structure suivante:');
          logger.log(createOAuthStatesTable);
        }
      } catch (e) {
        logger.error(`Erreur secundaire: ${e.message}`);
      }
    } else {
      logger.log('\u2705 Table oauth_states cru00e9u00e9e ou du00e9ju00e0 existante');
    }
    
    await app.close();
    logger.log('Pour vu00e9rifier les tables, exu00e9cutez: npx ts-node src/scripts/check-supabase-tables.ts');
  } catch (error) {
    logger.error(`Erreur: ${error.message}`);
    if (error.stack) {
      logger.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

bootstrap();
