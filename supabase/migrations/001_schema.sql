-- ============================================
-- GMG Cobranzas — Schema Principal
-- ============================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'SUPERVISOR', 'AGENTE');

CREATE TYPE estado_cliente AS ENUM (
  'SALVADA',
  'NO SALVADA',
  'PROMESA DE PAGO',
  'REPROGRAMADO',
  'NO CONTESTA',
  'NUMERO INCORRECTO',
  'VOLVER A LLAMAR',
  'PAGARA HOY',
  'PAGARA SEMANA',
  'CLIENTE MOLESTO'
);

CREATE TYPE canal_gestion AS ENUM ('llamada', 'whatsapp', 'sms');

CREATE TYPE estado_campana AS ENUM ('activa', 'cerrada', 'planificada');

-- ============================================
-- TABLA: profiles (usuarios del sistema)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'AGENTE',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================
-- TABLA: campanas (campañas mensuales)
-- ============================================

CREATE TABLE campanas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  estado estado_campana NOT NULL DEFAULT 'planificada',
  meta_bucket5 NUMERIC(15,2) DEFAULT 0,
  meta_bucket6 NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mes, anio)
);

CREATE INDEX idx_campanas_periodo ON campanas(anio, mes);

-- ============================================
-- TABLA: clientes
-- ============================================

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_cliente TEXT,
  cedula TEXT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  whatsapp TEXT,
  capital NUMERIC(15,2) DEFAULT 0,
  saldo_dolares NUMERIC(15,2) DEFAULT 0,
  dias_mora INTEGER DEFAULT 0,
  bucket INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN dias_mora >= 151 AND dias_mora <= 180 THEN 6
      WHEN dias_mora >= 121 AND dias_mora <= 150 THEN 5
      ELSE NULL
    END
  ) STORED,
  estado estado_cliente DEFAULT 'NO CONTESTA',
  agente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  campana_id UUID REFERENCES campanas(id) ON DELETE SET NULL,
  fecha_asignacion TIMESTAMPTZ,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  mes_cartera TEXT,
  promesa_pago BOOLEAN DEFAULT false,
  fecha_promesa DATE,
  monto_promesa NUMERIC(15,2) DEFAULT 0,
  direccion TEXT,
  correo TEXT,
  empresa TEXT,
  observaciones TEXT,
  monto_recuperado NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_agente ON clientes(agente_id);
CREATE INDEX idx_clientes_campana ON clientes(campana_id);
CREATE INDEX idx_clientes_bucket ON clientes(bucket);
CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_clientes_dias_mora ON clientes(dias_mora);
CREATE INDEX idx_clientes_cedula ON clientes(cedula);
CREATE INDEX idx_clientes_id_cliente ON clientes(id_cliente);
CREATE INDEX idx_clientes_promesa ON clientes(promesa_pago, fecha_promesa);

-- ============================================
-- TABLA: gestiones
-- ============================================

CREATE TABLE gestiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  agente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comentario TEXT,
  resultado estado_cliente NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT CURRENT_TIME,
  promesa_pago BOOLEAN DEFAULT false,
  fecha_promesa DATE,
  monto_promesa NUMERIC(15,2) DEFAULT 0,
  canal canal_gestion NOT NULL DEFAULT 'llamada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gestiones_cliente ON gestiones(cliente_id);
CREATE INDEX idx_gestiones_agente ON gestiones(agente_id);
CREATE INDEX idx_gestiones_fecha ON gestiones(fecha);
CREATE INDEX idx_gestiones_resultado ON gestiones(resultado);

-- ============================================
-- TABLA: import_logs (logs de importación Excel)
-- ============================================

CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES profiles(id),
  campana_id UUID REFERENCES campanas(id),
  archivo TEXT NOT NULL,
  total_registros INTEGER DEFAULT 0,
  registros_creados INTEGER DEFAULT 0,
  registros_actualizados INTEGER DEFAULT 0,
  registros_error INTEGER DEFAULT 0,
  errores JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLA: audit_log (auditoría)
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  accion TEXT NOT NULL,
  usuario_id UUID REFERENCES profiles(id),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tabla ON audit_log(tabla);
CREATE INDEX idx_audit_registro ON audit_log(registro_id);
CREATE INDEX idx_audit_fecha ON audit_log(created_at);
