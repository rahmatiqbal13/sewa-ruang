// Migration script to apply user_category column to notification_templates
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying migration: Add user_category to notification_templates\n');

  try {
    // 1. Check if column exists
    console.log('1. Checking if user_category column exists...');
    const { data: columnExists, error: checkError } = await supabase
      .rpc('check_column_exists', {
        p_table_name: 'notification_templates',
        p_column_name: 'user_category'
      });

    if (checkError) {
      console.log('   Column check function not available, will try direct approach...');
    }

    // 2. Add column if not exists using raw SQL
    console.log('2. Adding user_category column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE public.notification_templates 
        ADD COLUMN IF NOT EXISTS user_category TEXT DEFAULT 'default';
      `
    });

    if (alterError && !alterError.message.includes('already exists')) {
      console.log('   Note:', alterError.message);
    }

    // 3. Update existing rows
    console.log('3. Updating existing rows with default category...');
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql_query: `
        UPDATE public.notification_templates 
        SET user_category = 'default' 
        WHERE user_category IS NULL;
      `
    });

    if (updateError) {
      console.log('   Update note:', updateError.message);
    }

    // 4. Drop old constraint and create new one
    console.log('4. Updating unique constraint...');
    await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE public.notification_templates 
        DROP CONSTRAINT IF EXISTS notification_templates_event_type_channel_key;
      `
    });

    await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE public.notification_templates 
        DROP CONSTRAINT IF EXISTS notification_templates_event_type_channel_category_key;
      `
    });

    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE public.notification_templates 
        ADD CONSTRAINT notification_templates_event_type_channel_category_key 
        UNIQUE (event_type, channel, user_category);
      `
    });

    if (constraintError && !constraintError.message.includes('already exists')) {
      console.log('   Constraint note:', constraintError.message);
    }

    // 5. Create index
    console.log('5. Creating index...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE INDEX IF NOT EXISTS idx_notification_templates_category 
        ON public.notification_templates(user_category);
      `
    });

    if (indexError) {
      console.log('   Index note:', indexError.message);
    }

    // 6. Verify
    console.log('\n✅ Migration completed!');
    const { data: templates, error: countError } = await supabase
      .from('notification_templates')
      .select('event_type, channel, user_category, is_active')
      .order('event_type');

    if (countError) {
      console.error('Error fetching templates:', countError);
    } else {
      console.log(`\n📊 Total templates: ${templates?.length || 0}`);
      
      const nullCategories = templates?.filter(t => !t.user_category).length || 0;
      const uniqueCategories = new Set(templates?.map(t => t.user_category)).size;
      
      console.log(`   Templates without category: ${nullCategories}`);
      console.log(`   Unique categories: ${uniqueCategories}`);
      
      if (templates && templates.length > 0) {
        console.log('\n📋 Sample templates:');
        templates.slice(0, 5).forEach(t => {
          console.log(`   - ${t.event_type} (${t.channel}): ${t.user_category || 'N/A'}`);
        });
      }
    }

    return true;
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    return false;
  }
}

applyMigration().then(success => {
  process.exit(success ? 0 : 1);
});
