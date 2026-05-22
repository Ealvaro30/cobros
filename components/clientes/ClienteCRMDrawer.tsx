'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate } from '@/lib/utils/index';
import { 
  Phone, MessageSquare, Calendar, CheckCircle2, 
  X, AlertTriangle, ShieldCheck, Activity, Target, Flame
} from 'lucide-react';
import { useState } from 'react';
import { getOperacionesCliente, getMontoMinimoTotal } from '@/lib/utils/operationsHelper';
import { generateRestructuringMessage, generate50PercentDiscountMessage, generateAntiBotMessage, getWhatsAppLink } from '@/lib/utils/whatsappGenerator';
import { GestionForm } from '../gestiones/GestionForm';

const supabase = createClient();

interface ClienteCRMDrawerProps {
  clienteId: string;
  onClose: () => void;
}

export function ClienteCRMDrawer({ clienteId, onClose }: ClienteCRMDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'timeline' | 'acuerdos'>('timeline');
  const [showGestionForm, setShowGestionForm] = useState(false);

  // Load Client Detail
  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_clientes_detalle')
        .select('*')
        .eq('id', clienteId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Load Timeline
  const { data: gestiones } = useQuery({
    queryKey: ['gestiones', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_gestiones_timeline')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId
  });

  const getProbabilidad = (c: any) => {
    if(!c) return { score: 0, label: '', color: '', Icon: Activity };
    let score = 90;
    if (c.bucket === 6) score -= 35;
    if (c.bucket === 5) score -= 15;
    if (c.estado === 'NO CONTESTA') score -= 25;
    if (c.estado === 'PROMESA DE PAGO') score += 20;
    if (c.estado === 'NO SALVADA') score -= 40;
    if (c.dias_mora > 150) score -= 10;
    
    score = Math.max(5, Math.min(98, score));
    let label = 'Media'; let color = 'text-amber-400 bg-amber-400/10 border-amber-400/20'; let Icon = Activity;
    if (score >= 75) { label = 'Alta Probabilidad'; color = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'; Icon = ShieldCheck; } 
    else if (score < 40) { label = 'Riesgo Alto'; color = 'text-red-400 bg-red-400/10 border-red-400/20'; Icon = AlertTriangle; }
    return { score, label, color, Icon };
  };

  const probabilidad = getProbabilidad(cliente);

  const getNextAction = (c: any) => {
    if(!c) return null;
    if (c.estado === 'PROMESA DE PAGO' && c.fecha_promesa && new Date(c.fecha_promesa) < new Date()) {
      return { action: 'Reclamar Promesa Vencida', icon: AlertTriangle, color: 'text-red-400 bg-red-400/10 border-red-500/20' };
    }
    if (c.estado === 'NO CONTESTA') {
      return { action: 'Enviar WhatsApp Persuasivo', icon: MessageSquare, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20' };
    }
    if (c.estado === 'SALVADA') {
      return { action: 'Cerrar Caso Exitoso', icon: CheckCircle2, color: 'text-blue-400 bg-blue-400/10 border-blue-500/20' };
    }
    return { action: 'Llamar para Negociar', icon: Phone, color: 'text-amber-400 bg-amber-400/10 border-amber-500/20' };
  };

  const nextAction = getNextAction(cliente);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-4xl bg-slate-950 border-l border-white/10 p-8 flex items-center justify-center">
          <p className="text-white animate-pulse">Cargando CRM del Cliente...</p>
        </div>
      </div>
    );
  }

  if (!cliente) return null;

  const ops = getOperacionesCliente(cliente.id, cliente.capital, cliente.observaciones);
  const minTotal = getMontoMinimoTotal(cliente.id, cliente.capital, cliente.observaciones);
  const waNormal = getWhatsAppLink(cliente.whatsapp || cliente.telefono, generateAntiBotMessage(cliente.nombre, cliente.capital, cliente.estado));
  const waRestructurar = getWhatsAppLink(cliente.whatsapp || cliente.telefono, generateRestructuringMessage(cliente.nombre, cliente.capital));
  const waDescuento50 = getWhatsAppLink(cliente.whatsapp || cliente.telefono, generate50PercentDiscountMessage(cliente.nombre, ops));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-4xl bg-slate-950 border-l border-white/10 overflow-y-auto shadow-2xl h-full flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-slate-900 flex justify-between items-center sticky top-0 z-20">
          <div>
            <span className="text-[10px] bg-blue-500/15 text-blue-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider">CRM Express Activo</span>
            <h2 className="text-xl font-black text-white mt-1">{cliente.nombre}</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {cliente.id_cliente || '-'} • Cédula: {cliente.cedula || '-'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar-thin">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-white/5 p-4 rounded-xl">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Deuda Capital</p>
              <p className="text-2xl font-black text-white mt-1">{formatCurrency(cliente.capital)}</p>
              <p className="text-[10px] text-cyan-400 font-semibold">≈ ${cliente.saldo_dolares.toFixed(2)} USD</p>
            </div>
            
            <div className="bg-slate-900 border border-white/5 p-4 rounded-xl col-span-2 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-amber-500 uppercase font-bold tracking-wider">Mínimo para Salvarse</span>
                <span className="text-lg font-black text-amber-400">{formatCurrency(minTotal)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ops.map((op) => (
                  <span key={op.codigo} className="text-[9px] bg-black/40 border border-white/5 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <span>{op.codigo}:</span>
                    <strong className="text-amber-400 font-mono">{formatCurrency(op.montoMinimo)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-xl flex flex-wrap items-center gap-3">
            <a href={`tel:${cliente.telefono}`} className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors">
              <Phone className="w-4 h-4" /> Llamar
            </a>
            
            <div className="flex flex-wrap items-center gap-2">
              <a href={waNormal} target="_blank" rel="noreferrer" className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-glow-green">
                <MessageSquare className="w-3.5 h-3.5" /> WA Normal (Anti-Bot)
              </a>
              <a href={waRestructurar} target="_blank" rel="noreferrer" className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-glow-purple">
                <MessageSquare className="w-3.5 h-3.5" /> Oferta Reestructuración
              </a>
              <a href={waDescuento50} target="_blank" rel="noreferrer" className="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-glow-amber">
                <MessageSquare className="w-3.5 h-3.5" /> Oferta 50% Mínimo
              </a>
            </div>

            <button
              onClick={() => setShowGestionForm(!showGestionForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors ml-auto shadow-glow-blue"
            >
              <Calendar className="w-4 h-4" /> {showGestionForm ? 'Ver CRM' : '+ Nueva Gestión'}
            </button>
          </div>

          {showGestionForm ? (
            <div className="bg-slate-900 p-6 rounded-xl border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4">Registrar Nueva Gestión</h3>
              <GestionForm
                clienteId={clienteId}
                onSuccess={() => {
                  setShowGestionForm(false);
                  queryClient.invalidateQueries({ queryKey: ['gestiones', clienteId] });
                  queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
                  queryClient.invalidateQueries({ queryKey: ['clientes'] });
                }}
              />
            </div>
          ) : (
            <>
              {/* Next Best Action Engine */}
              {nextAction && (
                <div className={`p-4 rounded-xl border flex items-center justify-between ${nextAction.color}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Target className="w-5 h-5 text-current" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-85">Estrategia Sugerida:</p>
                      <p className="text-base font-black">{nextAction.action}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-current bg-white/5">
                    {probabilidad.label}
                  </span>
                </div>
              )}

              {/* TABS */}
              <div className="flex gap-4 border-b border-white/5">
                <button 
                  onClick={() => setActiveTab('timeline')} 
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-blue-500 text-blue-400' : 'border-transparent text-muted-foreground hover:text-white'}`}
                >
                  Timeline Operativo ({gestiones?.length || 0})
                </button>
                <button 
                  onClick={() => setActiveTab('acuerdos')} 
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'acuerdos' ? 'border-blue-500 text-blue-400' : 'border-transparent text-muted-foreground hover:text-white'}`}
                >
                  Simulador de Negociación
                </button>
              </div>

              {/* TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {gestiones?.length === 0 ? (
                    <p className="text-center text-muted-foreground text-xs py-8">No hay gestiones registradas para este cliente.</p>
                  ) : (
                    gestiones?.map((g: any) => {
                      const isPromesa = g.promesa_pago;
                      return (
                        <div key={g.id} className="p-4 rounded-xl border border-white/5 bg-slate-900 flex justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">{g.resultado}</span>
                              <span className="text-[9px] text-muted-foreground">{formatDate(g.fecha)} {g.hora}</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{g.comentario}</p>
                            {isPromesa && (
                              <div className="mt-2 text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 max-w-max">
                                Promesa: {formatCurrency(g.monto_promesa)} el {formatDate(g.fecha_promesa)}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider shrink-0 align-self-start mt-0.5">Por: {g.agente_nombre}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ACUERDOS SIMULADOR */}
              {activeTab === 'acuerdos' && (
                <div className="p-5 rounded-xl border border-white/5 bg-slate-900 space-y-4">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><Flame className="w-4 h-4 text-amber-500" /> Simulador de Negociación Express</h3>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Descuento Especial Autorizado (Max 30%)</label>
                    <input type="range" min="0" max="30" defaultValue="0" className="w-full mt-2 cursor-pointer" />
                    <div className="flex justify-between text-[10px] font-bold mt-1 text-white"><span>0% Descuento</span><span>30% Máximo</span></div>
                  </div>
                  <div className="p-3 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total a Liquidar con Plan Actual:</span>
                    <span className="text-base font-black text-emerald-400">{formatCurrency(cliente.capital)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
