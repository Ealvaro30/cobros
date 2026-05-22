const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: No se encontró el archivo .env.local.');
    process.exit(1);
  }
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
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const email = 'ae9392ni@gmg.com';
  const password = 'AE9392NI123!';
  const fullName = 'Agente AE9392NI';
  const code = 'AE9392NI';

  console.log(`🛰️ Buscando o creando agente ${code} (${email})...`);

  // 1. Verificar si el usuario ya existe en Auth
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Error al listar usuarios:', listError.message);
    process.exit(1);
  }

  let existingUser = usersData.users.find(u => u.email === email);
  let userId = "";

  if (existingUser) {
    console.log(`💡 El usuario ${email} ya existe en Supabase Auth.`);
    userId = existingUser.id;
  } else {
    // Crear el usuario
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'AGENTE'
      }
    });

    if (createError) {
      console.error('❌ Error al crear usuario en Auth:', createError.message);
      process.exit(1);
    }

    userId = createData.user.id;
    console.log(`✅ Usuario creado en Auth con ID: ${userId}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Esperar trigger
  }

  // 2. Insertar o actualizar perfil en Postgres
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      role: 'AGENTE',
      codigo: code,
      is_active: true,
      disponibilidad: true
    });

  if (profileError) {
    console.error('❌ Error al crear/actualizar el perfil en Postgres:', profileError.message);
    process.exit(1);
  }

  console.log(`✨ ¡Agente ${code} registrado y activado con éxito en public.profiles!`);
  console.log('\n🎉 ==============================================');
  console.log('🚀 ¡USUARIO GESTOR REGISTRADO EXITOSAMENTE!');
  console.log('==================================================');
  console.log(`📧 Correo:     ${email}`);
  console.log(`🔑 Contraseña: ${password}`);
  console.log(`🏷️ Código:     ${code}`);
  console.log(`👑 Rol:        AGENTE`);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('❌ Error inesperado:', err);
});
