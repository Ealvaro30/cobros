-- GMG Cobranzas: Full Migration Script
-- Generated: 2026-06-02T01:45:19.778Z
-- Run this in your Supabase SQL Editor


-- ==================== 001_schema.sql ====================
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
  monto_salvado NUMERIC(15,2) DEFAULT 0,
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


-- ==================== 002_rls.sql ====================
-- ============================================
-- GMG Cobranzas — Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: get current user role
-- ============================================

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- ============================================
-- PROFILES policies
-- ============================================

CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid() OR public.user_role() = 'ADMIN');

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (public.user_role() = 'ADMIN');

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (public.user_role() = 'ADMIN');

-- ============================================
-- CAMPANAS policies
-- ============================================

CREATE POLICY "campanas_select_all" ON campanas
  FOR SELECT USING (true);

CREATE POLICY "campanas_insert_admin_sup" ON campanas
  FOR INSERT WITH CHECK (public.user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "campanas_update_admin_sup" ON campanas
  FOR UPDATE USING (public.user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "campanas_delete_admin" ON campanas
  FOR DELETE USING (public.user_role() = 'ADMIN');

-- ============================================
-- CLIENTES policies
-- ============================================

-- Todos pueden ver: ADMIN y SUPERVISOR ven todos, AGENTE solo los asignados
CREATE POLICY "clientes_select" ON clientes
  FOR SELECT USING (
    public.user_role() IN ('ADMIN', 'SUPERVISOR')
    OR agente_id = auth.uid()
  );

CREATE POLICY "clientes_insert_admin_sup" ON clientes
  FOR INSERT WITH CHECK (public.user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "clientes_update" ON clientes
  FOR UPDATE USING (
    public.user_role() IN ('ADMIN', 'SUPERVISOR')
    OR agente_id = auth.uid()
  );

CREATE POLICY "clientes_delete_admin" ON clientes
  FOR DELETE USING (public.user_role() = 'ADMIN');

-- ============================================
-- GESTIONES policies
-- ============================================

CREATE POLICY "gestiones_select" ON gestiones
  FOR SELECT USING (
    public.user_role() IN ('ADMIN', 'SUPERVISOR')
    OR agente_id = auth.uid()
  );

CREATE POLICY "gestiones_insert" ON gestiones
  FOR INSERT WITH CHECK (
    public.user_role() IN ('ADMIN', 'SUPERVISOR')
    OR agente_id = auth.uid()
  );

CREATE POLICY "gestiones_update_admin" ON gestiones
  FOR UPDATE USING (public.user_role() IN ('ADMIN', 'SUPERVISOR'));

-- ============================================
-- IMPORT_LOGS policies
-- ============================================

CREATE POLICY "import_logs_select" ON import_logs
  FOR SELECT USING (public.user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "import_logs_insert" ON import_logs
  FOR INSERT WITH CHECK (public.user_role() IN ('ADMIN', 'SUPERVISOR'));

-- ============================================
-- AUDIT_LOG policies
-- ============================================

CREATE POLICY "audit_log_select_admin" ON audit_log
  FOR SELECT USING (public.user_role() = 'ADMIN');

CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (true);


-- ==================== 003_functions.sql ====================
-- ============================================
-- GMG Cobranzas — Funciones y Triggers
-- ============================================

-- ============================================
-- Trigger: updated_at automático
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_campanas_updated_at
  BEFORE UPDATE ON campanas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Trigger: crear profile al registrar usuario
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'AGENTE')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Trigger: auditoría de clientes
-- ============================================

CREATE OR REPLACE FUNCTION audit_clientes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos)
    VALUES ('clientes', OLD.id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, usuario_id, datos_anteriores)
    VALUES ('clientes', OLD.id, 'DELETE', auth.uid(), to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_audit_clientes
  AFTER UPDATE OR DELETE ON clientes
  FOR EACH ROW EXECUTE FUNCTION audit_clientes();

-- ============================================
-- Trigger: actualizar cliente al registrar gestión
-- ============================================

CREATE OR REPLACE FUNCTION after_gestion_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clientes SET
    estado = NEW.resultado,
    promesa_pago = NEW.promesa_pago,
    fecha_promesa = NEW.fecha_promesa,
    monto_promesa = COALESCE(NEW.monto_promesa, 0),
    updated_at = NOW()
  WHERE id = NEW.cliente_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_after_gestion
  AFTER INSERT ON gestiones
  FOR EACH ROW EXECUTE FUNCTION after_gestion_insert();

-- ============================================
-- Función: estadísticas del dashboard
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_campana_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_cartera', COALESCE(SUM(capital), 0),
    'total_recuperado', COALESCE(SUM(monto_recuperado), 0),
    'total_pendiente', COALESCE(SUM(capital) - SUM(monto_recuperado), 0),
    'total_promesas', COUNT(*) FILTER (WHERE promesa_pago = true),
    'monto_promesas', COALESCE(SUM(monto_promesa) FILTER (WHERE promesa_pago = true), 0),
    'pct_recuperacion', CASE
      WHEN SUM(capital) > 0 THEN ROUND((SUM(monto_recuperado) / SUM(capital)) * 100, 2)
      ELSE 0
    END,
    'clientes_gestionados', COUNT(DISTINCT c.id) FILTER (WHERE EXISTS (
      SELECT 1 FROM gestiones g WHERE g.cliente_id = c.id
    )),
    'clientes_sin_gestion', COUNT(DISTINCT c.id) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM gestiones g WHERE g.cliente_id = c.id
    )),
    'total_clientes', COUNT(*)
  ) INTO result
  FROM clientes c
  WHERE (p_campana_id IS NULL OR c.campana_id = p_campana_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Función: estadísticas por bucket
-- ============================================

CREATE OR REPLACE FUNCTION get_bucket_stats(p_campana_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'bucket5', json_build_object(
      'total_clientes', COUNT(*) FILTER (WHERE bucket = 5),
      'capital', COALESCE(SUM(capital) FILTER (WHERE bucket = 5), 0),
      'recuperado', COALESCE(SUM(monto_recuperado) FILTER (WHERE bucket = 5), 0),
      'promesas', COALESCE(SUM(monto_promesa) FILTER (WHERE bucket = 5 AND promesa_pago = true), 0),
      'proyeccion', COALESCE(SUM(monto_recuperado) FILTER (WHERE bucket = 5), 0) +
                    COALESCE(SUM(monto_promesa) FILTER (WHERE bucket = 5 AND promesa_pago = true), 0)
    ),
    'bucket6', json_build_object(
      'total_clientes', COUNT(*) FILTER (WHERE bucket = 6),
      'capital', COALESCE(SUM(capital) FILTER (WHERE bucket = 6), 0),
      'recuperado', COALESCE(SUM(monto_recuperado) FILTER (WHERE bucket = 6), 0),
      'promesas', COALESCE(SUM(monto_promesa) FILTER (WHERE bucket = 6 AND promesa_pago = true), 0),
      'proyeccion', COALESCE(SUM(monto_recuperado) FILTER (WHERE bucket = 6), 0) +
                    COALESCE(SUM(monto_promesa) FILTER (WHERE bucket = 6 AND promesa_pago = true), 0)
    )
  ) INTO result
  FROM clientes
  WHERE (p_campana_id IS NULL OR campana_id = p_campana_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Función: KPIs de agentes
-- ============================================

CREATE OR REPLACE FUNCTION get_agent_kpis(p_campana_id UUID DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(agent_stats)
    FROM (
      SELECT
        p.id,
        p.full_name,
        COUNT(DISTINCT g.id) AS total_gestiones,
        COUNT(DISTINCT g.cliente_id) AS clientes_gestionados,
        COALESCE(SUM(c.monto_recuperado), 0) AS recuperado,
        COUNT(*) FILTER (WHERE c.estado = 'SALVADA') AS salvadas,
        COUNT(*) FILTER (WHERE c.promesa_pago = true) AS promesas_activas,
        COUNT(*) FILTER (WHERE c.promesa_pago = true AND c.estado = 'SALVADA') AS promesas_cumplidas,
        COUNT(*) FILTER (WHERE c.promesa_pago = true AND c.estado != 'SALVADA') AS promesas_incumplidas,
        CASE
          WHEN COUNT(DISTINCT c.id) > 0 THEN
            ROUND((COUNT(*) FILTER (WHERE c.estado = 'SALVADA')::NUMERIC / COUNT(DISTINCT c.id)) * 100, 2)
          ELSE 0
        END AS efectividad
      FROM profiles p
      LEFT JOIN clientes c ON c.agente_id = p.id AND (p_campana_id IS NULL OR c.campana_id = p_campana_id)
      LEFT JOIN gestiones g ON g.agente_id = p.id
      WHERE p.role = 'AGENTE' AND p.is_active = true
      GROUP BY p.id, p.full_name
      ORDER BY recuperado DESC
    ) agent_stats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================== 004_views.sql ====================
-- ====================================================
-- GMG Cobranzas — Vistas Analíticas e Históricas (Views)
-- ====================================================

-- 1. Vista: v_bucket_analytics (KPIs de buckets por campaña)
-- Formula implementada:
--   Proyección = Actual + Promesas
--   Falta = Meta - Actual
--   Cumplimiento % = (Actual / Meta) * 100
CREATE OR REPLACE VIEW public.v_bucket_analytics AS
SELECT
  c.id AS campana_id,
  c.nombre AS campana_nombre,
  c.estado AS campana_estado,
  c.mes AS campana_mes,
  c.anio AS campana_anio,

  -- BUCKET 5 (121 - 150 días de mora)
  COUNT(cl.id) FILTER (WHERE cl.bucket = 5) AS bucket5_total_clientes,
  COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 5), 0) AS bucket5_capital,
  COALESCE(SUM(cl.monto_recuperado) FILTER (WHERE cl.bucket = 5), 0) AS bucket5_actual,
  COALESCE(SUM(cl.monto_promesa) FILTER (WHERE cl.bucket = 5 AND cl.promesa_pago = true), 0) AS bucket5_promesas,
  COALESCE(SUM(cl.monto_recuperado) FILTER (WHERE cl.bucket = 5), 0) + 
  COALESCE(SUM(cl.monto_promesa) FILTER (WHERE cl.bucket = 5 AND cl.promesa_pago = true), 0) AS bucket5_proyeccion,
  c.meta_bucket5 AS bucket5_meta,
  c.meta_bucket5 - COALESCE(SUM(cl.monto_recuperado) FILTER (WHERE cl.bucket = 5), 0) AS bucket5_falta,
  CASE
    WHEN c.meta_bucket5 > 0 THEN 
      ROUND((COALESCE(SUM(cl.monto_recuperado) FILTER (WHERE cl.bucket = 5), 0) / c.meta_bucket5) * 100, 2)
    ELSE 0.00
  END AS bucket5_cumplimiento,

  -- BUCKET 6 (151 - 180 días de mora)
  COUNT(cl.id) FILTER (WHERE cl.bucket = 6) AS bucket6_total_clientes,
  COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 6), 0) AS bucket6_capital,
  COALESCE(SUM(cl.monto_recuperado) FILTER (WHERE cl.bucket = 6), 0) AS bucket6_actual,
  COALESCE(SUM(cl.monto_promesa) FILTER (WHERE cl.bucket = 6 AND cl.promesa_pago = true), 0) AS bucket6_promesas,
  COALESCE(SUM(cl.monto_recuperado) FILTER (WHERE cl.bucket = 6), 0) + 
  COALESCE(SUM(cl.monto_promesa) FILTER (WHERE cl.bucket = 6 AND cl.promesa_pago = true), 0) AS bucket6_proyeccion,
  c.meta_bucket6 AS bucket6_meta,
  c.meta_bucket6 - COALESCE(SUM(cl.monto_recuperado) FILTER (WHERE cl.bucket = 6), 0) AS bucket6_falta,
  CASE
    WHEN c.meta_bucket6 > 0 THEN 
      ROUND((COALESCE(SUM(cl.monto_recuperado) FILTER (WHERE cl.bucket = 6), 0) / c.meta_bucket6) * 100, 2)
    ELSE 0.00
  END AS bucket6_cumplimiento
FROM public.campanas c
LEFT JOIN public.clientes cl ON cl.campana_id = c.id
GROUP BY c.id, c.nombre, c.estado, c.mes, c.anio, c.meta_bucket5, c.meta_bucket6;

-- 2. Vista: v_gestiones_timeline (Timeline unificado tipo CRM Enterprise)
CREATE OR REPLACE VIEW public.v_gestiones_timeline AS
SELECT
  g.id AS gestion_id,
  g.cliente_id,
  cl.nombre AS cliente_nombre,
  cl.cedula AS cliente_cedula,
  cl.bucket AS cliente_bucket,
  g.agente_id,
  p.full_name AS agente_nombre,
  g.comentario,
  g.resultado,
  g.fecha,
  g.hora,
  g.canal,
  g.promesa_pago,
  g.fecha_promesa,
  g.monto_promesa,
  g.created_at
FROM public.gestiones g
JOIN public.clientes cl ON cl.id = g.cliente_id
JOIN public.profiles p ON p.id = g.agente_id;

-- 3. Vista: v_leaderboard_agentes (Ranking y performance en tiempo real)
CREATE OR REPLACE VIEW public.v_leaderboard_agentes AS
SELECT
  p.id AS agente_id,
  p.full_name AS agente_nombre,
  p.avatar_url,
  COUNT(DISTINCT cl.id) AS total_asignados,
  COUNT(DISTINCT g.id) AS total_gestiones,
  COALESCE(SUM(cl.monto_recuperado), 0) AS monto_recuperado,
  COUNT(*) FILTER (WHERE cl.estado = 'SALVADA') AS total_salvadas,
  COUNT(*) FILTER (WHERE cl.promesa_pago = true) AS promesas_activas,
  CASE
    WHEN COUNT(DISTINCT cl.id) > 0 THEN
      ROUND((COUNT(*) FILTER (WHERE cl.estado = 'SALVADA')::NUMERIC / COUNT(DISTINCT cl.id)) * 100, 2)
    ELSE 0.00
  END AS porcentaje_efectividad
FROM public.profiles p
LEFT JOIN public.clientes cl ON cl.agente_id = p.id
LEFT JOIN public.gestiones g ON g.agente_id = p.id
WHERE p.role = 'AGENTE' AND p.is_active = true
GROUP BY p.id, p.full_name, p.avatar_url;


-- ==================== 005_calendar_view.sql ====================
-- ====================================================
-- GMG Cobranzas — Vista de Agenda Unificada (Calendar)
-- ====================================================

CREATE OR REPLACE VIEW public.v_promesas_proximas AS
SELECT
  cl.id,
  cl.nombre,
  cl.cedula,
  cl.telefono,
  cl.whatsapp,
  cl.fecha_promesa,
  cl.monto_promesa,
  cl.estado,
  cl.bucket,
  p.full_name AS agente_nombre,
  cl.agente_id
FROM public.clientes cl
LEFT JOIN public.profiles p ON p.id = cl.agente_id
WHERE cl.fecha_promesa IS NOT NULL 
  AND (cl.promesa_pago = true OR cl.estado IN ('PROMESA DE PAGO', 'REPROGRAMADO', 'VOLVER A LLAMAR', 'PAGARA HOY', 'PAGARA SEMANA'))
ORDER BY cl.fecha_promesa ASC;


-- ==================== 006_overhaul_schema.sql ====================
-- ====================================================
-- GMG Cobranzas — Migración de Overhaul e Integridad Financiera
-- ====================================================

-- 1. Desactivar vistas dependientes de clientes.bucket temporalmente
DROP VIEW IF EXISTS public.v_resumen_campana CASCADE;
DROP VIEW IF EXISTS public.v_promesas_proximas CASCADE;
DROP VIEW IF EXISTS public.v_clientes_detalle CASCADE;

-- 2. Asegurar que cedula sea UNIQUE resolviendo duplicados y fusionando gestiones previas para no perder historial
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  -- Identificar si hay duplicados antes de aplicar el cambio
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT TRIM(cedula)
    FROM public.clientes
    WHERE cedula IS NOT NULL AND TRIM(cedula) != ''
    GROUP BY TRIM(cedula)
    HAVING COUNT(*) > 1
  ) dup;

  IF dup_count > 0 THEN
    -- A. Crear tabla temporal para mapear duplicados al ID que conservaremos (el más recientemente actualizado)
    CREATE TEMP TABLE duplicate_clients_mapping AS
    WITH ranked_clients AS (
      SELECT 
        id,
        cedula,
        ROW_NUMBER() OVER(PARTITION BY TRIM(cedula) ORDER BY updated_at DESC, id DESC) AS rn,
        FIRST_VALUE(id) OVER(PARTITION BY TRIM(cedula) ORDER BY updated_at DESC, id DESC) AS keep_id
      FROM public.clientes
      WHERE cedula IS NOT NULL AND TRIM(cedula) != ''
    )
    SELECT id AS duplicate_id, keep_id
    FROM ranked_clients
    WHERE rn > 1;

    -- B. Re-asignar todas las gestiones de los clientes duplicados al cliente conservado para evitar pérdidas de historial
    UPDATE public.gestiones g
    SET cliente_id = m.keep_id
    FROM duplicate_clients_mapping m
    WHERE g.cliente_id = m.duplicate_id;

    -- C. Eliminar los registros de clientes duplicados remanentes (ahora libres de referencias de llave foránea)
    DELETE FROM public.clientes
    WHERE id IN (SELECT duplicate_id FROM duplicate_clients_mapping);

    -- D. Destruir tabla temporal
    DROP TABLE IF EXISTS duplicate_clients_mapping;
  END IF;
END $$;

-- Limpiar espacios en blanco alrededor de las cédulas existentes
UPDATE public.clientes 
SET cedula = TRIM(cedula) 
WHERE cedula IS NOT NULL;

-- Aplicar la restricción única de cédula de forma segura
ALTER TABLE public.clientes ADD CONSTRAINT uq_clientes_cedula UNIQUE (cedula);

-- 3. Crear tabla settings para parámetros globales centralizados
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar tipo de cambio oficial por defecto (36.62)
INSERT INTO public.settings (key, value, description)
VALUES ('tipo_cambio', '36.62', 'Tipo de cambio oficial (Córdobas a Dólares)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Habilitar Row Level Security (RLS) en la tabla settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_all" ON public.settings;
CREATE POLICY "settings_select_all" ON public.settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings_all_admin" ON public.settings;
CREATE POLICY "settings_all_admin" ON public.settings
  FOR ALL TO authenticated
  USING (public.user_role() = 'ADMIN')
  WITH CHECK (public.user_role() = 'ADMIN');

-- 4. Modificar la columna bucket en clientes para que sea normal (escribible)
ALTER TABLE public.clientes DROP COLUMN IF EXISTS bucket;
ALTER TABLE public.clientes ADD COLUMN bucket INTEGER CHECK (bucket IN (5, 6)) DEFAULT 5;

-- Poblar valores existentes de bucket según los días de mora históricos
UPDATE public.clientes 
SET bucket = CASE 
  WHEN dias_mora >= 151 THEN 6 
  ELSE 5 
END;

-- 5. Trigger: Saneamiento de cadenas vacías a NULL para evitar colisiones de unicidad (cedula, id_cliente)
CREATE OR REPLACE FUNCTION public.clean_empty_client_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cedula = '' THEN
    NEW.cedula := NULL;
  END IF;
  IF NEW.id_cliente = '' THEN
    NEW.id_cliente := NULL;
  END IF;
  IF NEW.telefono = '' THEN
    NEW.telefono := NULL;
  END IF;
  IF NEW.whatsapp = '' THEN
    NEW.whatsapp := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_clean_empty_client_fields
BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.clean_empty_client_fields();

-- 6. Trigger: Sincronizar automáticamente días de mora al ingresar o cambiar un bucket (para compatibilidad de backend)
CREATE OR REPLACE FUNCTION public.sync_cliente_bucket_mora()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bucket = 5 AND (NEW.dias_mora < 121 OR NEW.dias_mora > 150) THEN
    NEW.dias_mora := 135;
  ELSIF NEW.bucket = 6 AND (NEW.dias_mora < 151 OR NEW.dias_mora > 180) THEN
    NEW.dias_mora := 165;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_cliente_bucket_mora
BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.sync_cliente_bucket_mora();

-- 7. Recrear todas las vistas con soporte para el nuevo modelo de columna de bucket
CREATE OR REPLACE VIEW public.v_clientes_detalle AS
SELECT
  cl.*,
  p.full_name AS agente_nombre,
  p.email AS agente_email,
  c.nombre AS campana_nombre,
  (SELECT COUNT(*) FROM public.gestiones g WHERE g.cliente_id = cl.id) AS total_gestiones,
  (SELECT g.created_at FROM public.gestiones g WHERE g.cliente_id = cl.id ORDER BY g.created_at DESC LIMIT 1) AS ultima_gestion
FROM public.clientes cl
LEFT JOIN public.profiles p ON p.id = cl.agente_id
LEFT JOIN public.campanas c ON c.id = cl.campana_id;

CREATE OR REPLACE VIEW public.v_resumen_campana AS
SELECT
  c.id AS campana_id,
  c.nombre AS campana_nombre,
  c.mes,
  c.anio,
  c.estado AS campana_estado,
  c.meta_bucket5,
  c.meta_bucket6,
  COUNT(cl.id) AS total_clientes,
  COALESCE(SUM(cl.capital), 0) AS total_capital,
  COALESCE(SUM(cl.monto_recuperado), 0) AS total_recuperado,
  COALESCE(SUM(cl.capital) - SUM(cl.monto_recuperado), 0) AS total_pendiente,
  COUNT(cl.id) FILTER (WHERE cl.bucket = 5) AS clientes_bucket5,
  COUNT(cl.id) FILTER (WHERE cl.bucket = 6) AS clientes_bucket6,
  COUNT(cl.id) FILTER (WHERE cl.estado = 'SALVADA') AS salvadas,
  COUNT(cl.id) FILTER (WHERE cl.promesa_pago = true) AS promesas,
  CASE
    WHEN SUM(cl.capital) > 0 THEN
      ROUND((COALESCE(SUM(cl.monto_recuperado), 0) / SUM(cl.capital)) * 100, 2)
    ELSE 0.00
  END AS pct_recuperacion
FROM public.campanas c
LEFT JOIN public.clientes cl ON cl.campana_id = c.id
GROUP BY c.id, c.nombre, c.mes, c.anio, c.estado, c.meta_bucket5, c.meta_bucket6;

CREATE OR REPLACE VIEW public.v_promesas_proximas AS
SELECT
  cl.id,
  cl.nombre,
  cl.cedula,
  cl.telefono,
  cl.whatsapp,
  cl.fecha_promesa,
  cl.monto_promesa,
  cl.estado,
  cl.bucket,
  p.full_name AS agente_nombre,
  cl.agente_id
FROM public.clientes cl
LEFT JOIN public.profiles p ON p.id = cl.agente_id
WHERE cl.fecha_promesa IS NOT NULL 
  AND (cl.promesa_pago = true OR cl.estado IN ('PROMESA DE PAGO', 'REPROGRAMADO', 'VOLVER A LLAMAR', 'PAGARA HOY', 'PAGARA SEMANA'))
ORDER BY cl.fecha_promesa ASC;


-- ==================== 007_assignment_audit.sql ====================
-- ====================================================
-- GMG Cobranzas — Migración de Auditoría y Gestión de Agentes
-- ====================================================

-- 1. Agregar columnas codigo y disponibilidad a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS codigo TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disponibilidad BOOLEAN DEFAULT true;

-- Poblar códigos por defecto para usuarios existentes que no lo tengan
UPDATE public.profiles 
SET codigo = 'AGT-' || UPPER(SUBSTRING(id::text FROM 1 FOR 4)) 
WHERE codigo IS NULL;

-- 2. Crear tabla de historial de asignaciones para auditoría completa
CREATE TABLE IF NOT EXISTS public.assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  agente_anterior_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nuevo_agente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  usuario_modificador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear índices de velocidad
CREATE INDEX IF NOT EXISTS idx_assignment_history_cliente ON public.assignment_history(cliente_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_anterior ON public.assignment_history(agente_anterior_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_nuevo ON public.assignment_history(nuevo_agente_id);

-- 3. Habilitar Row Level Security (RLS) en la nueva tabla
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad RLS
DROP POLICY IF EXISTS "history_select_all" ON public.assignment_history;
CREATE POLICY "history_select_all" ON public.assignment_history
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "history_insert_auth" ON public.assignment_history;
CREATE POLICY "history_insert_auth" ON public.assignment_history
  FOR INSERT TO authenticated WITH CHECK (true);


-- ==================== 008_admin_config.sql ====================
-- 008_admin_config.sql
-- Migration for admin configurable tables and schema tweaks

-- 1. Create bucket_meta table (dynamic bucket thresholds)
CREATE TABLE IF NOT EXISTS public.bucket_meta (
  id SERIAL PRIMARY KEY,
  bucket INTEGER NOT NULL UNIQUE,
  meta NUMERIC NOT NULL
);

-- Seed default bucket metas (example values)
INSERT INTO public.bucket_meta (bucket, meta) VALUES
  (5, 0.6),
  (6, 0.8)
ON CONFLICT (bucket) DO NOTHING;

-- 2. Create commission_rates table
CREATE TABLE IF NOT EXISTS public.commission_rates (
  bucket INTEGER NOT NULL,
  level INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  PRIMARY KEY (bucket, level)
);

-- Seed example commission rates
INSERT INTO public.commission_rates (bucket, level, amount) VALUES
  (5, 1, 50),
  (5, 2, 100),
  (6, 1, 150),
  (6, 2, 300)
ON CONFLICT (bucket, level) DO NOTHING;

-- 3. Create client_states table (dynamic client statuses)
CREATE TABLE IF NOT EXISTS public.client_states (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed default client states
INSERT INTO public.client_states (name, is_active) VALUES
  ('activo', TRUE),
  ('inactivo', FALSE),
  ('en_recuperacion', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 4. Alter clientes table: remove email column, add unica_operacion boolean
ALTER TABLE public.clientes
  DROP COLUMN IF EXISTS email,
  ADD COLUMN IF NOT EXISTS unica_operacion BOOLEAN DEFAULT FALSE;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_clientes_bucket ON public.clientes(bucket);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);
CREATE INDEX IF NOT EXISTS idx_gestiones_created_at ON public.gestiones(created_at);

-- 6. Update any dependent views (example placeholder – actual view definitions should be adjusted in later migration)
-- ALTER VIEW v_clientes_detalle ...; -- To be updated according to new schema

COMMIT;


-- ==================== 009_update_functions.sql ====================
-- Migration: 009_update_functions.sql
-- Update get_dashboard_stats and get_bucket_stats according to new rules

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_campana_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_total_cartera NUMERIC;
  v_recuperado NUMERIC;
  v_total_clientes INTEGER;
  v_clientes_salvados INTEGER;
BEGIN
  -- Calcular valores base
  SELECT 
    COALESCE(SUM(capital), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE estado = 'SALVADA')
  INTO 
    v_total_cartera,
    v_total_clientes,
    v_clientes_salvados
  FROM clientes
  WHERE (p_campana_id IS NULL OR campana_id = p_campana_id);

  -- Calcular recuperado (solo SALVADA y bucket 5 o 6)
  SELECT COALESCE(SUM(capital), 0)
  INTO v_recuperado
  FROM clientes
  WHERE (p_campana_id IS NULL OR campana_id = p_campana_id)
    AND estado = 'SALVADA'
    AND bucket IN (5, 6);

  SELECT json_build_object(
    'total_cartera', v_total_cartera,
    'total_recuperado', v_recuperado,
    'total_pendiente', GREATEST(0, v_total_cartera - v_recuperado),
    'total_promesas', COUNT(*) FILTER (WHERE promesa_pago = true AND fecha_promesa >= CURRENT_DATE),
    'monto_promesas', COALESCE(SUM(monto_promesa) FILTER (WHERE promesa_pago = true AND fecha_promesa >= CURRENT_DATE), 0),
    'pct_recuperacion', CASE
      WHEN v_total_clientes > 0 THEN ROUND((v_clientes_salvados::NUMERIC / v_total_clientes) * 100, 2)
      ELSE 0
    END,
    'clientes_gestionados', COUNT(DISTINCT c.id) FILTER (WHERE EXISTS (
      SELECT 1 FROM gestiones g WHERE g.cliente_id = c.id
    )),
    'clientes_sin_gestion', COUNT(DISTINCT c.id) FILTER (WHERE c.estado = 'NO CONTESTA' OR NOT EXISTS (
      SELECT 1 FROM gestiones g WHERE g.cliente_id = c.id
    )),
    'total_clientes', v_total_clientes,
    'clientes_salvados', v_clientes_salvados,
    'promesas_vencidas', COUNT(*) FILTER (WHERE promesa_pago = true AND fecha_promesa < CURRENT_DATE AND estado != 'SALVADA')
  ) INTO result
  FROM clientes c
  WHERE (p_campana_id IS NULL OR c.campana_id = p_campana_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_bucket_stats to pull metas from bucket_meta table dynamically
CREATE OR REPLACE FUNCTION get_bucket_stats(p_campana_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  meta_b5 NUMERIC;
  meta_b6 NUMERIC;
BEGIN
  -- Obtener metas configuradas
  SELECT meta INTO meta_b5 FROM bucket_meta WHERE bucket = 5;
  SELECT meta INTO meta_b6 FROM bucket_meta WHERE bucket = 6;
  
  -- Fallback en caso de que no existan
  meta_b5 := COALESCE(meta_b5, 0.6);
  meta_b6 := COALESCE(meta_b6, 0.8);

  SELECT json_build_object(
    'bucket5', json_build_object(
      'total_clientes', COUNT(*) FILTER (WHERE bucket = 5),
      'capital', COALESCE(SUM(capital) FILTER (WHERE bucket = 5), 0),
      'recuperado', COALESCE(SUM(capital) FILTER (WHERE bucket = 5 AND estado = 'SALVADA'), 0),
      'promesas', COALESCE(SUM(monto_promesa) FILTER (WHERE bucket = 5 AND promesa_pago = true), 0),
      'proyeccion', COALESCE(SUM(capital) FILTER (WHERE bucket = 5 AND estado = 'SALVADA'), 0) +
                    COALESCE(SUM(monto_promesa) FILTER (WHERE bucket = 5 AND promesa_pago = true), 0),
      'meta', meta_b5
    ),
    'bucket6', json_build_object(
      'total_clientes', COUNT(*) FILTER (WHERE bucket = 6),
      'capital', COALESCE(SUM(capital) FILTER (WHERE bucket = 6), 0),
      'recuperado', COALESCE(SUM(capital) FILTER (WHERE bucket = 6 AND estado = 'SALVADA'), 0),
      'promesas', COALESCE(SUM(monto_promesa) FILTER (WHERE bucket = 6 AND promesa_pago = true), 0),
      'proyeccion', COALESCE(SUM(capital) FILTER (WHERE bucket = 6 AND estado = 'SALVADA'), 0) +
                    COALESCE(SUM(monto_promesa) FILTER (WHERE bucket = 6 AND promesa_pago = true), 0),
      'meta', meta_b6
    )
  ) INTO result
  FROM clientes
  WHERE (p_campana_id IS NULL OR campana_id = p_campana_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================== 010_update_views.sql ====================
-- Migration: 010_update_views.sql
-- Update v_bucket_analytics and other views for correct calculations

-- Drop the old view if we want to change its schema or logic drastically,
-- but CREATE OR REPLACE VIEW works as long as column names/types remain the same.
CREATE OR REPLACE VIEW public.v_bucket_analytics AS
SELECT
  c.id AS campana_id,
  c.nombre AS campana_nombre,
  c.estado AS campana_estado,
  c.mes AS campana_mes,
  c.anio AS campana_anio,

  -- BUCKET 5 (121 - 150 días de mora)
  COUNT(cl.id) FILTER (WHERE cl.bucket = 5) AS bucket5_total_clientes,
  COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 5), 0) AS bucket5_capital,
  COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 5 AND cl.estado = 'SALVADA'), 0) AS bucket5_actual,
  COALESCE(SUM(cl.monto_promesa) FILTER (WHERE cl.bucket = 5 AND cl.promesa_pago = true), 0) AS bucket5_promesas,
  COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 5 AND cl.estado = 'SALVADA'), 0) + 
  COALESCE(SUM(cl.monto_promesa) FILTER (WHERE cl.bucket = 5 AND cl.promesa_pago = true), 0) AS bucket5_proyeccion,
  (SELECT meta FROM bucket_meta WHERE bucket = 5 LIMIT 1) AS bucket5_meta,
  GREATEST(0, (SELECT meta FROM bucket_meta WHERE bucket = 5 LIMIT 1) - COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 5 AND cl.estado = 'SALVADA'), 0)) AS bucket5_falta,
  CASE
    WHEN (SELECT meta FROM bucket_meta WHERE bucket = 5 LIMIT 1) > 0 THEN 
      ROUND((COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 5 AND cl.estado = 'SALVADA'), 0) / (SELECT meta FROM bucket_meta WHERE bucket = 5 LIMIT 1)) * 100, 2)
    ELSE 0.00
  END AS bucket5_cumplimiento,

  -- BUCKET 6 (151 - 180 días de mora)
  COUNT(cl.id) FILTER (WHERE cl.bucket = 6) AS bucket6_total_clientes,
  COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 6), 0) AS bucket6_capital,
  COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 6 AND cl.estado = 'SALVADA'), 0) AS bucket6_actual,
  COALESCE(SUM(cl.monto_promesa) FILTER (WHERE cl.bucket = 6 AND cl.promesa_pago = true), 0) AS bucket6_promesas,
  COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 6 AND cl.estado = 'SALVADA'), 0) + 
  COALESCE(SUM(cl.monto_promesa) FILTER (WHERE cl.bucket = 6 AND cl.promesa_pago = true), 0) AS bucket6_proyeccion,
  (SELECT meta FROM bucket_meta WHERE bucket = 6 LIMIT 1) AS bucket6_meta,
  GREATEST(0, (SELECT meta FROM bucket_meta WHERE bucket = 6 LIMIT 1) - COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 6 AND cl.estado = 'SALVADA'), 0)) AS bucket6_falta,
  CASE
    WHEN (SELECT meta FROM bucket_meta WHERE bucket = 6 LIMIT 1) > 0 THEN 
      ROUND((COALESCE(SUM(cl.capital) FILTER (WHERE cl.bucket = 6 AND cl.estado = 'SALVADA'), 0) / (SELECT meta FROM bucket_meta WHERE bucket = 6 LIMIT 1)) * 100, 2)
    ELSE 0.00
  END AS bucket6_cumplimiento
FROM public.campanas c
LEFT JOIN public.clientes cl ON cl.campana_id = c.id
GROUP BY c.id, c.nombre, c.estado, c.mes, c.anio;

-- 3. Vista: v_leaderboard_agentes (Ranking y performance en tiempo real)
CREATE OR REPLACE VIEW public.v_leaderboard_agentes AS
SELECT
  p.id AS agente_id,
  p.full_name AS agente_nombre,
  p.avatar_url,
  COUNT(DISTINCT cl.id) AS total_asignados,
  COUNT(DISTINCT g.id) AS total_gestiones,
  COALESCE(SUM(cl.capital) FILTER (WHERE cl.estado = 'SALVADA'), 0) AS monto_recuperado,
  COUNT(*) FILTER (WHERE cl.estado = 'SALVADA') AS total_salvadas,
  COUNT(*) FILTER (WHERE cl.promesa_pago = true) AS promesas_activas,
  CASE
    WHEN COUNT(DISTINCT cl.id) > 0 THEN
      ROUND((COUNT(*) FILTER (WHERE cl.estado = 'SALVADA')::NUMERIC / COUNT(DISTINCT cl.id)) * 100, 2)
    ELSE 0.00
  END AS porcentaje_efectividad
FROM public.profiles p
LEFT JOIN public.clientes cl ON cl.agente_id = p.id
LEFT JOIN public.gestiones g ON g.agente_id = p.id
WHERE p.role = 'AGENTE' AND p.is_active = true
GROUP BY p.id, p.full_name, p.avatar_url;


-- ==================== 011_add_prioridad.sql ====================
-- Migration: 011_add_prioridad.sql
-- Add prioridad column to clientes table

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS prioridad TEXT DEFAULT 'media'
CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente'));


-- ==================== 012_whatsapp_ai_center.sql ====================
-- ====================================================
-- GMG Cobranzas — WhatsApp AI Center Schema
-- ====================================================

-- 1. Tabla global de configuración WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id SERIAL PRIMARY KEY,
  pdf_destination_number TEXT,
  bot_active BOOLEAN DEFAULT TRUE,
  cooldown_minutes INTEGER DEFAULT 30,
  daily_send_limit INTEGER DEFAULT 1000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.whatsapp_config (id, pdf_destination_number, bot_active)
VALUES (1, '00000000', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Conversaciones
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefono TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  estado TEXT DEFAULT 'ABIERTO', -- ABIERTO, CERRADO, REQUIERE_AGENTE
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_conv_telefono ON public.whatsapp_conversations(telefono);
CREATE INDEX idx_wa_conv_cliente ON public.whatsapp_conversations(cliente_id);

-- 3. Mensajes
CREATE TYPE wa_sender_type AS ENUM ('CLIENT', 'BOT', 'AGENT');

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  sender_type wa_sender_type NOT NULL,
  agente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  ai_analyzed BOOLEAN DEFAULT FALSE,
  ai_intent TEXT,
  ai_risk TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_msg_conv ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_wa_msg_timestamp ON public.whatsapp_messages(timestamp);

-- 4. Métricas y Logs de IA
CREATE TABLE IF NOT EXISTS public.ai_analysis_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  detected_promise BOOLEAN DEFAULT FALSE,
  detected_followup BOOLEAN DEFAULT FALSE,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla de envíos PDF
CREATE TABLE IF NOT EXISTS public.pdf_reports_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_to TEXT NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  error_msg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Allowing all for now since it's a backend integration, but typically we secure this)
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_config_all" ON public.whatsapp_config FOR ALL USING (true);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_conv_all" ON public.whatsapp_conversations FOR ALL USING (true);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_msg_all" ON public.whatsapp_messages FOR ALL USING (true);

ALTER TABLE public.ai_analysis_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_logs_all" ON public.ai_analysis_logs FOR ALL USING (true);

ALTER TABLE public.pdf_reports_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_logs_all" ON public.pdf_reports_log FOR ALL USING (true);


-- ==================== 013_whatsapp_reports_config.sql ====================
-- Migration 013: WhatsApp Reports Configuration

-- 1. whatsapp_config
CREATE TABLE whatsapp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_number TEXT,
    schedule_time TIME NOT NULL DEFAULT '18:00:00',
    send_excel BOOLEAN NOT NULL DEFAULT true,
    send_pdf BOOLEAN NOT NULL DEFAULT true,
    send_summary BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one row exists for config
CREATE UNIQUE INDEX whatsapp_config_single_row ON whatsapp_config ((1));

-- Insert default config
INSERT INTO whatsapp_config (schedule_time, is_active) VALUES ('18:00:00', true) ON CONFLICT DO NOTHING;

-- 2. whatsapp_report_recipients
CREATE TABLE whatsapp_report_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL,
    name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. whatsapp_logs
CREATE TABLE whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    from_number TEXT,
    to_number TEXT,
    message_type TEXT NOT NULL,
    status TEXT NOT NULL,
    error_detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Allow ADMIN and SUPERVISOR to manage config
CREATE POLICY "Admin and Supervisor can manage whatsapp_config" 
ON whatsapp_config FOR ALL 
USING (
  auth.uid() IN (SELECT id FROM perfiles WHERE rol IN ('ADMIN', 'SUPERVISOR'))
);

-- Allow service role full access (for NestJS backend)
CREATE POLICY "Service role can manage whatsapp_config" 
ON whatsapp_config FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Same for recipients
CREATE POLICY "Admin and Supervisor can manage whatsapp_report_recipients" 
ON whatsapp_report_recipients FOR ALL 
USING (
  auth.uid() IN (SELECT id FROM perfiles WHERE rol IN ('ADMIN', 'SUPERVISOR'))
);

CREATE POLICY "Service role can manage whatsapp_report_recipients" 
ON whatsapp_report_recipients FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Same for logs
CREATE POLICY "Admin and Supervisor can read whatsapp_logs" 
ON whatsapp_logs FOR SELECT 
USING (
  auth.uid() IN (SELECT id FROM perfiles WHERE rol IN ('ADMIN', 'SUPERVISOR'))
);

CREATE POLICY "Service role can manage whatsapp_logs" 
ON whatsapp_logs FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

