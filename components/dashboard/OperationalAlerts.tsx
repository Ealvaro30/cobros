'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, BellRing, Target, Activity, Flame, PhoneCall, Handshake, Mail, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function OperationalAlerts({ clientes }: { clientes: any[] | undefined }) {
  const router = useRouter();
  
  if (!clientes) return null;

  const promesasVencidas = clientes.filter(c => c.promesa_pago && c.fecha_promesa && new Date(c.fecha_promesa) < new Date() && c.estado !== 'SALVADA');
  const sinGestion = clientes.filter(c => c.estado === 'NO CONTESTA' || !c.estado);
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

      {/* Alerta: Sin Gestión */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        onClick={() => router.push('/clientes?filtro=sin_gestion')}
        className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-colors flex items-center justify-between group"
      >
        <div>
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Sin Contacto / Abandonados
          </h3>
          <p className="text-xs text-amber-300 mt-1">Clientes perdiendo probabilidad de pago</p>
        </div>
        <div className="text-2xl font-black text-amber-500 group-hover:scale-110 transition-transform">
          {sinGestion.length}
        </div>
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
