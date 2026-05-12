// Test script to debug Supabase Auth admin user creation
// Run this to check if the Supabase Auth API is working

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omxfvkknhgnniimkfbvj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9teGZ2a2tuaGdubmlpbWtmYnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIxODYyOSwiZXhwIjoyMDkyNzk0NjI5fQ.4iVYsMS-y-dRYKvL73qdshDa9z7SvWK7-AUhJe3mWKA';

async function testAuth() {
  console.log('Testing Supabase Auth Admin API...\n');
  
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Test 1: List users (this verifies the service key works)
  console.log('Test 1: Listing users...');
  try {
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();
    if (usersError) {
      console.error('❌ Failed to list users:', usersError);
      return;
    }
    console.log('✅ Successfully listed users. Count:', usersData.users.length);
  } catch (e) {
    console.error('❌ Exception listing users:', e.message);
  }

  // Test 2: Try to create a test user
  console.log('\nTest 2: Creating test user...');
  const testEmail = `test${Date.now()}@example.com`;
  try {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: { name: 'Test User', role: 'borrower' }
    });
    
    if (error) {
      console.error('❌ Failed to create user:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
    } else {
      console.log('✅ Successfully created user:', data.user.id);
      console.log('User email:', data.user.email);
      
      // Clean up - delete test user
      console.log('\nTest 3: Cleaning up test user...');
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(data.user.id);
      if (deleteError) {
        console.error('⚠️  Failed to delete test user:', deleteError.message);
      } else {
        console.log('✅ Successfully deleted test user');
      }
    }
  } catch (e) {
    console.error('❌ Exception creating user:', e.message);
    console.error('Stack:', e.stack);
  }
}

testAuth();
