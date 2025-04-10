/**
 * Script pour appliquer les migrations des fonctions d'analytics via psql
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

async function applyAnalyticsMigration() {
  console.log('🚀 APPLICATION DES MIGRATIONS DES FONCTIONS ANALYTICS VIA PSQL');
  console.log('====================================\n');

  // Charger le fichier .env du répertoire backend
  const path = require('path');
  const backendEnvPath = path.resolve(__dirname, '../../.env'); // Remonter de src/scripts vers backend/
  console.log(`[DEBUG] Tentative de chargement du fichier .env depuis: ${backendEnvPath}`);
  const dotenvResult = require('dotenv').config({ path: backendEnvPath });

  if (dotenvResult.error) {
    console.error(`❌ Erreur lors du chargement du fichier .env depuis ${backendEnvPath}:`, dotenvResult.error);
    // Échouer si le .env backend n'est pas trouvé
    process.exit(1);
  }
  console.log(`📃 Fichier .env chargé depuis: ${backendEnvPath}`);
  
  // Récupérer SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Erreur: Variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes');
    console.error('Veuillez les ajouter dans votre fichier .env');
    process.exit(1);
  }
  
  // Extraire les informations de connexion à partir de l'URL Supabase
  // Format typique: https://project-id.supabase.co
  const urlParts = supabaseUrl.replace('https://', '').split('.');
  const projectId = urlParts[0];
  
  // Récupérer le mot de passe PostgreSQL
  const postgresPassword = process.env.POSTGRES_PASSWORD;
  
  if (!postgresPassword) {
    console.error('❌ Erreur: Variable d\'environnement POSTGRES_PASSWORD manquante');
    console.error('Veuillez l\'ajouter dans votre fichier .env');
    process.exit(1);
  }
  
  // URL de connexion PostgreSQL pour Supabase utilisant le mot de passe PostgreSQL direct
  // Encoder le mot de passe pour gérer les caractères spéciaux (@, #, etc.)
  const encodedPassword = encodeURIComponent(postgresPassword);
  const dbUrl = `postgres://postgres:${encodedPassword}@db.${projectId}.supabase.co:5432/postgres`;
  
  console.log(`[DEBUG] Mot de passe utilisé: ${postgresPassword}`);
  console.log(`[DEBUG] Mot de passe encodé: ${encodedPassword}`);
  
  console.log('✅ URL de connexion PostgreSQL construite avec succès à partir des identifiants Supabase');
  console.log(`🔐 Connexion au projet Supabase: ${projectId}`);

  // Permettre l'utilisation d'un fichier passé en argument
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('❌ Erreur: Veuillez spécifier le chemin du fichier de migration SQL');
    console.error('Usage: node apply-analytics-migration.js <chemin-du-fichier-sql>');
    process.exit(1);
  }

  const migrationPath = path.resolve(migrationFile);
  console.log(`📂 Utilisation du fichier: ${migrationPath}`);

  // Vérifier si le fichier existe
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Erreur: Le fichier de migration n'existe pas: ${migrationPath}`);
    process.exit(1);
  }

  try {
    console.log('🔄 Exécution de la migration des fonctions analytics via psql...');
    
    // Construire la commande psql
    const command = `psql "${dbUrl}" -f "${migrationPath}"`;
    
    // Exécuter la commande
    const { stdout, stderr } = await execPromise(command);
    
    // Analyser la sortie pour détecter erreurs vs notices
    if (stderr) {
      const lines = stderr.split('\n');
      const errors = lines.filter(line => !line.includes('NOTICE') && line.trim().length > 0);
      
      if (errors.length > 0) {
        console.error('⚠️ Erreurs lors de l\'exécution:');
        errors.forEach(err => console.error(`  ${err}`));
      } else {
        console.log('✅ Migration exécutée avec succès (avec notifications normales)');
      }
    } else {
      console.log('✅ Migration exécutée avec succès!');
    }
    
    // Afficher le résultat de la commande
    if (stdout) {
      console.log('\n📝 Résultat de la commande:');
      console.log(stdout);
    }
    
    // Vérifier les fonctions créées/mises à jour
    console.log('\n🔍 Vérification des fonctions mises à jour...');
    const verifyCommand = `psql "${dbUrl}" -c "\\df public.get_*"`;
    const { stdout: verifyOut } = await execPromise(verifyCommand);
    console.log(verifyOut);
    
    if (verifyOut.includes('get_events_by_category') || verifyOut.includes('get_funnel_stages_analysis')) {
      console.log('✅ Fonctions d\'analytics mises à jour avec succès!');
    } else {
      console.error('⚠️ Certaines fonctions n\'ont peut-être pas été mises à jour correctement.');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    process.exit(1);
  }

  console.log('\n🏁 OPÉRATION TERMINÉE');
}

applyAnalyticsMigration()
  .catch(error => {
    console.error('❌ Erreur non gérée:', error);
    process.exit(1);
  });
