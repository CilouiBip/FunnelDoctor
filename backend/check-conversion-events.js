const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  try {
    console.log('Checking Supabase connection...');
    console.log('URL:', process.env.SUPABASE_URL);
    console.log('Key available:', process.env.SUPABASE_SERVICE_KEY ? 'Yes' : 'No');
    
    const { data, error } = await supabase
      .from('conversion_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.error('Error fetching conversion events:', error);
      return;
    }
    
    console.log('\nLatest conversion events:');
    console.log(JSON.stringify(data, null, 2));
    
    // Also check the structure of the table
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('schema_check', { table_name: 'conversion_events' })
      .select('*');
      
    if (tableError) {
      console.log('\nError fetching table structure:', tableError);
    } else {
      console.log('\nTable structure:', tableInfo);
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

main();
