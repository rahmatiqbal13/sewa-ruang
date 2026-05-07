const { Client } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function migrateData() {
  console.log('==============================================');
  console.log('Data Migration: Assets → Rooms & Equipment');
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
    
    // Check data in old assets table
    console.log('📊 ANALYZING DATA');
    console.log('=' .repeat(60));
    
    const assetsResult = await client.query(`
      SELECT 
        category,
        COUNT(*) as count,
        STRING_AGG(DISTINCT current_condition::text, ', ') as conditions,
        STRING_AGG(DISTINCT ketersediaan::text, ', ') as availabilities
      FROM assets
      GROUP BY category
      ORDER BY category
    `);
    
    console.log('\nData in assets table (old):');
    assetsResult.rows.forEach(row => {
      console.log(`  • ${row.category}: ${row.count} records`);
      console.log(`    Conditions: ${row.conditions}`);
      if (row.availabilities) {
        console.log(`    Availability: ${row.availabilities}`);
      }
    });
    
    // Check current data in new tables
    const roomsCount = await client.query('SELECT COUNT(*) FROM rooms');
    const equipmentCount = await client.query('SELECT COUNT(*) FROM equipment');
    
    console.log('\nCurrent data in new tables:');
    console.log(`  • rooms: ${roomsCount.rows[0].count} records`);
    console.log(`  • equipment: ${equipmentCount.rows[0].count} records`);
    
    // Check if migration is needed
    const unmigratedRooms = await client.query(`
      SELECT COUNT(*) FROM assets 
      WHERE category = 'room' 
      AND id NOT IN (SELECT id FROM rooms)
    `);
    
    const unmigratedEquipment = await client.query(`
      SELECT COUNT(*) FROM assets 
      WHERE category = 'equipment' 
      AND id NOT IN (SELECT id FROM equipment)
    `);
    
    const roomsToMigrate = parseInt(unmigratedRooms.rows[0].count);
    const equipmentToMigrate = parseInt(unmigratedEquipment.rows[0].count);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Rooms to migrate: ${roomsToMigrate}`);
    console.log(`Equipment to migrate: ${equipmentToMigrate}`);
    
    if (roomsToMigrate === 0 && equipmentToMigrate === 0) {
      console.log('\n✅ No data migration needed. All assets already migrated!');
      return;
    }
    
    // Ask for confirmation
    console.log('\n' + '='.repeat(60));
    const confirm = await new Promise((resolve) => {
      rl.question(`\nProceed with migration? (yes/no): `, (answer) => {
        resolve(answer.trim().toLowerCase());
      });
    });
    
    if (confirm !== 'yes') {
      console.log('Migration cancelled.');
      return;
    }
    
    // Get admin user for created_by
    const adminResult = await client.query(`
      SELECT id FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1
    `);
    
    if (adminResult.rows.length === 0) {
      console.error('Error: No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    
    const adminId = adminResult.rows[0].id;
    
    // Start migration
    console.log('\n🚀 STARTING MIGRATION');
    console.log('=' .repeat(60));
    
    // Migrate Rooms
    if (roomsToMigrate > 0) {
      console.log(`\nMigrating ${roomsToMigrate} rooms...`);
      
      const roomsResult = await client.query(`
        INSERT INTO rooms (
          id, name, building_id, floor_number, room_sequence, room_code,
          description, capacity, rate_per_hour, rate_per_day, is_active,
          is_for_rent, operating_hours, current_condition, photo_url, 
          created_by, created_at, updated_at
        )
        SELECT 
          a.id, 
          a.name, 
          a.building_id, 
          a.floor_number, 
          a.room_sequence, 
          a.room_code,
          a.description, 
          a.capacity, 
          a.rate_per_hour, 
          a.rate_per_day, 
          a.is_active,
          TRUE as is_for_rent,
          a.operating_hours,
          a.current_condition::asset_condition,
          a.photo_url,
          $1 as created_by,
          a.created_at,
          a.updated_at
        FROM assets a
        WHERE a.category = 'room'
        AND a.id NOT IN (SELECT id FROM rooms)
        ON CONFLICT (id) DO NOTHING
        RETURNING id, name, room_code
      `, [adminId]);
      
      console.log(`  ✓ Migrated ${roomsResult.rows.length} rooms`);
      
      // Migrate room images
      const roomImagesResult = await client.query(`
        INSERT INTO room_images (room_id, url, display_order)
        SELECT ai.asset_id, ai.url, ai.display_order
        FROM asset_images ai
        JOIN rooms r ON r.id = ai.asset_id
        WHERE ai.asset_id IN (
          SELECT id FROM assets WHERE category = 'room'
        )
        ON CONFLICT DO NOTHING
        RETURNING id
      `);
      
      console.log(`  ✓ Migrated ${roomImagesResult.rows.length} room images`);
    }
    
    // Migrate Equipment
    if (equipmentToMigrate > 0) {
      console.log(`\nMigrating ${equipmentToMigrate} equipment...`);
      
      const equipmentResult = await client.query(`
        INSERT INTO equipment (
          id, name, equipment_code, description, merk, model, serial_number,
          category, current_condition, ketersediaan, status_tindakan,
          rate_per_hour, rate_per_day, sumber, tgl_terakhir_cek,
          is_active, photo_url, current_location, storage_room_id,
          created_by, created_at, updated_at
        )
        SELECT 
          a.id,
          a.name,
          a.room_code as equipment_code,
          a.description,
          a.merk,
          a.model,
          a.serial_number,
          a.sub_category as category,
          a.current_condition::asset_condition,
          a.ketersediaan::availability_status,
          a.status_tindakan::action_status,
          a.rate_per_hour,
          a.rate_per_day,
          a.sumber,
          a.tgl_terakhir_cek,
          a.is_active,
          a.photo_url,
          a.current_location,
          NULL as storage_room_id,
          $1 as created_by,
          a.created_at,
          a.updated_at
        FROM assets a
        WHERE a.category = 'equipment'
        AND a.id NOT IN (SELECT id FROM equipment)
        ON CONFLICT (id) DO NOTHING
        RETURNING id, name, equipment_code
      `, [adminId]);
      
      console.log(`  ✓ Migrated ${equipmentResult.rows.length} equipment`);
      
      // Migrate equipment images
      const equipmentImagesResult = await client.query(`
        INSERT INTO equipment_images (equipment_id, url, display_order)
        SELECT ai.asset_id, ai.url, ai.display_order
        FROM asset_images ai
        JOIN equipment e ON e.id = ai.asset_id
        WHERE ai.asset_id IN (
          SELECT id FROM assets WHERE category = 'equipment'
        )
        ON CONFLICT DO NOTHING
        RETURNING id
      `);
      
      console.log(`  ✓ Migrated ${equipmentImagesResult.rows.length} equipment images`);
    }
    
    // Final summary
    const finalRoomsCount = await client.query('SELECT COUNT(*) FROM rooms');
    const finalEquipmentCount = await client.query('SELECT COUNT(*) FROM equipment');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETED!');
    console.log('='.repeat(60));
    console.log('\nBefore:');
    console.log(`  • rooms: ${roomsCount.rows[0].count}`);
    console.log(`  • equipment: ${equipmentCount.rows[0].count}`);
    console.log('\nAfter:');
    console.log(`  • rooms: ${finalRoomsCount.rows[0].count}`);
    console.log(`  • equipment: ${finalEquipmentCount.rows[0].count}`);
    console.log(`\nTotal migrated: ${parseInt(finalRoomsCount.rows[0].count) - parseInt(roomsCount.rows[0].count) + parseInt(finalEquipmentCount.rows[0].count) - parseInt(equipmentCount.rows[0].count)} records`);
    
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

migrateData().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
