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

function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function getPastDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const agenteId = '7f064878-4ba8-44db-a725-0f056b297b09';

  console.log('🧹 Limpiando tablas previas...');
  // Limpiar usando la API de Supabase
  await supabase.from('gestiones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('campanas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ Tablas limpias.');

  console.log('📅 Insertando campañas mensuales...');
  const campanas = [
    { id: 'a1b2c3d4-0001-4000-8000-000000000001', nombre: 'Marzo 2025', mes: 3, anio: 2025, estado: 'cerrada', meta_bucket5: 50000.00, meta_bucket6: 30000.00 },
    { id: 'a1b2c3d4-0002-4000-8000-000000000002', nombre: 'Abril 2025', mes: 4, anio: 2025, estado: 'cerrada', meta_bucket5: 55000.00, meta_bucket6: 35000.00 },
    { id: 'a1b2c3d4-0003-4000-8000-000000000003', nombre: 'Mayo 2025', mes: 5, anio: 2025, estado: 'activa', meta_bucket5: 75000.00, meta_bucket6: 45000.00 }
  ];

  const { error: errorCampanas } = await supabase.from('campanas').insert(campanas);
  if (errorCampanas) {
    console.error('❌ Error al insertar campañas:', errorCampanas.message);
    process.exit(1);
  }
  console.log('✅ Campañas insertadas.');

  console.log('👤 Insertando clientes de prueba...');
  const clientes = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      id_cliente: 'CLI-98213',
      cedula: '001-120593-0042R',
      nombre: 'Álvaro Jose Mendoza',
      telefono: '+505 8899-2233',
      whatsapp: '+505 8899-2233',
      capital: 12500.00,
      saldo_dolares: 10500.00,
      dias_mora: 135,
      estado: 'PROMESA DE PAGO',
      agente_id: agenteId,
      campana_id: 'a1b2c3d4-0003-4000-8000-000000000003',
      mes_cartera: 'Mayo 2025',
      promesa_pago: true,
      fecha_promesa: getFutureDate(3),
      monto_promesa: 2000.00,
      monto_recuperado: 2000.00,
      direccion: 'De la Rotonda El Güegüense 2c. al Sur, Managua',
      correo: 'alvaro.mendoza@gmail.com',
      empresa: 'Mendoza Corp',
      observaciones: 'El cliente abonó $2,000.00 y tiene una promesa de pago activa para el saldo restante.'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      id_cliente: 'CLI-44122',
      cedula: '001-040891-0021A',
      nombre: 'María Auxiliadora Duarte',
      telefono: '+505 8744-9900',
      whatsapp: '+505 8744-9900',
      capital: 8500.00,
      saldo_dolares: 8500.00,
      dias_mora: 128,
      estado: 'NO CONTESTA',
      agente_id: agenteId,
      campana_id: 'a1b2c3d4-0003-4000-8000-000000000003',
      mes_cartera: 'Mayo 2025',
      promesa_pago: false,
      fecha_promesa: null,
      monto_promesa: 0.00,
      monto_recuperado: 0.00,
      direccion: 'Altamira D\'este, Calle principal, Casa #14, Managua',
      correo: 'maria.duarte@hotmail.com',
      empresa: 'Autos Duarte',
      observaciones: 'No contesta llamadas telefónicas ni WhatsApp. Se requiere llamada en horario vespertino.'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      id_cliente: 'CLI-77218',
      cedula: '161-221088-0001K',
      nombre: 'Carlos Alberto Rivas',
      telefono: '+505 8122-4455',
      whatsapp: '+505 8122-4455',
      capital: 25000.00,
      saldo_dolares: 15000.00,
      dias_mora: 165,
      estado: 'VOLVER A LLAMAR',
      agente_id: agenteId,
      campana_id: 'a1b2c3d4-0003-4000-8000-000000000003',
      mes_cartera: 'Mayo 2025',
      promesa_pago: false,
      fecha_promesa: null,
      monto_promesa: 0.00,
      monto_recuperado: 10000.00,
      direccion: 'Km 14 Carretera a Masaya, Res. Prado Verde, Casa #92',
      correo: 'carlos.rivas@outlook.com',
      empresa: 'Constructora Rivas',
      observaciones: 'El cliente canceló $10,000.00. Prometió negociar la cancelación del saldo la próxima semana.'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      id_cliente: 'CLI-55109',
      cedula: '002-150992-1002B',
      nombre: 'Diana Carolina López',
      telefono: '+505 7766-3344',
      whatsapp: '+505 7766-3344',
      capital: 6000.00,
      saldo_dolares: 0.00,
      dias_mora: 142,
      estado: 'SALVADA',
      agente_id: agenteId,
      campana_id: 'a1b2c3d4-0003-4000-8000-000000000003',
      mes_cartera: 'Mayo 2025',
      promesa_pago: false,
      fecha_promesa: null,
      monto_promesa: 0.00,
      monto_recuperado: 6000.00,
      direccion: 'Barrio Largaespada, Semáforos 1c. arriba, Managua',
      correo: 'diana.lopez@gmail.com',
      empresa: 'Clínica Dental López',
      observaciones: 'Crédito normalizado y salvado mediante liquidación total del capital.'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000005',
      id_cliente: 'CLI-33291',
      cedula: '081-300485-0002Y',
      nombre: 'Francisco Javier Gómez',
      telefono: '+505 8299-1122',
      whatsapp: '+505 8299-1122',
      capital: 18000.00,
      saldo_dolares: 18000.00,
      dias_mora: 172,
      estado: 'REPROGRAMADO',
      agente_id: agenteId,
      campana_id: 'a1b2c3d4-0003-4000-8000-000000000003',
      mes_cartera: 'Mayo 2025',
      promesa_pago: true,
      fecha_promesa: getFutureDate(5),
      monto_promesa: 5000.00,
      monto_recuperado: 0.00,
      direccion: 'Semáforos de Multicentro Las Américas 3c. al Este, Managua',
      correo: 'francisco.gomez@gmail.com',
      empresa: 'Comercial Gómez',
      observaciones: 'Había incumplido promesa el lunes. Negoció reprogramación de pago con abono de $5,000.00.'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000006',
      id_cliente: 'CLI-22198',
      cedula: '001-251290-0010M',
      nombre: 'Roberto Enrique Solís',
      telefono: '+505 8811-7788',
      whatsapp: '+505 8811-7788',
      capital: 35000.00,
      saldo_dolares: 35000.00,
      dias_mora: 155,
      estado: 'CLIENTE MOLESTO',
      agente_id: agenteId,
      campana_id: 'a1b2c3d4-0003-4000-8000-000000000003',
      mes_cartera: 'Mayo 2025',
      promesa_pago: false,
      fecha_promesa: null,
      monto_promesa: 0.00,
      monto_recuperado: 0.00,
      direccion: 'Reparto San Juan, Gimnasio Hércules 1c. al Lago, Managua',
      correo: 'roberto.solis@gmg.com',
      empresa: 'Logística Solís',
      observaciones: 'Cliente inconforme con los intereses moratorios. Solicita condonación parcial para pagar saldo base.'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000007',
      id_cliente: 'CLI-11882',
      cedula: '001-190695-0003W',
      nombre: 'Karla Patricia Ortiz',
      telefono: '+505 8966-2244',
      whatsapp: '+505 8966-2244',
      capital: 9200.00,
      saldo_dolares: 9200.00,
      dias_mora: 122,
      estado: 'PAGARA HOY',
      agente_id: agenteId,
      campana_id: 'a1b2c3d4-0003-4000-8000-000000000003',
      mes_cartera: 'Mayo 2025',
      promesa_pago: true,
      fecha_promesa: getFutureDate(0),
      monto_promesa: 3000.00,
      monto_recuperado: 0.00,
      direccion: 'Bello Horizonte, Rotonda 1c. al Sur, Casa #A-4',
      correo: 'karla.ortiz@gmail.com',
      empresa: 'Salón de Belleza Karla',
      observaciones: 'Confirmó por llamada matutina que realizará depósito por $3,000.00 hoy por la tarde.'
    }
  ];

  const { error: errorClientes } = await supabase.from('clientes').insert(clientes);
  if (errorClientes) {
    console.error('❌ Error al insertar clientes:', errorClientes.message);
    process.exit(1);
  }
  console.log('✅ Clientes insertados.');

  console.log('📜 Insertando historial de gestiones...');
  const gestiones = [
    {
      cliente_id: 'c0000000-0000-0000-0000-000000000001',
      agente_id: agenteId,
      comentario: 'Llamada de contacto inicial. El cliente se muestra receptivo y con intención de pago. Manifiesta problemas temporales de liquidez.',
      resultado: 'VOLVER A LLAMAR',
      fecha: getPastDate(5),
      promesa_pago: false,
      fecha_promesa: null,
      monto_promesa: 0.00,
      canal: 'llamada'
    },
    {
      cliente_id: 'c0000000-0000-0000-0000-000000000001',
      agente_id: agenteId,
      comentario: 'Envío de estados de cuenta y opciones de abono mediante chat de WhatsApp.',
      resultado: 'VOLVER A LLAMAR',
      fecha: getPastDate(4),
      promesa_pago: false,
      fecha_promesa: null,
      monto_promesa: 0.00,
      canal: 'whatsapp'
    },
    {
      cliente_id: 'c0000000-0000-0000-0000-000000000001',
      agente_id: agenteId,
      comentario: 'Se confirma depósito parcial de $2,000.00 de capital. El cliente formaliza una promesa de pago por un abono de $2,000.00 adicionales.',
      resultado: 'PROMESA DE PAGO',
      fecha: getPastDate(1),
      promesa_pago: true,
      fecha_promesa: getFutureDate(3),
      monto_promesa: 2000.00,
      canal: 'llamada'
    },
    {
      cliente_id: 'c0000000-0000-0000-0000-000000000003',
      agente_id: agenteId,
      comentario: 'Llamada telefónica. Cliente confirma abono parcial de $10,000.00 vía transferencia bancaria y solicita detener notificaciones judiciales.',
      resultado: 'VOLVER A LLAMAR',
      fecha: getPastDate(3),
      promesa_pago: false,
      fecha_promesa: null,
      monto_promesa: 0.00,
      canal: 'llamada'
    },
    {
      cliente_id: 'c0000000-0000-0000-0000-000000000004',
      agente_id: agenteId,
      comentario: 'Llamada para propuesta de descuento de liquidación total. Cliente acepta liquidar la deuda entera de $6,000.00.',
      resultado: 'PROMESA DE PAGO',
      fecha: getPastDate(6),
      promesa_pago: true,
      fecha_promesa: getPastDate(2),
      monto_promesa: 6000.00,
      canal: 'llamada'
    },
    {
      cliente_id: 'c0000000-0000-0000-0000-000000000004',
      agente_id: agenteId,
      comentario: 'Confirmación de liquidación total y emisión del finiquito de deuda. Crédito salvado con éxito.',
      resultado: 'SALVADA',
      fecha: getPastDate(2),
      promesa_pago: false,
      fecha_promesa: null,
      monto_promesa: 0.00,
      canal: 'whatsapp'
    },
    {
      cliente_id: 'c0000000-0000-0000-0000-000000000005',
      agente_id: agenteId,
      comentario: 'Se envió recordatorio de pago vía SMS automático por mora crítica en Bucket 6.',
      resultado: 'NO CONTESTA',
      fecha: getPastDate(4),
      promesa_pago: false,
      fecha_promesa: null,
      monto_promesa: 0.00,
      canal: 'sms'
    },
    {
      cliente_id: 'c0000000-0000-0000-0000-000000000005',
      agente_id: agenteId,
      comentario: 'Contacto telefónico. Se negoció una reprogramación total de pago para abono de $5,000.00.',
      resultado: 'REPROGRAMADO',
      fecha: getPastDate(1),
      promesa_pago: true,
      fecha_promesa: getFutureDate(5),
      monto_promesa: 5000.00,
      canal: 'llamada'
    },
    {
      cliente_id: 'c0000000-0000-0000-0000-000000000007',
      agente_id: agenteId,
      comentario: 'Llamada de seguimiento temprano. Cliente indica que ya tiene el dinero listo y promete depositar hoy por la tarde.',
      resultado: 'PAGARA HOY',
      fecha: getPastDate(0),
      promesa_pago: true,
      fecha_promesa: getFutureDate(0),
      monto_promesa: 3000.00,
      canal: 'llamada'
    }
  ];

  const { error: errorGestiones } = await supabase.from('gestiones').insert(gestiones);
  if (errorGestiones) {
    console.error('❌ Error al insertar gestiones:', errorGestiones.message);
    process.exit(1);
  }
  console.log('✅ Historial de gestiones insertado.');

  console.log('\n🎉 ==============================================');
  console.log('🚀 ¡BASE DE DATOS INICIALIZADA CON SEMILLA EXITOSAMENTE!');
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('❌ Error inesperado al sembrar datos:', err);
});
