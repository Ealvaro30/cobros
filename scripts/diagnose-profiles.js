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
      env[match[1]] = (match[2] || '').replace(/['"]/g, '').trim();
    }
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('--- 🛡️ DIAGNÓSTICO DE BASE DE DATOS Y USUARIOS ---');

  // 1. Listar Auth Users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('❌ Error al listar usuarios Auth:', authError.message);
  } else {
    console.log(`\n👥 Usuarios registrados en Supabase Auth (${users.length}):`);
    users.forEach(u => {
      console.log(`- Email: ${u.email} | ID: ${u.id} | Metadata Rol: ${u.user_metadata?.role}`);
    });
  }

  // 2. Listar Perfiles en public.profiles
  const { data: profiles, error: dbError } = await supabase
    .from('profiles')
    .select('*');

  if (dbError) {
    console.error('❌ Error al consultar tabla public.profiles:', dbError.message);
  } else {
    console.log(`\n📋 Perfiles guardados en public.profiles (${profiles.length}):`);
    profiles.forEach(p => {
      console.log(`- Nombre: ${p.full_name} | ID: ${p.id} | Rol: ${p.role} | Activo: ${p.is_active}`);
    });
  }

  // 3. Verificar si el usuario administrador alvaro@gmail.com está sincronizado
  const alvaroAuth = users.find(u => u.email === 'alvaro@gmail.com');
  if (alvaroAuth) {
    const alvaroProfile = profiles.find(p => p.id === alvaroAuth.id);
    if (!alvaroProfile) {
      console.log('\n❌ ADVERTENCIA: El usuario de Álvaro existe en Auth pero NO existe en public.profiles.');
      console.log('👉 Sincronizando el perfil manualmente...');
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: alvaroAuth.id,
          email: alvaroAuth.email,
          full_name: 'Alvaro',
          role: 'ADMIN',
          is_active: true
        });

      if (insertError) {
        console.error('❌ Error al insertar el perfil manualmente:', insertError.message);
      } else {
        console.log('✅ ¡Perfil de Álvaro insertado con éxito en public.profiles!');
      }
    } else {
      console.log('\n✅ El perfil de Álvaro está perfectamente sincronizado en public.profiles.');
    }
  } else {
    console.log('\n❌ Álvaro no está registrado en Supabase Auth.');
  }
}

main();
