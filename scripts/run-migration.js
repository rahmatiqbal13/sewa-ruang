const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function runMigration() {
  console.log('==============================================');
  console.log('Migration Runner - Photo Columns');
  console.log('==============================================\n');
  
  // Load SQL file
  const sqlFile = 'scripts/migration-photo-columns.sql';
  const sqlPath = path.join(process.cwd(), sqlFile);
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`Error: File not found: ${sqlFile}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Loaded SQL file: ${sqlFile}\n`);
  
  // Parse SQL statements - better parsing
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      if (s.length === 0) return false;
      // Remove comment-only blocks
      const lines = s.split('\n').map(l => l.trim());
      const nonCommentLines = lines.filter(l => l.length > 0 && !l.startsWith('--'));
      return nonCommentLines.length > 0;
    });
  
  console.log(`Found ${statements.length} SQL statements to execute:\n`);
  statements.forEach((stmt, i) => {
    const lines = stmt.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('--'));
    const firstLine = lines[0] || '';
    console.log(`  ${i + 1}. ${firstLine.substring(0, 60)}${firstLine.length > 60 ? '...' : ''}`);
  });
  
  console.log('\n----------------------------------------------');
  console.log('Database Connection Required');
  console.log('----------------------------------------------');
  console.log('To run this migration, you need your Supabase');
  console.log('database password (not the service role key).');
  console.log('\nYou can find it in Supabase Dashboard:');
  console.log('Project Settings > Database > Connection string');
  console.log('----------------------------------------------\n');
  
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
    
    console.log('Executing migration...');
    console.log('=' .repeat(60));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const lines = stmt.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('--'));
      const firstLine = lines[0] || '';
      process.stdout.write(`\n[${i + 1}/${statements.length}] ${firstLine.substring(0, 50)}... `);
      
      try {
        await client.query(stmt);
        console.log('✓');
        successCount++;
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('✓ (already exists)');
          successCount++;
        } else {
          console.log(`✗ Error: ${err.message}`);
          errorCount++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Migration completed!`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✓ All statements executed successfully!');
    } else if (errorCount < statements.length) {
      console.log('\n⚠ Some statements failed (possibly already applied)');
    }
    
  } catch (err) {
    console.error(`\n✗ Connection failed: ${err.message}`);
    if (err.message.includes('password')) {
      console.error('\nPlease check your database password and try again.');
    }
    process.exit(1);
  } finally {
    await client.end();
    rl.close();
  }
}

runMigration().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
