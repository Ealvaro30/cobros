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
