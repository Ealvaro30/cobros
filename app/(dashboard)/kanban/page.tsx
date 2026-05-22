'use client';

import { useClientes } from '@/hooks/useClientes';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils/index';
import { Phone, MessageSquare, Target } from 'lucide-react';

const COLUMNAS = [
  { id: 'NO CONTESTA', title: 'Nuevo / No Contesta', color: 'bg-slate-500/10 border-slate-500/20 text-slate-400' },
  { id: 'VOLVER A LLAMAR', title: 'Seguimiento', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
  { id: 'PROMESA DE PAGO', title: 'Promesa / Acuerdos', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  { id: 'SALVADA', title: 'Recuperado (Éxito)', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  { id: 'NO SALVADA', title: 'Perdido / No Salvada', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
];

export default function KanbanPage() {
  const { selectedCampanaId } = useUIStore();
  const { data: clientes, isLoading } = useClientes(selectedCampanaId);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // NOTA: Para una app real de arrastrar y soltar se debe implementar la mutación a BD
  // y usar librerías como dnd-kit o react-beautiful-dnd. Para esta demostración SaaS
  // mantenemos un state local simulando un optimismo drag&drop.

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando Tablero Inteligente...</div>;
  }

  // Agrupar clientes por estado
  const clientesPorEstado = COLUMNAS.map(col => {
    let clients = clientes?.filter(c => {
      // Mapear estados complejos a columnas simples
      if (col.id === 'VOLVER A LLAMAR' && ['VOLVER A LLAMAR', 'REPROGRAMADO'].includes(c.estado)) return true;
      if (col.id === 'PROMESA DE PAGO' && ['PROMESA DE PAGO', 'PAGARA HOY', 'PAGARA SEMANA'].includes(c.estado)) return true;
      if (col.id === 'NO SALVADA' && ['NO SALVADA', 'NUMERO INCORRECTO', 'CLIENTE MOLESTO'].includes(c.estado)) return true;
      if (c.estado === col.id) return true;
      if (col.id === 'NO CONTESTA' && !c.estado) return true;
      return false;
    }) || [];
    
    // Sort by capital descending
    clients.sort((a, b) => b.capital - a.capital);

    return { ...col, clients };
  });

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Tablero Kanban Operativo</h1>
        <p className="text-sm text-muted-foreground">Flujo visual de gestión de recuperación por etapas</p>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 snap-x">
        {clientesPorEstado.map((columna, idx) => (
          <div key={columna.id} className="min-w-[320px] w-[320px] flex flex-col bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden snap-start">
            <div className={`p-4 border-b flex items-center justify-between ${columna.color}`}>
              <h3 className="font-bold text-sm uppercase tracking-wider">{columna.title}</h3>
              <span className="px-2 py-0.5 rounded-full bg-black/20 text-xs font-black">{columna.clients.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              {columna.clients.map(c => (
                <motion.div
                  key={c.id}
                  layoutId={c.id}
                  draggable
                  onDragStart={() => setDraggedId(c.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`p-4 rounded-xl border border-white/10 bg-slate-800 shadow-md cursor-grab active:cursor-grabbing hover:border-white/30 transition-colors ${
                    draggedId === c.id ? 'opacity-50 scale-95' : 'opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-white text-sm leading-tight pr-2">{c.nombre}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white/10 rounded text-slate-300 shrink-0">
                      B{c.bucket}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-4">
                    <p className="text-xs text-muted-foreground flex items-center justify-between">
                      ID: <span className="font-mono text-slate-300">{c.id_cliente || 'N/A'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-between">
                      Deuda: <span className="font-bold text-amber-400">{formatCurrency(c.capital)}</span>
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <div className="flex gap-1.5">
                      {c.telefono && (
                        <a href={`tel:${c.telefono}`} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {(c.whatsapp || c.telefono) && (
                        <a href={`https://wa.me/+505${(c.whatsapp || c.telefono)?.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <a href={`/clientes/${c.id}`} className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[10px] font-bold flex items-center gap-1 transition-colors">
                      <Target className="w-3 h-3" /> Abrir
                    </a>
                  </div>
                </motion.div>
              ))}
              {columna.clients.length === 0 && (
                <div className="h-full min-h-[100px] flex items-center justify-center text-xs text-slate-600 font-medium">
                  Soltar tarjetas aquí
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
