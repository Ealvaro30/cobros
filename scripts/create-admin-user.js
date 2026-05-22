const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Cargar variables de entorno desde .env.local de forma manual
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: No se encontró el archivo .env.local en la raíz del proyecto.');
    console.log('👉 Por favor, asegúrate de que el archivo .env.local exista y esté configurado.');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    // Ignorar comentarios y líneas vacías
    if (line.trim().startsWith('#') || !line.trim()) return;
    
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remover comillas si existen
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value.trim();
    }
  });
  return env;
}

async function main() {
  const env = loadEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  // Validar credenciales
  if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT') || supabaseUrl.includes('https://xxx.')) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL no está configurado correctamente en .env.local.');
    process.exit(1);
  }

  if (!serviceRoleKey || serviceRoleKey === 'YOUR_SERVICE_ROLE_KEY') {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurado.');
    console.log('\n🔍 CÓMO OBTENER TU SERVICE ROLE KEY:');
    console.log('1. Ve al panel de control de Supabase (https://supabase.com/dashboard)');
    console.log('2. Ve a Settings (Engranaje) -> API');
    console.log('3. Busca en "Project API Keys" la fila "service_role (secret)"');
    console.log('4. Copia esa clave y pégala en tu archivo .env.local así:\n');
    console.log(`   SUPABASE_SERVICE_ROLE_KEY=tu_clave_secreta_aqui\n`);
    console.log('Una vez pegada, vuelve a ejecutar este script para crear el usuario.');
    process.exit(1);
  }

  console.log('🛰️  Conectando con Supabase Admin API...');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const email = 'alvaro@gmail.com';
  const password = '123456789*/';
  const fullName = 'Alvaro';

  console.log(`👤 Creando usuario Auth para: ${email}...`);

  // Crear usuario usando la API de Administración de Supabase Auth
  const { data, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'ADMIN'
    }
  });

  if (createError) {
    if (createError.message.includes('already registered') || createError.status === 422) {
      console.log('💡 El usuario ya se encuentra registrado en Supabase Auth.');
      console.log('🔄 Actualizando el rol de este usuario a ADMIN en la tabla de perfiles...');
      
      // Intentar buscar el usuario por email
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('❌ Error al listar usuarios:', listError.message);
        process.exit(1);
      }

      const existingUser = usersData.users.find(u => u.email === email);
      if (!existingUser) {
        console.error('❌ Error: No se pudo encontrar el ID del usuario existente.');
        process.exit(1);
      }

      // Actualizar el perfil en la tabla profiles a ADMIN
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'ADMIN', full_name: fullName })
        .eq('id', existingUser.id);

      if (profileError) {
        console.error('❌ Error al actualizar el perfil en la base de datos:', profileError.message);
        process.exit(1);
      }

      console.log(`✨ ¡Usuario ${email} actualizado con éxito a rol ADMIN!`);
    } else {
      console.error('❌ Error al crear el usuario en Supabase Auth:', createError.message);
    }
    process.exit(1);
  }

  const userId = data.user.id;
  console.log(`✅ Usuario creado en Auth con ID: ${userId}`);

  // Esperar un segundo para que el trigger de la base de datos se ejecute
  console.log('⏳ Sincronizando perfil con base de datos...');
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Asegurar que el rol sea ADMIN en la tabla profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'ADMIN' })
    .eq('id', userId);

  if (profileError) {
    console.error('⚠️ Advertencia: El perfil se creó pero falló la actualización del rol en Postgres:', profileError.message);
    console.log('👉 Ejecuta esta consulta en tu editor SQL de Supabase para solucionarlo:');
    console.log(`   UPDATE profiles SET role = 'ADMIN' WHERE id = '${userId}';`);
  } else {
    console.log('✨ ¡Perfil de la base de datos actualizado con rol ADMIN exitosamente!');
  }

  console.log('\n🎉 ==============================================');
  console.log('🚀 ¡USUARIO ADMINISTRADOR CREADO EXITOSAMENTE!');
  console.log('==================================================');
  console.log(`📧 Correo:     ${email}`);
  console.log(`🔑 Contraseña: ${password}`);
  console.log(`👑 Rol:        ADMIN`);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('❌ Error inesperado en el script:', err);
});
