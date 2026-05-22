-- ====================================================
-- GMG Cobranzas — Semilla de Datos de Producción (Seed)
-- ====================================================

-- 1. Limpieza de datos previos (evitar conflictos de clave única)
TRUNCATE TABLE gestiones CASCADE;
TRUNCATE TABLE clientes CASCADE;
TRUNCATE TABLE campanas CASCADE;

-- 2. Insertar Campañas Mensuales (Históricas y Activa)
INSERT INTO campanas (id, nombre, mes, anio, estado, meta_bucket5, meta_bucket6) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Marzo 2025', 3, 2025, 'cerrada', 50000.00, 30000.00),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Abril 2025', 4, 2025, 'cerrada', 55000.00, 35000.00),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Mayo 2025', 5, 2025, 'activa', 75000.00, 45000.00);

-- 3. Insertar Clientes en la Campaña Activa (Mayo 2025)
-- Asignados al Agente Principal (ID: 7f064878-4ba8-44db-a725-0f056b297b09)
INSERT INTO clientes (
  id, id_cliente, cedula, nombre, telefono, whatsapp, capital, saldo_dolares, 
  dias_mora, estado, agente_id, campana_id, mes_cartera, promesa_pago, 
  fecha_promesa, monto_promesa, monto_recuperado, direccion, correo, empresa, observaciones
) VALUES
  -- CLIENTE 1: Promesa de Pago Activa (Bucket 5)
  (
    'c0000000-0000-0000-0000-000000000001', 'CLI-98213', '001-120593-0042R', 
    'Álvaro Jose Mendoza', '+505 8899-2233', '+505 8899-2233', 12500.00, 10500.00, 
    135, 'PROMESA DE PAGO', '7f064878-4ba8-44db-a725-0f056b297b09', 'a1b2c3d4-0003-4000-8000-000000000003',
    'Mayo 2025', true, CURRENT_DATE + INTERVAL '3 days', 2000.00, 2000.00,
    'De la Rotonda El Güegüense 2c. al Sur, Managua', 'alvaro.mendoza@gmail.com', 'Mendoza Corp',
    'El cliente abonó $2,000.00 y tiene una promesa de pago activa para el saldo restante.'
  ),

  -- CLIENTE 2: Moroso Sin Gestión (Bucket 5)
  (
    'c0000000-0000-0000-0000-000000000002', 'CLI-44122', '001-040891-0021A', 
    'María Auxiliadora Duarte', '+505 8744-9900', '+505 8744-9900', 8500.00, 8500.00, 
    128, 'NO CONTESTA', '7f064878-4ba8-44db-a725-0f056b297b09', 'a1b2c3d4-0003-4000-8000-000000000003',
    'Mayo 2025', false, NULL, 0.00, 0.00,
    'Altamira D\'este, Calle principal, Casa #14, Managua', 'maria.duarte@hotmail.com', 'Autos Duarte',
    'No contesta llamadas telefónicas ni WhatsApp. Se requiere llamada en horario vespertino.'
  ),

  -- CLIENTE 3: Cliente Recuperado Parcialmente (Bucket 6)
  (
    'c0000000-0000-0000-0000-000000000003', 'CLI-77218', '161-221088-0001K', 
    'Carlos Alberto Rivas', '+505 8122-4455', '+505 8122-4455', 25000.00, 15000.00, 
    165, 'VOLVER A LLAMAR', '7f064878-4ba8-44db-a725-0f056b297b09', 'a1b2c3d4-0003-4000-8000-000000000003',
    'Mayo 2025', false, NULL, 0.00, 10000.00,
    'Km 14 Carretera a Masaya, Res. Prado Verde, Casa #92', 'carlos.rivas@outlook.com', 'Constructora Rivas',
    'El cliente canceló $10,000.00. Prometió negociar la cancelación del saldo la próxima semana.'
  ),

  -- CLIENTE 4: Cliente Salvado (Recuperación Exitosa - Bucket 5)
  (
    'c0000000-0000-0000-0000-000000000004', 'CLI-55109', '002-150992-1002B', 
    'Diana Carolina López', '+505 7766-3344', '+505 7766-3344', 6000.00, 0.00, 
    142, 'SALVADA', '7f064878-4ba8-44db-a725-0f056b297b09', 'a1b2c3d4-0003-4000-8000-000000000003',
    'Mayo 2025', false, NULL, 0.00, 6000.00,
    'Barrio Largaespada, Semáforos 1c. arriba, Managua', 'diana.lopez@gmail.com', 'Clínica Dental López',
    'Crédito normalizado y salvado mediante liquidación total del capital.'
  ),

  -- CLIENTE 5: Promesa Incumplida / Reprogramado (Bucket 6)
  (
    'c0000000-0000-0000-0000-000000000005', 'CLI-33291', '081-300485-0002Y', 
    'Francisco Javier Gómez', '+505 8299-1122', '+505 8299-1122', 18000.00, 18000.00, 
    172, 'REPROGRAMADO', '7f064878-4ba8-44db-a725-0f056b297b09', 'a1b2c3d4-0003-4000-8000-000000000003',
    'Mayo 2025', true, CURRENT_DATE + INTERVAL '5 days', 5000.00, 0.00,
    'Multicentro Las Américas 3c. al Este, Managua', 'francisco.gomez@gmail.com', 'Comercial Gómez',
    'Había incumplido promesa el lunes. Negoció reprogramación de pago con abono de $5,000.00.'
  ),

  -- CLIENTE 6: Cliente Molesto / En Negociación (Bucket 6)
  (
    'c0000000-0000-0000-0000-000000000006', 'CLI-22198', '001-251290-0010M', 
    'Roberto Enrique Solís', '+505 8811-7788', '+505 8811-7788', 35000.00, 35000.00, 
    155, 'CLIENTE MOLESTO', '7f064878-4ba8-44db-a725-0f056b297b09', 'a1b2c3d4-0003-4000-8000-000000000003',
    'Mayo 2025', false, NULL, 0.00, 0.00,
    'Reparto San Juan, Gimnasio Hércules 1c. al Lago, Managua', 'roberto.solis@gmg.com', 'Logística Solís',
    'Cliente inconforme con los intereses moratorios. Solicita condonación parcial para pagar saldo base.'
  ),

  -- CLIENTE 7: Pagará Hoy (Bucket 5)
  (
    'c0000000-0000-0000-0000-000000000007', 'CLI-11882', '001-190695-0003W', 
    'Karla Patricia Ortiz', '+505 8966-2244', '+505 8966-2244', 9200.00, 9200.00, 
    122, 'PAGARA HOY', '7f064878-4ba8-44db-a725-0f056b297b09', 'a1b2c3d4-0003-4000-8000-000000000003',
    'Mayo 2025', true, CURRENT_DATE, 3000.00, 0.00,
    'Bello Horizonte, Rotonda 1c. al Sur, Casa #A-4', 'karla.ortiz@gmail.com', 'Salón de Belleza Karla',
    'Confirmó por llamada matutina que realizará depósito en ventanilla bancaria por $3,000.00 hoy por la tarde.'
  );

-- 4. Insertar Historial de Gestiones (CRM Timeline)
INSERT INTO gestiones (cliente_id, agente_id, comentario, resultado, fecha, promesa_pago, fecha_promesa, monto_promesa, canal) VALUES
  -- Gestiones del Cliente 1 (Álvaro Mendoza)
  (
    'c0000000-0000-0000-0000-000000000001', '7f064878-4ba8-44db-a725-0f056b297b09',
    'Llamada de contacto inicial. El cliente se muestra receptivo y con intención de pago. Manifiesta problemas temporales de liquidez.',
    'VOLVER A LLAMAR', CURRENT_DATE - INTERVAL '5 days', false, NULL, 0.00, 'llamada'
  ),
  (
    'c0000000-0000-0000-0000-000000000001', '7f064878-4ba8-44db-a725-0f056b297b09',
    'Envío de estados de cuenta y opciones de abono mediante chat de WhatsApp.',
    'VOLVER A LLAMAR', CURRENT_DATE - INTERVAL '4 days', false, NULL, 0.00, 'whatsapp'
  ),
  (
    'c0000000-0000-0000-0000-000000000001', '7f064878-4ba8-44db-a725-0f056b297b09',
    'Se confirma depósito parcial de $2,000.00 de capital. El cliente formaliza una promesa de pago por un abono de $2,000.00 adicionales.',
    'PROMESA DE PAGO', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE + INTERVAL '3 days', 2000.00, 'llamada'
  ),

  -- Gestiones del Cliente 3 (Carlos Rivas)
  (
    'c0000000-0000-0000-0000-000000000003', '7f064878-4ba8-44db-a725-0f056b297b09',
    'Llamada telefónica. Cliente confirma abono parcial de $10,000.00 vía transferencia bancaria y solicita detener notificaciones judiciales.',
    'VOLVER A LLAMAR', CURRENT_DATE - INTERVAL '3 days', false, NULL, 0.00, 'llamada'
  ),

  -- Gestiones del Cliente 4 (Diana López)
  (
    'c0000000-0000-0000-0000-000000000004', '7f064878-4ba8-44db-a725-0f056b297b09',
    'Llamada para propuesta de descuento de liquidación total. Cliente acepta liquidar la deuda entera de $6,000.00.',
    'PROMESA DE PAGO', CURRENT_DATE - INTERVAL '6 days', true, CURRENT_DATE - INTERVAL '2 days', 6000.00, 'llamada'
  ),
  (
    'c0000000-0000-0000-0000-000000000004', '7f064878-4ba8-44db-a725-0f056b297b09',
    'Confirmación de liquidación total y emisión del finiquito de deuda. Crédito salvado con éxito.',
    'SALVADA', CURRENT_DATE - INTERVAL '2 days', false, NULL, 0.00, 'whatsapp'
  ),

  -- Gestiones del Cliente 5 (Francisco Gómez)
  (
    'c0000000-0000-0000-0000-000000000005', '7f064878-4ba8-44db-a725-0f056b297b09',
    'Se envió recordatorio de pago vía SMS automático por mora crítica en Bucket 6.',
    'NO CONTESTA', CURRENT_DATE - INTERVAL '4 days', false, NULL, 0.00, 'sms'
  ),
  (
    'c0000000-0000-0000-0000-000000000005', '7f064878-4ba8-44db-a725-0f056b297b09',
    'Contacto telefónico. Se negoció una reprogramación total de pago para abono de $5,000.00.',
    'REPROGRAMADO', CURRENT_DATE - INTERVAL '1 day', true, CURRENT_DATE + INTERVAL '5 days', 5000.00, 'llamada'
  ),

  -- Gestiones del Cliente 7 (Karla Ortiz)
  (
    'c0000000-0000-0000-0000-000000000007', '7f064878-4ba8-44db-a725-0f056b297b09',
    'Llamada de seguimiento temprano. Cliente indica que ya tiene el dinero listo y promete depositar hoy por la tarde.',
    'PAGARA HOY', CURRENT_DATE, true, CURRENT_DATE, 3000.00, 'llamada'
  );

-- 5. Insertar registros iniciales en Logs de Auditoría para simulación
INSERT INTO audit_log (tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos) VALUES
  (
    'clientes', 'c0000000-0000-0000-0000-000000000001', 'UPDATE', '7f064878-4ba8-44db-a725-0f056b297b09',
    '{"estado": "NO CONTESTA", "saldo_dolares": 12500.00}'::jsonb,
    '{"estado": "PROMESA DE PAGO", "saldo_dolares": 10500.00, "monto_recuperado": 2000.00}'::jsonb
  ),
  (
    'clientes', 'c0000000-0000-0000-0000-000000000004', 'UPDATE', '7f064878-4ba8-44db-a725-0f056b297b09',
    '{"estado": "PROMESA DE PAGO", "saldo_dolares": 6000.00}'::jsonb,
    '{"estado": "SALVADA", "saldo_dolares": 0.00, "monto_recuperado": 6000.00}'::jsonb
  );
