/**
 * Script de test pour valider l'intu00e9gration Calendly de bout en bout
 * Permet de vu00e9rifier le traitement des webhooks et les insertions dans conversion_events
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Utiliser la clu00e9 de service pour contourner la RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('Les variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Vu00e9rifie si la structure de la table conversion_events est correcte
 */
async function validateConversionEventsStructure() {
  console.log('\n=== Vu00e9rification de la structure de conversion_events ===');
  
  try {
    // Ru00e9cupu00e9rer les informations sur les colonnes de la table
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'conversion_events' });
    
    if (error) {
      console.error('Erreur lors de la ru00e9cupu00e9ration de la structure de la table:', error);
      // Utiliser une approche alternative si rpc n'est pas disponible
      const sample = await supabase.from('conversion_events').select('*').limit(1);
      if (sample.data && sample.data[0]) {
        console.log('Colonnes disponibles (selon un u00e9chantillon) :', Object.keys(sample.data[0]));
        return false;
      }
      return false;
    }
    
    // Vu00e9rifier la pru00e9sence des colonnes attendues
    const requiredColumns = [
      'id', 'lead_id', 'event_type', 'event_data', 'created_at', 'updated_at', 'user_id', 'page_url', 'site_id'
    ];
    
    const missingColumns = [];
    const availableColumns = data.map(col => col.column_name);
    
    console.log('Colonnes disponibles:', availableColumns.join(', '));
    
    for (const col of requiredColumns) {
      if (!availableColumns.includes(col)) {
        missingColumns.push(col);
      }
    }
    
    if (missingColumns.length > 0) {
      console.error('Colonnes manquantes:', missingColumns.join(', '));
      return false;
    }
    
    console.log('La structure de la table conversion_events est correcte u2705');
    return true;
  } catch (error) {
    console.error('Erreur lors de la validation de la structure:', error);
    return false;
  }
}

/**
 * Teste l'insertion d'un u00e9vu00e9nement de conversion similaire u00e0 Calendly
 */
async function testConversionEventInsert() {
  console.log('\n=== Test d\'insertion dans conversion_events ===');
  
  try {
    // Gu00e9nu00e9rer un identifiant de test unique
    const testId = `test_${Date.now()}`;
    
    // Vu00e9rifier si un utilisateur de test existe
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (userError || !userData || userData.length === 0) {
      console.error('Aucun utilisateur trouvu00e9 pour le test');
      return false;
    }
    
    const userId = userData[0].id;
    
    // Vu00e9rifier si un lead de test existe
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .limit(1);
      
    if (leadError || !leadData || leadData.length === 0) {
      console.error('Aucun lead trouvu00e9 pour le test');
      return false;
    }
    
    const leadId = leadData[0].id;
    
    // Insu00e9rer un u00e9vu00e9nement de test
    const { data, error } = await supabase
      .from('conversion_events')
      .insert({
        lead_id: leadId,
        event_type: 'DEMO_REQUEST',
        event_data: {
          source: 'calendly-v2',
          test_id: testId,
          event_name: 'Test RDV',
          scheduled_time: new Date().toISOString()
        },
        user_id: userId,
        page_url: 'https://test.example.com?utm_source=test',
        site_id: 'test'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erreur lors de l\'insertion de l\'u00e9vu00e9nement de test:', error);
      return false;
    }
    
    console.log('U00c9vu00e9nement de test insu00e9ru00e9 avec succu00e8s u2705', data);
    
    // Vu00e9rifier que l'u00e9vu00e9nement existe bien
    const { data: verifyData, error: verifyError } = await supabase
      .from('conversion_events')
      .select('*')
      .eq('id', data.id)
      .single();
    
    if (verifyError) {
      console.error('Erreur lors de la vu00e9rification de l\'u00e9vu00e9nement:', verifyError);
      return false;
    }
    
    console.log('Vu00e9rification de l\'u00e9vu00e9nement ru00e9ussie u2705', { 
      id: verifyData.id,
      lead_id: verifyData.lead_id,
      event_type: verifyData.event_type,
      user_id: verifyData.user_id
    });
    
    return true;
  } catch (error) {
    console.error('Erreur lors du test d\'insertion:', error);
    return false;
  }
}

/**
 * Vu00e9rifie les derniers u00e9vu00e9nements dans les tables de suivi
 */
async function checkRecentEvents() {
  console.log('\n=== Vu00e9rification des derniers u00e9vu00e9nements ===');
  
  try {
    // 1. Derniers u00e9vu00e9nements de conversion
    const { data: conversionData, error: conversionError } = await supabase
      .from('conversion_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (conversionError) {
      console.error('Erreur lors de la ru00e9cupu00e9ration des u00e9vu00e9nements de conversion:', conversionError);
    } else {
      console.log('Derniers u00e9vu00e9nements de conversion:', 
        conversionData.map(e => ({ 
          id: e.id, 
          event_type: e.event_type, 
          created_at: e.created_at,
          user_id: e.user_id
        })));
    }
    
    // 2. Derniers touchpoints
    const { data: touchpointData, error: touchpointError } = await supabase
      .from('touchpoints')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (touchpointError) {
      console.error('Erreur lors de la ru00e9cupu00e9ration des touchpoints:', touchpointError);
    } else {
      console.log('Derniers touchpoints:', 
        touchpointData.map(t => ({ 
          id: t.id, 
          event_type: t.event_type, 
          created_at: t.created_at,
          visitor_id: t.visitor_id
        })));
    }
    
    // 3. Derniers changements de statut
    const { data: statusData, error: statusError } = await supabase
      .from('lead_status_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (statusError) {
      console.error('Erreur lors de la ru00e9cupu00e9ration des changements de statut:', statusError);
    } else {
      console.log('Derniers changements de statut:', 
        statusData.map(s => ({ 
          id: s.id, 
          lead_id: s.lead_id, 
          old_status: s.old_status,
          new_status: s.new_status,
          created_at: s.created_at
        })));
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vu00e9rification des u00e9vu00e9nements ru00e9cents:', error);
    return false;
  }
}

/**
 * Exu00e9cute tous les tests
 */
async function runAllTests() {
  console.log('============================================================');
  console.log('    TEST D\'INTu00c9GRATION CALENDLY E2E - CONVERSION EVENTS');
  console.log('============================================================\n');
  
  let success = true;
  
  // Test 1: Vu00e9rifier la structure de la table
  success = await validateConversionEventsStructure() && success;
  
  // Test 2: Tester l'insertion d'un u00e9vu00e9nement
  success = await testConversionEventInsert() && success;
  
  // Test 3: Vu00e9rifier les u00e9vu00e9nements ru00e9cents
  success = await checkRecentEvents() && success;
  
  console.log('\n============================================================');
  if (success) {
    console.log('    u2705 TOUS LES TESTS ONT Ru00c9USSI');
  } else {
    console.log('    u274c CERTAINS TESTS ONT u00c9CHOUu00c9');
  }
  console.log('============================================================');
}

// Exu00e9cuter tous les tests
runAllTests().catch(error => {
  console.error('Erreur lors de l\'exu00e9cution des tests:', error);
  process.exit(1);
});
