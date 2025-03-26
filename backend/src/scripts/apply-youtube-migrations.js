/**
 * Script pour appliquer les migrations YouTube manquantes
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: Variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes');
  process.exit(1);
}

// Créer le client Supabase avec la clé d'administrateur
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('🚀 APPLICATION DES MIGRATIONS YOUTUBE');
  console.log('====================================\n');

  // 1. Vérifier si les migrations ont déjà été appliquées
  try {
    console.log('📋 Vérification des tables existantes...');
    
    // Tenter d'accéder à la table youtube_videos
    const { error: videosError } = await supabase
      .from('youtube_videos')
      .select('count')
      .limit(1);
      
    if (!videosError) {
      console.log('✅ La table youtube_videos existe déjà.');
    } else if (videosError.code === '42P01') {
      console.log('ℹ️ La table youtube_videos n\'existe pas encore. Migration nécessaire.');
    } else {
      console.error('❌ Erreur lors de la vérification de youtube_videos:', videosError);
    }
    
    // Tenter d'accéder à la table youtube_video_stats
    const { error: statsError } = await supabase
      .from('youtube_video_stats')
      .select('count')
      .limit(1);
      
    if (!statsError) {
      console.log('✅ La table youtube_video_stats existe déjà.');
    } else if (statsError.code === '42P01') {
      console.log('ℹ️ La table youtube_video_stats n\'existe pas encore. Migration nécessaire.');
    } else {
      console.error('❌ Erreur lors de la vérification de youtube_video_stats:', statsError);
    }
    
    // Si les deux tables existent, sortir du script
    if (!videosError && !statsError) {
      console.log('\n✅ Toutes les tables YouTube existent déjà. Aucune migration nécessaire.');
      return;
    }
  } catch (e) {
    console.error('❌ Exception lors de la vérification des tables:', e);
  }

  // 2. Appliquer la migration youtube_videos_migration.sql
  try {
    console.log('\n📂 Lecture du fichier de migration youtube_videos_migration.sql...');
    const migrationPath = path.join(__dirname, 'youtube_videos_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('💾 Application de la migration youtube_videos_migration.sql...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Erreur lors de l\'application de la migration:', error);
      console.log('\n⚠️ Tentative alternative avec plusieurs requêtes séparées...');
      
      // Diviser le script en requêtes individuelles
      const queries = migrationSQL
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0);
      
      let successCount = 0;
      
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        console.log(`\n📦 Exécution de la requête ${i+1}/${queries.length}...`);
        console.log(`SQL: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
        
        try {
          const { error: queryError } = await supabase.rpc('exec_sql', { sql: query });
          
          if (queryError) {
            console.error(`❌ Erreur sur la requête ${i+1}:`, queryError);
          } else {
            console.log(`✅ Requête ${i+1} exécutée avec succès.`);
            successCount++;
          }
        } catch (queryExc) {
          console.error(`❌ Exception sur la requête ${i+1}:`, queryExc);
        }
      }
      
      console.log(`\n📊 Bilan: ${successCount}/${queries.length} requêtes exécutées avec succès.`);
    } else {
      console.log('✅ Migration youtube_videos_migration.sql appliquée avec succès.');
    }
  } catch (e) {
    console.error('❌ Exception lors de l\'application de la migration:', e);
  }

  // 3. Vérifier si la migration a bien été appliquée
  try {
    console.log('\n🔍 Vérification de l\'application des migrations...');
    
    // Vérifier youtube_videos
    const { error: videosError } = await supabase
      .from('youtube_videos')
      .select('count')
      .limit(1);
      
    if (!videosError) {
      console.log('✅ La table youtube_videos a été créée avec succès.');
    } else {
      console.error('❌ La table youtube_videos n\'a pas été créée:', videosError);
    }
    
    // Vérifier youtube_video_stats
    const { error: statsError } = await supabase
      .from('youtube_video_stats')
      .select('count')
      .limit(1);
      
    if (!statsError) {
      console.log('✅ La table youtube_video_stats a été créée avec succès.');
    } else {
      console.error('❌ La table youtube_video_stats n\'a pas été créée:', statsError);
    }
  } catch (e) {
    console.error('❌ Exception lors de la vérification finale:', e);
  }

  console.log('\n🏁 OPÉRATION TERMINÉE');
}

applyMigrations()
  .catch(error => {
    console.error('❌ Erreur non gérée pendant l\'application des migrations:', error);
    process.exit(1);
  });
