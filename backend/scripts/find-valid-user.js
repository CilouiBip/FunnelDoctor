// Script pour trouver un utilisateur valide dans Supabase
require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');

async function findValidUser() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Erreur: Variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    console.log('Recherche d\'utilisateurs valides dans Supabase...');
    
    // Requête pour trouver les utilisateurs (limité à 5)
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);

    if (error) {
      console.error('Erreur lors de la recherche d\'utilisateurs:', error);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('Aucun utilisateur trouvé dans la base de données.');
    } else {
      console.log('Utilisateurs trouvés:');
      users.forEach(user => {
        console.log(`- ID: ${user.id} | Email: ${user.email}`);
      });
      console.log('\nUtilisez l\'un de ces IDs comme user_id valide pour tester le bridging.');
    }
  } catch (error) {
    console.error('Erreur non gérée:', error);
  }
}

findValidUser();
