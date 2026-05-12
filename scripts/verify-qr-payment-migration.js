// Script untuk test QR Payment system setelah migration
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMigration() {
  console.log('🔍 Verifying QR Payment Migration...\n');
  
  let allPassed = true;

  // Test 1: Check new columns in bookings
  console.log('1️⃣ Checking bookings table columns...');
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'bookings')
    .eq('table_schema', 'public')
    .in('column_name', ['payment_qr_url', 'payment_code', 'payment_proof_url', 'payment_verified_at']);

  if (colError) {
    console.log('   ❌ Error:', colError.message);
    allPassed = false;
  } else if (columns && columns.length >= 4) {
    console.log('   ✅ Bookings columns OK (' + columns.length + ' payment columns found)');
  } else {
    console.log('   ❌ Missing columns in bookings table');
    console.log('   Found:', columns?.map(c => c.column_name).join(', '));
    allPassed = false;
  }

  // Test 2: Check payment_proofs table
  console.log('\n2️⃣ Checking payment_proofs table...');
  const { count: proofsCount, error: proofsError } = await supabase
    .from('payment_proofs')
    .select('*', { count: 'exact', head: true });

  if (proofsError) {
    console.log('   ❌ Error:', proofsError.message);
    console.log('   💡 Table might not exist yet');
    allPassed = false;
  } else {
    console.log('   ✅ payment_proofs table exists');
  }

  // Test 3: Check bank_accounts table
  console.log('\n3️⃣ Checking bank_accounts table...');
  const { data: banks, error: banksError } = await supabase
    .from('bank_accounts')
    .select('*');

  if (banksError) {
    console.log('   ❌ Error:', banksError.message);
    allPassed = false;
  } else if (banks && banks.length > 0) {
    console.log('   ✅ bank_accounts table exists with ' + banks.length + ' records');
    banks.forEach(b => {
      console.log(`      - ${b.bank_name}: ${b.account_number}`);
    });
  } else {
    console.log('   ⚠️  Table exists but no data (banks not inserted)');
  }

  // Test 4: Check function exists
  console.log('\n4️⃣ Checking database functions...');
  const { data: funcs, error: funcError } = await supabase
    .rpc('verify_booking_payment', {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
      p_admin_id: '00000000-0000-0000-0000-000000000000',
      p_status: 'verified'
    });

  // This will fail with "booking not found" but that's OK - function exists
  if (funcError && funcError.message.includes('function') && funcError.message.includes('does not exist')) {
    console.log('   ❌ verify_booking_payment function not found');
    allPassed = false;
  } else {
    console.log('   ✅ verify_booking_payment function exists');
  }

  // Test 5: Check storage bucket
  console.log('\n5️⃣ Checking storage bucket...');
  const { data: buckets, error: bucketError } = await supabase
    .storage
    .listBuckets();

  if (bucketError) {
    console.log('   ❌ Error checking buckets:', bucketError.message);
    allPassed = false;
  } else {
    const paymentsBucket = buckets?.find(b => b.name === 'payments');
    if (paymentsBucket) {
      console.log('   ✅ payments bucket exists');
    } else {
      console.log('   ❌ payments bucket NOT found');
      console.log('   💡 Please create bucket manually in Supabase Dashboard');
      allPassed = false;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('QR Payment system is ready to use!');
  } else {
    console.log('❌ SOME CHECKS FAILED');
    console.log('Please apply migration first:');
    console.log('1. Copy SQL from: supabase/migrations/20250512_qr_payment_system_QUICK.sql');
    console.log('2. Paste to Supabase SQL Editor');
    console.log('3. Run the SQL');
    console.log('4. Create storage bucket "payments" in Supabase Dashboard');
  }
  console.log('='.repeat(50));

  return allPassed;
}

// Run verification
verifyMigration().then(success => {
  process.exit(success ? 0 : 1);
});
