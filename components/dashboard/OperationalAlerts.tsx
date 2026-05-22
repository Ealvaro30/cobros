'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, BellRing, Target, Activity, Flame, PhoneCall, Handshake, Mail, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function OperationalAlerts({ clientes }: { clientes: any[] | undefined }) {
  const router = useRouter();
  
  if (!clientes) return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDiasSinSeguimiento = (c: any) => {
    if (!c.ultima_gestion) return c.dias_mora || 0;
    const ut = new Date(c.ultima_gestion);
    return Math.floor((today.getTime() - ut.getTime()) / msPerDay);
  };

  const promesasVencidas = clientes
    .filter(c => {
      if (!c.promesa_pago || !c.fecha_promesa || c.estado === 'SALVADA') return false;
      const fp = new Date(c.fecha_promesa);
      const isVencida = fp < today;
      const noSeguimiento = !c.ultima_gestion || new Date(c.ultima_gestion) < today;
      return isVencida && noSeguimiento;
    })
    .sort((a, b) => {
      const fa = new Date(a.fecha_promesa!).getTime();
      const fb = new Date(b.fecha_promesa!).getTime();
      if (fa !== fb) return fa - fb;
      if (b.capital !== a.capital) return (b.capital || 0) - (a.capital || 0);
      return getDiasSinSeguimiento(b) - getDiasSinSeguimiento(a);
    });

  const sinGestion = clientes.filter(c => {
    const hasInteraction = c.total_gestiones > 0 || !!c.ultima_gestion;
    return !hasInteraction;
  });

  const riesgoAlto = clientes.filter(c => c.bucket === 6 && (!c.promesa_pago || c.estado === 'NO SALVADA'));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Alerta: Promesas Vencidas */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        onClick={() => router.push('/clientes?filtro=vencidas')}
        className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 cursor-pointer transition-colors flex items-center justify-between group"
      >
        <div>
          <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
            <BellRing className="w-4 h-4 animate-bounce" /> Promesas Vencidas
          </h3>
          <p className="text-xs text-red-300 mt-1">Requieren acción inmediata hoy</p>
        </div>
        <div className="text-2xl font-black text-red-500 group-hover:scale-110 transition-transform">
          {promesasVencidas.length}
        </div>
      </motion.div>

      {/* Alerta: Sin Contacto / Abandonados */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        onClick={() => router.push('/clientes?filtro=sin_gestion')}
        className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-colors flex flex-col justify-between group gap-2"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Sin Contacto / Abandonados
            </h3>
            <p className="text-xs text-amber-300 mt-1">Clientes perdiendo probabilidad de pago</p>
          </div>
          <div className="text-2xl font-black text-amber-500 group-hover:scale-110 transition-transform">
            {sinGestion.length}
          </div>
        </div>
        {sinGestion.length > 0 && (
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold border border-amber-500/30">
              Prioridad Automática
            </span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold border border-red-500/30">
              Riesgo Alto
            </span>
          </div>
        )}
      </motion.div>

      {/* Inteligencia: Motor de Estrategia */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        onClick={() => router.push('/kanban')}
        className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer transition-colors flex items-center justify-between group"
      >
        <div>
          <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Foco de Recuperación (IA)
          </h3>
          <p className="text-xs text-indigo-300 mt-1">Clientes de alto valor y riesgo</p>
        </div>
        <div className="text-2xl font-black text-indigo-500 group-hover:scale-110 transition-transform">
          {riesgoAlto.length}
        </div>
      </motion.div>
    </div>
  );
}
