/**
 * GMG Cobranzas — Migration Runner
 * 
 * Reads all SQL migration files and outputs instructions
 * for applying them via the Supabase SQL editor.
 * 
 * Usage: node scripts/migrate.js [--print]
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

function getMigrationFiles() {
  return fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    if (line.trim().startsWith('#') || !line.trim()) return;
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
  });
  return env;
}

async function tryRunViaApi(sqlContent) {
  // Attempt to run via Supabase Management API (requires access token)
  const env = loadEnv();
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) return false;

  // Management API approach - not available via service role key
  // The user must run the SQL in the Supabase dashboard SQL editor.
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const printMode = args.includes('--print');
  const files = getMigrationFiles();

  if (files.length === 0) {
    console.log('No migration files found in supabase/migrations/');
    return;
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          GMG Cobranzas — Database Migrations             ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  if (printMode) {
    // Print all SQL migrations concatenated
    console.log('-- GMG Cobranzas: Full Migration Script');
    console.log('-- Generated: ' + new Date().toISOString());
    console.log('-- Run this in your Supabase SQL Editor\n');
    files.forEach(file => {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`\n-- ==================== ${file} ====================`);
      console.log(content);
    });
    return;
  }

  console.log('📋 Found migration files:');
  files.forEach((f, i) => {
    const filePath = path.join(migrationsDir, f);
    const stat = fs.statSync(filePath);
    console.log(`   ${i + 1}. ${f} (${Math.ceil(stat.size / 1024)} KB)`);
  });

  console.log('\n⚠️  IMPORTANT: Direct database execution requires the Supabase CLI or a direct');
  console.log('   PostgreSQL connection string with password.\n');
  console.log('📖 To apply these migrations manually:\n');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project: whmdzurofhazfptlndie');
  console.log('   3. Click on "SQL Editor" in the left sidebar');
  console.log('   4. Run the following files IN ORDER:\n');
  files.forEach((f, i) => {
    console.log(`      ${i + 1}. supabase/migrations/${f}`);
  });

  console.log('\n💡 TIP: Run with --print flag to output all SQL:');
  console.log('   node scripts/migrate.js --print\n');
  console.log('   Or copy and paste the output into the Supabase SQL Editor.\n');

  // Also write a combined SQL file for convenience
  const combinedPath = path.join(__dirname, '..', 'supabase', 'full_migration.sql');
  let combined = '-- GMG Cobranzas: Full Migration Script\n';
  combined += '-- Generated: ' + new Date().toISOString() + '\n';
  combined += '-- Run this in your Supabase SQL Editor\n\n';
  files.forEach(file => {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    combined += `\n-- ==================== ${file} ====================\n`;
    combined += content + '\n';
  });
  fs.writeFileSync(combinedPath, combined, 'utf8');
  console.log(`✅ Combined migration file written to: supabase/full_migration.sql`);
  console.log('   You can open this file and paste its contents into the Supabase SQL Editor.\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
