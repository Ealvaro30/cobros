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
