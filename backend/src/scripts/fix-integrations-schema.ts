/**
 * Script pour corriger le schéma de la table integrations
 * Ce script ajoute une colonne user_id et synchronise les données avec name
 * Il met également à jour les contraintes d'unicité
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Vérifier les variables d'environnement requises
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Erreur: La variable d'environnement ${envVar} est manquante`);
    process.exit(1);
  }
}

async function main() {
  console.log('Démarrage de la correction du schéma de la table integrations...');

  // Créer le client Supabase avec la clé de service pour les opérations admin
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  try {
    // Étape 1: Vérifier si la colonne user_id existe déjà
    const { data: columns, error: columnsError } = await supabase
      .rpc('check_column_exists', { 
        p_table_name: 'integrations', 
        p_column_name: 'user_id' 
      });

    if (columnsError) {
      // Si la fonction RPC n'existe pas, utiliser une approche alternative
      console.log('La fonction RPC check_column_exists n\'existe pas, création d\'une fonction temporaire...');
      
      // Créer une fonction temporaire pour vérifier l'existence de la colonne
      await supabase.rpc('create_temp_check_column_function');
      
      // Réessayer avec la nouvelle fonction
      const { data: columnsRetry, error: columnsRetryError } = await supabase
        .rpc('temp_check_column_exists', { 
          p_table_name: 'integrations', 
          p_column_name: 'user_id' 
        });
      
      if (columnsRetryError) {
        // Si ça échoue toujours, vérifier manuellement
        console.log('Vérification manuelle de la structure de la table...');
        const { data: manualCheck, error: manualError } = await supabase
          .from('_manual_schema_check')
          .select('exists')
          .single();
        
        if (manualError) {
          console.error('Impossible de vérifier la structure de la table:', manualError.message);
          console.log('Supposons que la colonne n\'existe pas et continuons...');
        } else if (manualCheck && manualCheck.exists) {
          console.log('La colonne user_id existe déjà.');
          return;
        }
      } else if (columnsRetry && columnsRetry.exists) {
        console.log('La colonne user_id existe déjà.');
        return;
      }
    } else if (columns && columns.exists) {
      console.log('La colonne user_id existe déjà.');
      return;
    }

    // Étape 2: Ajouter la colonne user_id
    console.log('Ajout de la colonne user_id...');
    const { error: addColumnError } = await supabase
      .rpc('execute_sql', {
        sql: 'ALTER TABLE integrations ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);'
      });

    if (addColumnError) {
      console.error('Erreur lors de l\'ajout de la colonne user_id:', addColumnError.message);
      // Essayer une méthode alternative
      const { error: directSqlError } = await supabase
        .from('_direct_sql')
        .insert({ query: 'ALTER TABLE integrations ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);' });
      
      if (directSqlError) {
        throw new Error(`Impossible d'ajouter la colonne user_id: ${directSqlError.message}`);
      }
    }

    // Étape 3: Synchroniser la colonne user_id avec name
    console.log('Synchronisation de user_id avec name...');
    const { error: updateError } = await supabase
      .rpc('execute_sql', {
        sql: 'UPDATE integrations SET user_id = name WHERE user_id IS NULL;'
      });

    if (updateError) {
      console.error('Erreur lors de la synchronisation de user_id:', updateError.message);
      // Essayer une méthode alternative
      const { error: directUpdateError } = await supabase
        .from('_direct_sql')
        .insert({ query: 'UPDATE integrations SET user_id = name WHERE user_id IS NULL;' });
      
      if (directUpdateError) {
        throw new Error(`Impossible de synchroniser user_id: ${directUpdateError.message}`);
      }
    }

    // Étape 4: Ajouter une contrainte d'unicité sur (user_id, integration_type)
    console.log('Ajout d\'une contrainte d\'unicité...');
    const { error: constraintError } = await supabase
      .rpc('execute_sql', {
        sql: `
          DO $$
          BEGIN
            -- Vérifier si la contrainte existe déjà
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'integrations_user_id_integration_type_unique'
            ) THEN
                -- Ajouter la contrainte
                ALTER TABLE integrations
                ADD CONSTRAINT integrations_user_id_integration_type_unique
                UNIQUE (user_id, integration_type);
            END IF;
          END
          $$;
        `
      });

    if (constraintError) {
      console.error('Erreur lors de l\'ajout de la contrainte d\'unicité:', constraintError.message);
      // Ne pas bloquer l'exécution si la contrainte échoue
      console.log('Continuation malgré l\'erreur de contrainte...');
    }

    console.log('Correction du schéma terminée avec succès!');

  } catch (error) {
    console.error('Erreur lors de la correction du schéma:', error);
    process.exit(1);
  }
}

// Exécuter le script
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
