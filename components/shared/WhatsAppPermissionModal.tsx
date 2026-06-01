import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

export function WhatsAppPermissionModal() {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    // Check if permission was already granted in this session/localstorage
    if (user && !localStorage.getItem('wa_permission_granted')) {
      // Small delay for better UX
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleGrantPermission = () => {
    localStorage.setItem('wa_permission_granted', 'true');
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-[425px] border border-emerald-500/20 bg-slate-950 p-6 rounded-2xl shadow-2xl relative overflow-hidden"
          >
            {/* Top Close Button (for convenience) */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">Autorización de Seguridad</h3>
            </div>

            <div className="text-slate-400 text-sm space-y-4 mb-6 leading-relaxed">
              <p>
                El sistema necesita permiso para analizar las conversaciones de WhatsApp del día de hoy.
              </p>
              <p>
                Esto nos permite actualizar <strong className="text-emerald-400 font-semibold">promesas, seguimientos y métricas operativas</strong> de forma automática mediante Inteligencia Artificial.
              </p>
              <p className="text-xs text-amber-500 font-semibold border-l-2 border-amber-500/40 pl-2 bg-amber-500/5 py-1.5 rounded-r">
                Nota: SOLO se analizarán las conversaciones del día actual. No se accede a histórico antiguo.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
              >
                Omitir
              </button>
              <button
                onClick={handleGrantPermission}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors text-sm shadow-lg shadow-emerald-950/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Otorgar Permiso
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
