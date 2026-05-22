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
