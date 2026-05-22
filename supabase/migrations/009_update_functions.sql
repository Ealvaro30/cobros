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
