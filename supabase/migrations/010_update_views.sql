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
