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
