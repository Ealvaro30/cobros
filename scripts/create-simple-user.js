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

  console.log('👤 Creando usuario simplificado (sin metadatos)...');
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'alvaro@gmail.com',
    password: '123456789*/',
    email_confirm: true
  });

  if (error) {
    console.error('❌ Error al crear usuario:', error.message);
  } else {
    console.log('✅ Usuario creado en Auth con ID:', data.user.id);
  }
}

main().catch(console.error);
