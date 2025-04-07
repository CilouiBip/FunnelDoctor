/**
 * Script pour appliquer la migration d'ajout de integration_type u00e0 la table touchpoints
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyTouchpointsMigration() {
  console.log('\u{1F680} APPLICATION DE LA MIGRATION TOUCHPOINTS');

  // 1. Ru00e9cupu00e9rer les informations d'identification depuis les variables d'environnement
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('\u{274C} Erreur: Les variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises');
    process.exit(1);
  }

  console.log('\u{1F4DE} Connexion u00e0 Supabase...');
  // Initialiser le client Supabase avec la clu00e9 de service pour contourner les RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    // Application directe du SQL pour ajouter la colonne (si elle n'existe pas du00e9ju00e0)
    console.log('\u{1F4E6} Ajout de la colonne integration_type u00e0 la table touchpoints...');
    
    const sql = `
      DO $$
      BEGIN
          IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                      WHERE table_schema='public' AND table_name='touchpoints' 
                      AND column_name='integration_type') THEN
              ALTER TABLE public.touchpoints
              ADD COLUMN integration_type TEXT NULL;
              
              COMMENT ON COLUMN public.touchpoints.integration_type IS 'Source integration type (e.g., calendly, stripe, youtube)';
          END IF;
      END
      $$;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Essayer avec l'autre nom de fonction RPC si la premiu00e8re u00e9choue
      console.log('Retry avec run_sql...');
      const { error: error2 } = await supabase.rpc('run_sql', { query: sql });
      
      if (error2) {
        console.error('\u{274C} Erreur lors de l\'application de la migration avec run_sql:', error2);
        // Application manuelle par SQL direct si les RPC u00e9chouent
        console.log('Tentative d\'exu00e9cution SQL directe...');
        
        // Vu00e9rifier d'abord si la colonne existe
        const { data: columnCheck, error: columnCheckError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'touchpoints')
          .eq('column_name', 'integration_type');
        
        if (columnCheckError) {
          console.error('\u{274C} Impossible de vu00e9rifier l\'existence de la colonne:', columnCheckError);
        } else if (!columnCheck || columnCheck.length === 0) {
          // La colonne n'existe pas, procu00e9der u00e0 l'ajout
          const { error: alterError } = await supabase
            .from('_alter_table')
            .insert({
              table: 'touchpoints',
              column: 'integration_type',
              type: 'text',
              nullable: true
            });
          
          if (alterError) {
            console.error('\u{274C} Erreur lors de l\'ajout direct de la colonne:', alterError);
          } else {
            console.log('\u{2705} Colonne integration_type ajoutu00e9e avec succu00e8s via SQL direct!');
          }
        } else {
          console.log('\u{2139} La colonne integration_type existe du00e9ju00e0 dans la table touchpoints.');
        }
      } else {
        console.log('\u{2705} Migration appliquu00e9e avec succu00e8s via run_sql!');
      }
    } else {
      console.log('\u{2705} Migration appliquu00e9e avec succu00e8s via exec_sql!');
    }

    // Vu00e9rification finale
    console.log('\u{1F50E} Vu00e9rification de l\'existence de la colonne integration_type...');
    const { data, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'touchpoints')
      .eq('column_name', 'integration_type');

    if (checkError) {
      console.error('\u{274C} Erreur lors de la vu00e9rification:', checkError);
    } else if (!data || data.length === 0) {
      console.error('\u{274C} La colonne integration_type n\'a pas u00e9tu00e9 ajoutu00e9e u00e0 la table touchpoints.');  
    } else {
      console.log('\u{2705} La colonne integration_type existe maintenant dans la table touchpoints!'); 
    }

  } catch (error) {
    console.error('\u{274C} Exception non gu00e9ru00e9e lors de l\'application de la migration:', error);
    process.exit(1);
  }
}

applyTouchpointsMigration()
  .catch(error => {
    console.error('\u{274C} Erreur non gu00e9ru00e9e:', error);
    process.exit(1);
  });
