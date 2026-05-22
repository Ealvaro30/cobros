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
