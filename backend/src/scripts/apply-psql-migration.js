/**
 * Script pour appliquer les migrations YouTube via psql
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

async function applyMigrationWithPsql() {
  console.log('🚀 APPLICATION DES MIGRATIONS YOUTUBE VIA PSQL');
  console.log('====================================\n');

  // Utiliser les variables Supabase au lieu de DATABASE_URL
  require('dotenv').config();
  
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
  
  // URL de connexion PostgreSQL pour Supabase
  const dbUrl = `postgres://postgres:${serviceRoleKey}@db.${projectId}.supabase.co:5432/postgres`;
  
  console.log('✅ URL de connexion PostgreSQL construite avec succès à partir des identifiants Supabase');
  console.log(`🔐 Connexion au projet Supabase: ${projectId}`);

  const migrationPath = path.join(__dirname, 'youtube_videos_migration.sql');
  console.log(`📂 Utilisation du fichier: ${migrationPath}`);

  // Vérifier si le fichier existe
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Erreur: Le fichier de migration n'existe pas: ${migrationPath}`);
    process.exit(1);
  }

  try {
    console.log('🔄 Exécution de la migration via psql...');
    
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
    
    // Vérifier la création des tables
    console.log('\n🔍 Vérification des tables créées...');
    const verifyCommand = `psql "${dbUrl}" -c "\\dt public.youtube*"`;
    const { stdout: verifyOut } = await execPromise(verifyCommand);
    console.log(verifyOut);
    
    if (verifyOut.includes('youtube_videos') && verifyOut.includes('youtube_video_stats')) {
      console.log('✅ Tables youtube_videos et youtube_video_stats créées avec succès!');
    } else {
      console.error('⚠️ Certaines tables n\'ont peut-être pas été créées correctement.');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    process.exit(1);
  }

  console.log('\n🏁 OPÉRATION TERMINÉE');
}

applyMigrationWithPsql()
  .catch(error => {
    console.error('❌ Erreur non gérée:', error);
    process.exit(1);
  });
