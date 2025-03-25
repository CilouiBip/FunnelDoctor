import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '../../.env') });

// Configurer le client Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: SUPABASE_URL et SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY doivent être définis dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TableOptions {
  limit?: number;
  userId?: string;
  visitorId?: string;
  leadId?: string;
}

async function getTableData(tableName: string, options: TableOptions = {}) {
  const {
    limit = 10,
    userId,
    visitorId,
    leadId,
  } = options;
  
  let query = supabase.from(tableName).select('*').limit(limit);
  
  // Appliquer les filtres si nécessaire
  if (userId) query = query.eq('user_id', userId);
  if (visitorId) query = query.eq('visitor_id', visitorId);
  if (leadId) query = query.eq('lead_id', leadId);
  
  const { data, error } = await query;
  
  if (error) {
    console.error(`Erreur lors de la récupération des données de ${tableName}:`, error);
    return [];
  }
  
  return data;
}

async function getFunnelSteps(userId: string = '123e4567-e89b-12d3-a456-426614174000') {
  const { data, error } = await supabase
    .from('funnel_steps')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Erreur lors de la récupération des étapes du funnel:', error);
    return [];
  }
  
  return data;
}

async function getVisitors(options: TableOptions = {}) {
  return getTableData('visitors', options);
}

async function getLeads(options: TableOptions = {}) {
  return getTableData('leads', options);
}

async function getPayments(options: TableOptions = {}) {
  return getTableData('payments', options);
}

async function getTouchpoints(options: TableOptions = {}) {
  return getTableData('touchpoints', options);
}

async function run() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options: TableOptions = {};
  
  // Parser les options supplémentaires
  if (args.length > 1) {
    args.slice(1).forEach(arg => {
      if (arg.startsWith('--limit=')) {
        options.limit = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('--user-id=')) {
        options.userId = arg.split('=')[1];
      } else if (arg.startsWith('--visitor-id=')) {
        options.visitorId = arg.split('=')[1];
      } else if (arg.startsWith('--lead-id=')) {
        options.leadId = arg.split('=')[1];
      }
    });
  }
  
  try {
    switch (command) {
      case 'visitors':
        console.log('Visiteurs:', await getVisitors(options));
        break;
      case 'leads':
        console.log('Leads:', await getLeads(options));
        break;
      case 'payments':
        console.log('Paiements:', await getPayments(options));
        break;
      case 'touchpoints':
        console.log('Touchpoints:', await getTouchpoints(options));
        break;
      case 'funnel-steps':
        const userId = options.userId || '123e4567-e89b-12d3-a456-426614174000';
        console.log(`Étapes du funnel pour l'utilisateur ${userId}:`, await getFunnelSteps(userId));
        break;
      default:
        console.log('Commande non reconnue. Utilisez: visitors, leads, payments, touchpoints, funnel-steps');
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    process.exit(0);
  }
}

run();
