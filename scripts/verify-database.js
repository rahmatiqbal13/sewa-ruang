const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Expected schema structure
const expectedSchema = {
  tables: [
    'users',
    'buildings',
    'rooms',
    'room_images',
    'equipment',
    'equipment_images',
    'room_inventories',
    'room_inventory_images',
    'agreement_templates',
    'bookings',
    'booking_items',
    'room_booking_slots',
    'equipment_booking_slots',
    'booking_agreements',
    'booking_extensions',
    'booking_waitlists',
    'payments',
    'returns',
    'return_images',
    'room_schedule_blocks',
    'equipment_schedule_blocks',
    'asset_tracking_logs',
    'notifications',
    'notification_preferences',
    'notification_channel_configs',
    'notification_templates'
  ],
  columns: {
    'buildings': ['id', 'name', 'code', 'floor_count', 'address', 'description', 'photo_url', 'is_active', 'created_by', 'created_at'],
    'rooms': ['id', 'name', 'building_id', 'floor_number', 'room_sequence', 'room_code', 'description', 'capacity', 'rate_per_hour', 'rate_per_day', 'is_active', 'is_for_rent', 'operating_hours', 'current_condition', 'photo_url', 'created_by', 'created_at', 'updated_at'],
    'equipment': ['id', 'name', 'equipment_code', 'description', 'merk', 'model', 'serial_number', 'category', 'current_condition', 'ketersediaan', 'status_tindakan', 'rate_per_hour', 'rate_per_day', 'sumber', 'tgl_terakhir_cek', 'is_active', 'photo_url', 'current_location', 'storage_room_id', 'created_by', 'created_at', 'updated_at'],
    'returns': ['id', 'booking_id', 'returned_at', 'condition', 'notes', 'recorded_by', 'created_at', 'photo_url']
  }
};

async function verifyDatabase() {
  console.log('==============================================');
  console.log('Database Schema Verification');
  console.log('==============================================\n');
  
  // Get database password
  const password = await new Promise((resolve) => {
    rl.question('Enter your Supabase database password: ', (answer) => {
      resolve(answer.trim());
    });
  });
  
  if (!password) {
    console.error('Error: Password is required');
    process.exit(1);
  }
  
  // Build connection string
  const projectRef = 'omxfvkknhgnniimkfbvj';
  const connectionString = `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
  
  console.log('\nConnecting to database...');
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log('Connected successfully!\n');
    
    // Check all tables
    console.log('📋 CHECKING TABLES');
    console.log('=' .repeat(60));
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const existingTables = tablesResult.rows.map(r => r.table_name);
    const missingTables = expectedSchema.tables.filter(t => !existingTables.includes(t));
    const extraTables = existingTables.filter(t => !expectedSchema.tables.includes(t));
    
    console.log(`\n✓ Found ${existingTables.length} tables in public schema`);
    
    if (missingTables.length > 0) {
      console.log(`\n❌ Missing tables (${missingTables.length}):`);
      missingTables.forEach(t => console.log(`   - ${t}`));
    } else {
      console.log('\n✓ All expected tables exist');
    }
    
    if (extraTables.length > 0) {
      console.log(`\nℹ️ Extra tables found (${extraTables.length}):`);
      extraTables.forEach(t => console.log(`   - ${t}`));
    }
    
    // Check columns for specific tables
    console.log('\n\n📋 CHECKING COLUMNS');
    console.log('=' .repeat(60));
    
    for (const [tableName, expectedCols] of Object.entries(expectedSchema.columns)) {
      console.log(`\n🔍 Table: ${tableName}`);
      
      if (!existingTables.includes(tableName)) {
        console.log('   ❌ Table does not exist');
        continue;
      }
      
      const colsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      const existingCols = colsResult.rows.map(r => r.column_name);
      const missingCols = expectedCols.filter(c => !existingCols.includes(c));
      
      console.log(`   ✓ Found ${existingCols.length} columns`);
      
      if (missingCols.length > 0) {
        console.log(`   ❌ Missing columns: ${missingCols.join(', ')}`);
      } else {
        console.log(`   ✓ All expected columns present`);
      }
      
      // Show new columns from migration-photo-columns.sql
      if (tableName === 'buildings' && existingCols.includes('photo_url')) {
        console.log('   ✓ photo_url column added (from migration-photo-columns)');
      }
      if (tableName === 'returns' && existingCols.includes('photo_url')) {
        console.log('   ✓ photo_url column added (from migration-photo-columns)');
      }
      if (tableName === 'rooms' && existingCols.includes('is_for_rent')) {
        console.log('   ✓ is_for_rent column present (for controlling catalog visibility)');
      }
    }
    
    // Check RLS status
    console.log('\n\n📋 CHECKING ROW LEVEL SECURITY (RLS)');
    console.log('=' .repeat(60));
    
    const rlsResult = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1)
      ORDER BY tablename
    `, [expectedSchema.tables]);
    
    const rlsEnabled = rlsResult.rows.filter(r => r.rowsecurity);
    const rlsDisabled = rlsResult.rows.filter(r => !r.rowsecurity);
    
    console.log(`\n✓ RLS enabled on ${rlsEnabled.length} tables`);
    if (rlsDisabled.length > 0) {
      console.log(`\n⚠️ RLS not enabled on ${rlsDisabled.length} tables:`);
      rlsDisabled.forEach(r => console.log(`   - ${r.tablename}`));
    }
    
    // Check indexes
    console.log('\n\n📋 CHECKING INDEXES');
    console.log('=' .repeat(60));
    
    const indexResult = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = ANY($1)
      ORDER BY tablename, indexname
    `, [expectedSchema.tables]);
    
    const indexesByTable = {};
    indexResult.rows.forEach(row => {
      if (!indexesByTable[row.tablename]) {
        indexesByTable[row.tablename] = [];
      }
      indexesByTable[row.tablename].push(row.indexname);
    });
    
    console.log(`\n✓ Found ${indexResult.rows.length} indexes`);
    
    // Check for primary keys
    console.log('\n\n📋 CHECKING PRIMARY KEYS');
    console.log('=' .repeat(60));
    
    const pkResult = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ANY($1)
      ORDER BY tc.table_name
    `, [expectedSchema.tables]);
    
    console.log(`\n✓ Found ${pkResult.rows.length} primary key constraints`);
    
    // Check foreign keys
    console.log('\n\n📋 CHECKING FOREIGN KEYS');
    console.log('=' .repeat(60));
    
    const fkResult = await client.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ANY($1)
      ORDER BY tc.table_name
    `, [expectedSchema.tables]);
    
    console.log(`\n✓ Found ${fkResult.rows.length} foreign key constraints`);
    
    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ Tables: ${existingTables.length} found (${missingTables.length} missing)`);
    console.log(`✓ RLS Enabled: ${rlsEnabled.length} tables`);
    console.log(`✓ Indexes: ${indexResult.rows.length} total`);
    console.log(`✓ Primary Keys: ${pkResult.rows.length} constraints`);
    console.log(`✓ Foreign Keys: ${fkResult.rows.length} constraints`);
    
    if (missingTables.length === 0 && missingCols.length === 0) {
      console.log('\n✅ Schema verification PASSED - All good!');
    } else {
      console.log('\n⚠️ Schema verification completed with warnings');
    }
    
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    if (err.message.includes('password')) {
      console.error('\nPlease check your database password and try again.');
    }
    process.exit(1);
  } finally {
    await client.end();
    rl.close();
  }
}

verifyDatabase().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
