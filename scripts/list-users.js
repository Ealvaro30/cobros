const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    if (line.trim().startsWith('#') || !line.trim()) return;
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
    }
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('🛰️  Obteniendo lista de usuarios de Supabase Auth...');
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Error al listar usuarios:', error.message);
  } else {
    console.log(`\n👥 Total de usuarios encontrados: ${data.users.length}`);
    data.users.forEach(u => {
      console.log(`- Email: ${u.email} | ID: ${u.id} | Creado: ${u.created_at}`);
    });
  }
}

main().catch(console.error);
