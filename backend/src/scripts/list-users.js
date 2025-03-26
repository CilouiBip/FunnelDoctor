const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase depuis les variables d'environnement
require('dotenv').config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: Variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes');
  process.exit(1);
}

// Cru00e9er le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log('ud83dudd0d Recherche des utilisateurs dans la base de donnu00e9es...');
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('u274c Erreur lors de la ru00e9cupu00e9ration des utilisateurs:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('u26a0ufe0f Aucun utilisateur trouvu00e9 dans la base de donnu00e9es.');
    return;
  }
  
  console.log('u2705 Utilisateurs trouvu00e9s:');
  data.forEach(user => {
    console.log(`ID: ${user.id}, Email: ${user.email || 'N/A'}`);
  });
  
  // Afficher les colonnes disponibles
  console.log('\nud83dudcca Structure de la table users:');
  const columns = Object.keys(data[0]);
  console.log(`Colonnes: ${columns.join(', ')}`);
}

listUsers()
  .catch(error => {
    console.error('u274c Erreur non gu00e9ru00e9e:', error);
  });
