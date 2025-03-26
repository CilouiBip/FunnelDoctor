/**
 * Script de diagnostic pour vérifier la structure des tables et comprendre les problèmes
 * d'intégration YouTube
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase depuis les variables d'environnement
require('dotenv').config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: Variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes');
  process.exit(1);
}

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseSchema() {
  console.log('🔍 DIAGNOSTIC DE SCHÉMA DE BASE DE DONNÉES');
  console.log('=========================================\n');

  // 1. Vérifier les tables existantes
  console.log('📋 TABLES EXISTANTES');
  console.log('-----------------');
  
  try {
    // Cette requête liste toutes les tables dans le schéma public
    const { data: tables, error } = await supabase
      .rpc('pg_catalog.get_tables', {
        schema_name: 'public'
      }, { use_tables: false });

    if (error) {
      console.error('❌ Erreur lors de la récupération des tables:', error);
      // Essayons une autre approche
      console.log('⚠️ Tentative alternative pour lister les tables...');
      const { data: tablesInfo, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
        
      if (tableError) {
        console.error('❌ Échec de la récupération des tables:', tableError);
      } else {
        console.log('✅ Tables trouvées:', tablesInfo.map(t => t.table_name).join(', '));
      }
    } else {
      console.log('✅ Tables trouvées:', tables.map(t => t.tablename).join(', '));
    }
  } catch (e) {
    console.error('❌ Exception lors de la récupération des tables:', e);
  }

  // 2. Examiner la structure des tables clés
  const tablesToExamine = ['integrations', 'users', 'youtube_videos', 'youtube_video_stats'];
  
  for (const tableName of tablesToExamine) {
    console.log(`\n📝 STRUCTURE DE LA TABLE: ${tableName}`);
    console.log('-'.repeat(tableName.length + 25));
    
    try {
      // Approche 1: Récupérer un enregistrement et examiner sa structure
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error && error.code === 'PGRST204') {
        console.error(`❌ Table '${tableName}' non trouvée:`, error.message);
        continue;
      }
      
      if (error) {
        console.error(`❌ Erreur lors de l'accès à la table '${tableName}':`, error);
        continue;
      }
      
      if (!data || data.length === 0) {
        console.log(`ℹ️ Table '${tableName}' existe mais est vide.`);
        
        // Approche 2: Récupérer la définition de la table depuis information_schema
        try {
          const { data: columns, error: columnError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_schema', 'public')
            .eq('table_name', tableName);
            
          if (columnError) {
            console.error(`❌ Erreur lors de la récupération des colonnes de '${tableName}':`, columnError);
          } else if (columns && columns.length > 0) {
            console.log(`✅ Structure de '${tableName}':`);
            columns.forEach(col => {
              console.log(`   - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
            });
          } else {
            console.log(`⚠️ Aucune information de colonne trouvée pour '${tableName}'`);
          }
        } catch (e) {
          console.error(`❌ Exception lors de la récupération des colonnes de '${tableName}':`, e);
        }
      } else {
        // Afficher la structure basée sur l'objet récupéré
        console.log(`✅ Structure de '${tableName}' (basée sur un enregistrement existant):`);
        const columns = Object.keys(data[0]);
        columns.forEach(col => {
          const value = data[0][col];
          const type = value === null ? 'NULL' : typeof value;
          console.log(`   - ${col} (${type})`);
        });
      }
    } catch (e) {
      console.error(`❌ Exception lors de l'examen de '${tableName}':`, e);
    }
  }

  // 3. Vérifier si IntegrationService utilise un schéma différent
  console.log('\n🔄 VÉRIFICATION DES CHAMPS DE L\'INTÉGRATION YOUTUBE');
  console.log('---------------------------------------------');
  
  try {
    // Vérifier les intégrations de type youtube
    const { data: youtubeIntegrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('integration_type', 'youtube')
      .limit(1);
      
    if (error) {
      console.error('❌ Erreur lors de la recherche d\'intégrations YouTube:', error);
      console.log('⚠️ Tentative de recherche sans filtre sur integration_type...');
      
      const { data: allIntegrations, error: allError } = await supabase
        .from('integrations')
        .select('*')
        .limit(5);
        
      if (allError) {
        console.error('❌ Erreur lors de la recherche d\'intégrations:', allError);
      } else if (!allIntegrations || allIntegrations.length === 0) {
        console.log('ℹ️ Aucune intégration trouvée dans la table.');
      } else {
        console.log('✅ Intégrations trouvées avec les champs suivants:');
        const columns = Object.keys(allIntegrations[0]);
        columns.forEach(col => {
          console.log(`   - ${col}`);
        });
        
        console.log('\n📊 Exemples d\'intégrations:');
        allIntegrations.forEach((integration, idx) => {
          console.log(`\nIntégration #${idx + 1}:`); 
          Object.entries(integration).forEach(([key, value]) => {
            // Tronquer les valeurs longues (tokens) pour meilleure lisibilité
            if (typeof value === 'string' && value.length > 50) {
              value = value.substring(0, 47) + '...';
            }
            console.log(`   ${key}: ${value}`);
          });
        });
      }
    } else if (!youtubeIntegrations || youtubeIntegrations.length === 0) {
      console.log('ℹ️ Aucune intégration YouTube trouvée dans la table.');
    } else {
      console.log('✅ Intégration YouTube trouvée avec les champs suivants:');
      const columns = Object.keys(youtubeIntegrations[0]);
      columns.forEach(col => {
        const value = youtubeIntegrations[0][col];
        const displayValue = value && typeof value === 'string' && value.length > 50 
          ? value.substring(0, 47) + '...' 
          : value;
        console.log(`   - ${col}: ${displayValue}`);
      });
    }
  } catch (e) {
    console.error('❌ Exception lors de la vérification des intégrations YouTube:', e);
  }

  // 4. Vérifier si les tables YouTube sont correctement créées
  console.log('\n🎬 VÉRIFICATION DES TABLES YOUTUBE');
  console.log('--------------------------------');
  
  const youtubeTables = ['youtube_videos', 'youtube_video_stats'];
  for (const tableName of youtubeTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .then(res => ({ data: res.count, error: res.error }));
        
      if (error) {
        console.error(`❌ Erreur lors de l'accès à la table '${tableName}':`, error);
      } else {
        console.log(`✅ Table '${tableName}' existe et contient ${data} enregistrements.`);
      }
    } catch (e) {
      console.error(`❌ Exception lors de la vérification de '${tableName}':`, e);
    }
  }

  console.log('\n🏁 DIAGNOSTIC TERMINÉ');
}

diagnoseSchema()
  .catch(error => {
    console.error('❌ Erreur non gérée pendant le diagnostic:', error);
    process.exit(1);
  });
