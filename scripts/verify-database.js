// Database connection and query verification script
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDatabase() {
  console.log('🔍 Verifying database connections and data...\n');

  const checks = [
    { name: 'Users', table: 'users', columns: 'id, name, email, role' },
    { name: 'Rooms', table: 'rooms', columns: 'id, name, room_code, capacity' },
    { name: 'Equipment', table: 'equipment', columns: 'id, name, equipment_code, category' },
    { name: 'Bookings', table: 'bookings', columns: 'id, reference_no, status, total_amount' },
    { name: 'Buildings', table: 'buildings', columns: 'id, name, code' },
    { name: 'Notification Templates', table: 'notification_templates', columns: 'id, event_type, channel, user_category' },
    { name: 'Notification Channels', table: 'notification_channel_configs', columns: 'channel, is_enabled' },
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const { data, error, count } = await supabase
        .from(check.table)
        .select(check.columns, { count: 'exact' })
        .limit(5);

      if (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
        allPassed = false;
      } else {
        console.log(`✅ ${check.name}: ${count} records found`);
        if (data && data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(data[0]).substring(0, 80)}...`);
        }
      }
    } catch (err) {
      console.log(`❌ ${check.name}: ${err.message}`);
      allPassed = false;
    }
  }

  // Check for critical relationships
  console.log('\n🔍 Checking relationships...');
  
  try {
    // Check bookings with users
    const { data: bookingsWithUsers, error: bwuError } = await supabase
      .from('bookings')
      .select('id, users(name, email), booking_items(*)')
      .limit(3);

    if (bwuError) {
      console.log(`❌ Bookings-Users relationship: ${bwuError.message}`);
      allPassed = false;
    } else {
      console.log(`✅ Bookings-Users relationship: OK (${bookingsWithUsers?.length || 0} samples)`);
    }

    // Check equipment with rooms
    const { data: equipmentWithRooms, error: ewrError } = await supabase
      .from('equipment')
      .select('id, name, rooms(name)')
      .limit(3);

    if (ewrError) {
      console.log(`❌ Equipment-Rooms relationship: ${ewrError.message}`);
      allPassed = false;
    } else {
      console.log(`✅ Equipment-Rooms relationship: OK (${equipmentWithRooms?.length || 0} samples)`);
    }

    // Check rooms with buildings
    const { data: roomsWithBuildings, error: rwbError } = await supabase
      .from('rooms')
      .select('id, name, buildings(name)')
      .limit(3);

    if (rwbError) {
      console.log(`❌ Rooms-Buildings relationship: ${rwbError.message}`);
      allPassed = false;
    } else {
      console.log(`✅ Rooms-Buildings relationship: OK (${roomsWithBuildings?.length || 0} samples)`);
    }

  } catch (err) {
    console.log(`❌ Relationship check failed: ${err.message}`);
    allPassed = false;
  }

  console.log('\n' + (allPassed ? '✅ All database checks passed!' : '❌ Some database checks failed'));
  return allPassed;
}

verifyDatabase().then(success => {
  process.exit(success ? 0 : 1);
});
