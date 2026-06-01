import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useWhatsAppStats() {
  return useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: async () => {
      const supabase = createClient();
      
      // Intentos de promesas (últimas 24h o global, para simplicidad global)
      const { count: countPromesas } = await supabase
        .from('ai_analysis_logs')
        .select('*', { count: 'exact', head: true })
        .eq('detected_promise', true);

      const { count: countSeguimientos } = await supabase
        .from('ai_analysis_logs')
        .select('*', { count: 'exact', head: true })
        .eq('detected_followup', true);

      // Total de mensajes analizados por la IA
      const { count: totalAnalyzed } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('ai_analyzed', true);
        
      // Riesgo alto detectado
      const { count: riskAlto } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('ai_risk', 'ALTO');

      return {
        promesasDetectadas: countPromesas || 0,
        seguimientosDetectados: countSeguimientos || 0,
        mensajesAnalizados: totalAnalyzed || 0,
        riesgoAltoDetectado: riskAlto || 0,
      };
    },
    refetchInterval: 60000, // actualiza cada minuto
  });
}
