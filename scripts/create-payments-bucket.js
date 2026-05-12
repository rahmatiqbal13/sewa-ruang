// Create storage bucket for payment proofs
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createStorageBucket() {
  console.log('🔧 Creating storage bucket "payments"...\n');

  try {
    // Create bucket
    const { data: bucket, error: createError } = await supabase.storage.createBucket('payments', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg']
    });

    if (createError) {
      if (createError.message.includes('already exists')) {
        console.log('✅ Bucket "payments" already exists');
      } else {
        console.log('❌ Error creating bucket:', createError.message);
        console.log('\n💡 Please create bucket manually in Supabase Dashboard:');
        console.log('1. Go to Storage → New bucket');
        console.log('2. Name: payments');
        console.log('3. Check "Public bucket"');
        console.log('4. Click Save');
        return;
      }
    } else {
      console.log('✅ Bucket "payments" created successfully');
    }

    // Get bucket info
    const { data: buckets } = await supabase.storage.listBuckets();
    const paymentsBucket = buckets?.find(b => b.name === 'payments');
    
    if (paymentsBucket) {
      console.log('\n📋 Bucket info:');
      console.log('   Name:', paymentsBucket.name);
      console.log('   Public:', paymentsBucket.public);
      console.log('   ID:', paymentsBucket.id);
    }

    console.log('\n✅ Storage setup complete!');
    console.log('\n📝 Next: Set up bucket policies in Supabase Dashboard');
    console.log('   Go to: Storage → payments → Policies');
    console.log('   Add 3 policies: SELECT, INSERT, UPDATE for authenticated users');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Manual setup required:');
    console.log('1. Open Supabase Dashboard → Storage');
    console.log('2. Click "New bucket"');
    console.log('3. Name: payments');
    console.log('4. Check "Public bucket"');
    console.log('5. Click Save');
  }
}

createStorageBucket();
