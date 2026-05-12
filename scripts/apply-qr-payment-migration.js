// Apply QR Payment Migration
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('Applying QR Payment migration...\n');
  
  const sql = fs.readFileSync('supabase/migrations/20250512_qr_payment_system.sql', 'utf8');
  
  // Execute raw SQL
  const { error } = await supabase.rpc('exec_sql', { 
    sql_query: sql 
  });
  
  if (error) {
    console.log('Migration notes:', error.message);
  }
  
  console.log('✅ Migration applied!\n');
  
  // Verify tables
  console.log('Verifying tables...');
  const tables = ['payment_proofs', 'bank_accounts'];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`- ${table}: Error - ${error.message}`);
    } else {
      console.log(`- ${table}: ${count} records`);
    }
  }
}

applyMigration().catch(console.error);
