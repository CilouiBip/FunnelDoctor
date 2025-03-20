/**
 * Script pour vérifier le schéma de la base de données
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Chargement manuel des variables d'environnement
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
console.log(`Supabase Service Key: ${supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + '...' : 'Non définie'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement manquantes: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Création du client Supabase avec la clé de service (accès admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('\n==== Vérification du schéma de la base de données ====\n');
  
  try {
    // Vérifier les tables disponibles
    console.log('1. Tables disponibles dans la base de données:');
    const { data: tables, error: tablesError } = await supabase
      .rpc('pg_execute', { 
        query_text: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
      });
    
    if (tablesError) throw new Error(`Erreur lors de la récupération des tables: ${tablesError.message}`);
    
    tables.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    // Vérifier la structure de la table leads
    console.log('\n2. Structure de la table "leads":');
    const { data: leadsColumns, error: leadsError } = await supabase
      .rpc('pg_execute', { 
        query_text: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'leads' AND table_schema = 'public'
          ORDER BY ordinal_position
        `
      });
    
    if (leadsError) throw new Error(`Erreur lors de la récupération de la structure de la table leads: ${leadsError.message}`);
    
    if (leadsColumns && leadsColumns.length > 0) {
      console.log('   Colonnes:');
      leadsColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
      });
    } else {
      console.log('   Aucune colonne trouvée ou table inexistante');
    }
    
    // Vérifier les types enum disponibles
    console.log('\n3. Types enum définis dans la base de données:');
    const { data: enums, error: enumsError } = await supabase
      .rpc('pg_execute', { 
        query_text: `
          SELECT t.typname AS enum_name, e.enumlabel AS enum_value
          FROM pg_type t 
          JOIN pg_enum e ON t.oid = e.enumtypid
          JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public'
          ORDER BY enum_name, e.enumsortorder
        `
      });
    
    if (enumsError) throw new Error(`Erreur lors de la récupération des types enum: ${enumsError.message}`);
    
    if (enums && enums.length > 0) {
      // Regrouper les valeurs par nom d'enum
      const enumGroups = {};
      enums.forEach(e => {
        if (!enumGroups[e.enum_name]) {
          enumGroups[e.enum_name] = [];
        }
        enumGroups[e.enum_name].push(e.enum_value);
      });
      
      // Afficher chaque enum avec ses valeurs
      Object.keys(enumGroups).forEach(enumName => {
        console.log(`   - ${enumName}: ${enumGroups[enumName].join(', ')}`);
      });
    } else {
      console.log('   Aucun type enum trouvé');
    }
    
    // Vérifier si la table d'historique des statuts existe
    console.log('\n4. Vérification de la table "lead_status_history":');
    const { data: historyColumns, error: historyError } = await supabase
      .rpc('pg_execute', { 
        query_text: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'lead_status_history' AND table_schema = 'public'
          ORDER BY ordinal_position
        `
      });
    
    if (historyError) throw new Error(`Erreur lors de la vérification de la table lead_status_history: ${historyError.message}`);
    
    if (historyColumns && historyColumns.length > 0) {
      console.log('   Table lead_status_history trouvée. Colonnes:');
      historyColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
      });
    } else {
      console.log('   La table lead_status_history n\'existe pas');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DE LA VÉRIFICATION DU SCHÉMA:');
    console.error(error);
  }
}

checkSchema();
