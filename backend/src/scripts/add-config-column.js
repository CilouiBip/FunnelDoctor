const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Les variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises');
  process.exit(1);
}

// Création du client Supabase avec la clé de service pour les droits admin
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addConfigColumn() {
  try {
    // SQL pour ajouter la colonne config de type JSONB
    const { error } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "config" JSONB DEFAULT \'{}\';'
    });

    if (error) {
      console.error('Erreur lors de l\'ajout de la colonne config:', error.message);
      return;
    }

    console.log('La colonne "config" a été ajoutée avec succès à la table "integrations"');
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error.message);
  } finally {
    process.exit(0);
  }
}

addConfigColumn();
