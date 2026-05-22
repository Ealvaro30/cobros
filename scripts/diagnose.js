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

  console.log('🔍 Iniciando diagnóstico de la base de datos...');

  // 1. Verificar si la tabla profiles existe
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (profilesError) {
    console.error('❌ Error al consultar la tabla profiles:', profilesError.message);
    if (profilesError.message.includes('does not exist')) {
      console.log('\n🚨 IMPORTANTE: La tabla "profiles" NO existe en tu base de datos.');
      console.log('👉 Esto significa que NO has ejecutado las migraciones SQL en el editor SQL de Supabase.');
      console.log('👉 Para solucionar esto, por favor copia y ejecuta el contenido de los siguientes archivos en tu SQL Editor de Supabase (en este orden):');
      console.log('   1. supabase/migrations/001_schema.sql');
      console.log('   2. supabase/migrations/002_rls.sql');
      console.log('   3. supabase/migrations/003_functions.sql');
      console.log('   4. supabase/migrations/004_views.sql');
      console.log('   5. supabase/seeds/001_seed.sql');
    }
  } else {
    console.log('✅ La tabla "profiles" existe correctamente.');
  }

  // 2. Verificar campañas
  const { data: campanas, error: campanasError } = await supabase
    .from('campanas')
    .select('id')
    .limit(1);

  if (campanasError) {
    console.error('❌ Error al consultar la tabla campanas:', campanasError.message);
  } else {
    console.log('✅ La tabla "campanas" existe correctamente.');
  }
}

main().catch(console.error);
