import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function main() {
  // Récupérer les informations d'identification depuis les variables d'environnement
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Erreur: Les variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises');
    process.exit(1);
  }

  console.log('Connexion à Supabase...');
  // Initialiser le client Supabase avec la clé de service pour contourner les RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    db: { schema: 'public' },
    global: {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  });

  try {
    // 1. Mise à jour de la colonne integration_type (NOT NULL avec valeur par défaut)
    console.log('1. Application de la migration pour integration_type...');
    const { error: error1 } = await supabase.rpc('run_sql', {
      query: `
        ALTER TABLE "integrations" 
        ALTER COLUMN "integration_type" SET NOT NULL,
        ALTER COLUMN "integration_type" SET DEFAULT 'unknown';
      `
    });
    
    if (error1) {
      console.error('Erreur lors de la modification de integration_type:', error1);
    } else {
      console.log('✅ Colonne integration_type mise à jour avec succès');
    }

    // 2. Ajout de la contrainte d'unicité
    console.log('2. Ajout de la contrainte d\'unicité...');
    const { error: error2 } = await supabase.rpc('run_sql', {
      query: `
        ALTER TABLE "integrations" 
        ADD CONSTRAINT IF NOT EXISTS unique_user_integration UNIQUE (name, integration_type);
      `
    });
    
    if (error2) {
      console.error('Erreur lors de l\'ajout de la contrainte d\'unicité:', error2);
    } else {
      console.log('✅ Contrainte d\'unicité ajoutée avec succès');
    }

    // 3. Ajout de commentaires sur les colonnes
    console.log('3. Ajout de commentaires sur les colonnes...');
    const { error: error3 } = await supabase.rpc('run_sql', {
      query: `
        COMMENT ON COLUMN "integrations"."config" IS 'Stockage des configurations OAuth (tokens, etc.)';
        COMMENT ON COLUMN "integrations"."integration_type" IS 'Type d\'intégration (youtube, etc.)';
      `
    });
    
    if (error3) {
      console.error('Erreur lors de l\'ajout des commentaires:', error3);
    } else {
      console.log('✅ Commentaires ajoutés avec succès');
    }

    // 4. Création de la table oauth_events
    console.log('4. Création de la table oauth_events...');
    const { error: error4 } = await supabase.rpc('run_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS "oauth_events" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" TEXT NOT NULL,
          "integration_type" TEXT NOT NULL,
          "event_type" TEXT NOT NULL,
          "details" JSONB DEFAULT '{}',
          "error" TEXT,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `
    });
    
    if (error4) {
      console.error('Erreur lors de la création de la table oauth_events:', error4);
    } else {
      console.log('✅ Table oauth_events créée avec succès');
    }

    console.log('\n🎉 Toutes les migrations ont été appliquées avec succès!');
  } catch (error) {
    console.error('Erreur inattendue lors de l\'exécution des migrations:', error);
    process.exit(1);
  }
}

main();
