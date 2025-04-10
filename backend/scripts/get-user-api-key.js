/**
 * Script pour ru00e9cupu00e9rer la clu00e9 API d'un utilisateur par son email
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Chargement des variables d'environnement
const envPath = path.resolve(__dirname, '../.env');
const env = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...valueParts] = line.split('=');
    acc[key.trim()] = valueParts.join('=').trim();
    return acc;
  }, {});

// Configuration Supabase
const supabaseUrl = env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Service Key: ${supabaseServiceKey ? 'Disponible' : 'Non disponible'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement manquantes: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Email de l'utilisateur u00e0 rechercher (par du00e9faut ou depuis les arguments)
const userEmail = process.argv[2] || 'mciloui@yahoo.com';

// Client Supabase avec clu00e9 de service (accu00e8s admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getUserApiKey() {
  try {
    console.log(`Recherche de l'utilisateur avec l'email: ${userEmail}`);
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, api_key')
      .eq('email', userEmail)
      .single();
    
    if (error) {
      console.error('Erreur lors de la recherche de l\'utilisateur:', error);
      process.exit(1);
    }
    
    if (!data) {
      console.log(`\n\u274c Aucun utilisateur trouvu00e9 avec l'email ${userEmail}`);
      process.exit(1);
    }
    
    console.log('\n\u2713 Utilisateur trouvu00e9:');
    console.log(`ID: ${data.id}`);
    console.log(`Email: ${data.email}`);
    console.log(`Clu00e9 API: ${data.api_key || 'Non du00e9finie'}`);
  } catch (error) {
    console.error('Exception lors de l\'exu00e9cution de la requu00eate:', error);
    process.exit(1);
  }
}

// Exu00e9cution de la requu00eate
getUserApiKey();
