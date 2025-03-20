/**
 * Script pour exu00e9cuter un fichier SQL via Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Chargement des variables d'environnement
const envPath = path.resolve(__dirname, '../../.env');
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

// Client Supabase avec clu00e9 de service (accu00e8s admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql() {
  try {
    const sqlFilePath = process.argv[2];
    if (!sqlFilePath) {
      console.error('Veuillez spu00e9cifier le chemin vers un fichier SQL');
      console.log('Usage: node execute-sql.js <chemin-vers-fichier-sql>');
      process.exit(1);
    }
    
    const fullPath = path.resolve(process.cwd(), sqlFilePath);
    console.log(`Lecture du fichier SQL: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`Le fichier ${fullPath} n'existe pas`);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(fullPath, 'utf8');
    console.log('\nContenu SQL:');
    console.log('----------');
    console.log(sqlContent);
    console.log('----------\n');
    
    // Su00e9parer le script SQL en requu00eates individuelles
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Exu00e9cution de ${statements.length} instructions SQL...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`[${i + 1}/${statements.length}] Exu00e9cution de la requu00eate:`);
      
      const { data, error } = await supabase.rpc('pg_execute', { query_text: statement });
      
      if (error) {
        console.error(`\n\u274c Erreur lors de l'exu00e9cution:`);
        console.error(error);
        
        if (error.message.includes('not find the function')) {
          console.log('\nRu00e9solution alternative: utiliser les APIs Supabase pour les opu00e9rations spu00e9cifiques...');
          
          // Si la fonction RPC n'est pas disponible, exu00e9cuter chaque instruction manuellement
          if (statement.toLowerCase().includes('create table') && statement.toLowerCase().includes('lead_status_history')) {
            console.log('Cru00e9ation de la table lead_status_history via l\'API Supabase...');
            
            // Vu00e9rifier si la table existe du00e9ju00e0
            const { data: tableExists, error: tableError } = await supabase
              .from('lead_status_history')
              .select('count(*)')
              .limit(1)
              .maybeSingle();
            
            if (tableError && !tableError.message.includes('does not exist')) {
              console.error('Erreur lors de la vu00e9rification de la table:', tableError);
            } else if (!tableError) {
              console.log('\u2713 La table lead_status_history existe du00e9ju00e0');
            } else {
              console.log('La table n\'existe pas encore, utilisation de la console Supabase nu00e9cessaire');
              console.log('Veuillez copier et exu00e9cuter le script SQL dans l\'interface SQL de Supabase.');
            }
          }
        }
      } else {
        console.log(`\u2713 Requu00eate exu00e9cutu00e9e avec succu00e8s!`);
      }
      
      console.log(''); // Ligne vide pour une meilleure lisibilitu00e9
    }
    
    console.log('\n\u2705 Toutes les requu00eates ont u00e9tu00e9 traitu00e9es!');
    console.log('\nConsultez les logs ci-dessus pour les du00e9tails sur chaque opu00e9ration.');
    console.log('\nNOTE IMPORTANTE:');
    console.log('Si certaines opu00e9rations ont u00e9chouu00e9, vous devrez peut-u00eatre exu00e9cuter le script');
    console.log('directement dans l\'interface SQL de Supabase.');
    
  } catch (error) {
    console.error('\n\u274c Erreur gu00e9nu00e9rale:');
    console.error(error);
  }
}

executeSql();
