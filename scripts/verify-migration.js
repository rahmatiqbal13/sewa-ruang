// Verification script for notification_templates table
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('🔍 Verifying migration status...\n');

  try {
    // Get all templates
    const { data: templates, error } = await supabase
      .from('notification_templates')
      .select('*')
      .order('event_type', { ascending: true })
      .order('channel', { ascending: true })
      .order('user_category', { ascending: true });

    if (error) {
      console.error('❌ Error fetching templates:', error.message);
      return;
    }

    console.log(`✅ Found ${templates?.length || 0} templates\n`);

    // Group by event_type and channel
    const grouped = templates?.reduce((acc, t) => {
      const key = `${t.event_type} (${t.channel})`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t.user_category);
      return acc;
    }, {});

    console.log('📋 Templates by Event Type and Channel:');
    console.log('─────────────────────────────────────────');
    Object.entries(grouped || {}).forEach(([key, categories]) => {
      console.log(`\n${key}:`);
      categories.forEach(cat => {
        console.log(`  └─ ${cat}`);
      });
    });

    // Summary
    const uniqueCategories = new Set(templates?.map(t => t.user_category));
    console.log('\n\n📊 Summary:');
    console.log('─────────────────────────────────────────');
    console.log(`Total templates: ${templates?.length || 0}`);
    console.log(`Unique categories: ${uniqueCategories.size}`);
    console.log(`Categories: ${Array.from(uniqueCategories).join(', ')}`);
    
    // Check for any null values
    const nullCount = templates?.filter(t => !t.user_category).length || 0;
    if (nullCount > 0) {
      console.log(`\n⚠️  Warning: ${nullCount} templates without user_category`);
    } else {
      console.log(`\n✅ All templates have user_category set`);
    }

    console.log('\n✅ Migration verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyMigration();
