import { useState } from 'react';
import { PhoneCall, Loader2, X } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

export function CallResultModal() {
  const { pendingCallClientId, setPendingCallClientId } = useUIStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleResult = async (resultado: string, promesa_pago = false) => {
    if (!pendingCallClientId || !user) return;
    setLoading(true);
    
    try {
      // 1. Crear gestión
      await supabase.from('gestiones').insert({
        cliente_id: pendingCallClientId,
        agente_id: user.id,
        resultado,
        comentario: 'Resultado de llamada rápida',
        canal: 'llamada',
        promesa_pago,
      });

      // 2. Actualizar estado del cliente
      await supabase.from('clientes')
        .update({ estado: resultado, promesa_pago })
        .eq('id', pendingCallClientId);

    } catch (error) {
      console.error('Error saving call result', error);
    } finally {
      setLoading(false);
      setPendingCallClientId(null);
    }
  };

  const results = [
    { label: 'Promesa de Pago', val: 'PROMESA DE PAGO', prom: true, color: 'bg-purple-600 hover:bg-purple-500 text-white' },
    { label: 'Seguimiento', val: 'REPROGRAMADO', prom: false, color: 'bg-orange-600 hover:bg-orange-500 text-white' },
    { label: 'No Respondió', val: 'NO CONTESTA', prom: false, color: 'bg-slate-700 hover:bg-slate-600 text-white' },
    { label: 'Volver a Llamar', val: 'VOLVER A LLAMAR', prom: false, color: 'bg-blue-600 hover:bg-blue-500 text-white' },
    { label: 'Cliente Molesto', val: 'CLIENTE MOLESTO', prom: false, color: 'bg-red-600 hover:bg-red-500 text-white' },
    { label: 'Pago Realizado', val: 'SALVADA', prom: false, color: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
    { label: 'Número Incorrecto', val: 'NUMERO INCORRECTO', prom: false, color: 'bg-gray-600 hover:bg-gray-500 text-white' },
  ];

  const isOpen = !!pendingCallClientId;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[500px] border border-blue-500/20 bg-slate-950 p-6 rounded-2xl shadow-2xl relative overflow-hidden"
          >
            {/* Top Close Button */}
            <button
              onClick={() => setPendingCallClientId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">¿Cuál fue el resultado de la llamada?</h3>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Registra rápidamente el estado de la llamada que acabas de realizar. Esto actualizará las métricas operativas y el estado del cliente automáticamente.
            </p>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {results.map((r) => (
                  <button
                    key={r.val}
                    onClick={() => handleResult(r.val, r.prom)}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-all text-sm flex items-center justify-center text-center shadow-lg active:scale-[0.98] ${r.color || 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end border-t border-white/5 pt-4">
              <button
                onClick={() => setPendingCallClientId(null)}
                className="px-5 py-2 text-sm font-semibold rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
