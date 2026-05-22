'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '@/lib/utils/index';
import { 
  ArrowLeft, Phone, MessageSquare, Calendar, CheckCircle2, 
  XCircle, Clock, AlertTriangle, ShieldCheck, Activity, Target, Flame
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getOperacionesCliente, getMontoMinimoTotal } from '@/lib/utils/operationsHelper';
import { generateRestructuringMessage, generate50PercentDiscountMessage, generateAntiBotMessage, getWhatsAppLink } from '@/lib/utils/whatsappGenerator';

const supabase = createClient();

export default function ClienteCRMPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'timeline'|'acuerdos'>('timeline');

  // Load Client Detail
  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_clientes_detalle')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Load Timeline
  const { data: gestiones } = useQuery({
    queryKey: ['gestiones', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_gestiones_timeline')
        .select('*')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // IA Strategies and Variables
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

  // Next Best Action Engine
  const getNextAction = (c: any) => {
    if(!c) return null;
    if (c.estado === 'PROMESA DE PAGO' && c.fecha_promesa && new Date(c.fecha_promesa) < new Date()) {
      return { action: 'Reclamar Promesa Vencida', icon: AlertTriangle, color: 'text-red-400 bg-red-400/10' };
    }
    if (c.estado === 'NO CONTESTA') {
      return { action: 'Enviar WhatsApp Persuasivo', icon: MessageSquare, color: 'text-emerald-400 bg-emerald-400/10' };
    }
    if (c.estado === 'SALVADA') {
      return { action: 'Cerrar Caso Exitoso', icon: CheckCircle2, color: 'text-blue-400 bg-blue-400/10' };
    }
    return { action: 'Llamar para Negociar', icon: Phone, color: 'text-amber-400 bg-amber-400/10' };
  };

  const nextAction = getNextAction(cliente);

  if (isLoading) return <div className="p-8 text-center animate-pulse">Cargando CRM...</div>;
  if (!cliente) return <div className="p-8 text-center text-red-400">Cliente no encontrado</div>;

  const ops = getOperacionesCliente(cliente.id, cliente.capital, cliente.observaciones);
  const minTotal = getMontoMinimoTotal(cliente.id, cliente.capital, cliente.observaciones);
  const waNormal = getWhatsAppLink(cliente.whatsapp || cliente.telefono, generateAntiBotMessage(cliente.nombre, cliente.capital, cliente.estado));
  const waRestructurar = getWhatsAppLink(cliente.whatsapp || cliente.telefono, generateRestructuringMessage(cliente.nombre, cliente.capital));
  const waDescuento50 = getWhatsAppLink(cliente.whatsapp || cliente.telefono, generate50PercentDiscountMessage(cliente.nombre, ops));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al tablero
      </button>

      {/* Header CRM */}
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full" />
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-black text-white">{cliente.nombre}</h1>
              <p className="text-sm text-muted-foreground font-mono">ID: {cliente.id_cliente || 'N/A'} • Cédula: {cliente.cedula || 'N/A'} • Empresa: {cliente.empresa || 'N/A'}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 ${probabilidad.color}`}>
                <probabilidad.Icon className="w-4 h-4" /> Probabilidad de Salvamento: {probabilidad.score}%
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                Bucket {cliente.bucket} ({cliente.dias_mora} días mora)
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                Estado: {cliente.estado}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-right space-y-2 bg-black/20 p-4 rounded-xl border border-white/5 min-w-[180px]">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Deuda Capital</p>
              <p className="text-3xl font-black text-amber-400">{formatCurrency(cliente.capital)}</p>
              <p className="text-xs text-cyan-400 font-semibold">≈ ${cliente.saldo_dolares.toFixed(2)} USD</p>
            </div>
            
            <div className="text-left space-y-2 bg-black/20 p-4 rounded-xl border border-white/5 min-w-[240px]">
              <p className="text-xs text-amber-500 uppercase font-bold tracking-wider">Mínimo para Salvarse</p>
              <p className="text-2xl font-black text-amber-400">{formatCurrency(minTotal)}</p>
              <div className="space-y-1 mt-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Operaciones ({ops.length}):</p>
                {ops.map((op) => (
                  <div key={op.codigo} className="flex justify-between text-[10px] text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    <span>{op.codigo}</span>
                    <span className="font-bold text-amber-400">{formatCurrency(op.montoMinimo)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap items-center gap-3">
          <a href={`tel:${cliente.telefono}`} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-colors">
            <Phone className="w-4 h-4" /> Llamar al Cliente
          </a>
          
          <div className="flex flex-wrap items-center gap-2">
            <a href={waNormal} target="_blank" rel="noreferrer" className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-glow-green">
              <MessageSquare className="w-3.5 h-3.5" /> WA Normal (Anti-Bot)
            </a>
            <a href={waRestructurar} target="_blank" rel="noreferrer" className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-glow-purple">
              <MessageSquare className="w-3.5 h-3.5" /> WA Oferta Reestructuración
            </a>
            <a href={waDescuento50} target="_blank" rel="noreferrer" className="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-glow-amber">
              <MessageSquare className="w-3.5 h-3.5" /> WA Oferta 50% Mínimo
            </a>
          </div>

          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-colors ml-auto shadow-glow-blue">
            <Calendar className="w-4 h-4" /> Agendar Gestión
          </button>
        </div>
      </div>

      {/* Siguiente Mejor Acción (Motor IA) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl border flex items-center justify-between ${nextAction?.color}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Target className="w-5 h-5 text-current" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Motor de Estrategia Sugiere:</p>
            <p className="text-lg font-black">{nextAction?.action}</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors">
          Ejecutar Acción
        </button>
      </motion.div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-white/5">
        <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-blue-500 text-blue-400' : 'border-transparent text-muted-foreground hover:text-white'}`}>Timeline Operativo</button>
        <button onClick={() => setActiveTab('acuerdos')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'acuerdos' ? 'border-blue-500 text-blue-400' : 'border-transparent text-muted-foreground hover:text-white'}`}>Simulador y Negociación</button>
      </div>

      {/* TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
          {gestiones?.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No hay gestiones registradas para este cliente.</p>
          ) : (
            gestiones?.map((g: any, i: number) => {
              const isPromesa = g.promesa_pago;
              const Icon = isPromesa ? Calendar : Phone;
              const color = isPromesa ? 'bg-purple-500' : 'bg-blue-500';
              return (
                <div key={g.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-950 ${color} text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shadow-black/50 z-10`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/5 bg-slate-900 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-white text-sm">{g.resultado}</p>
                      <time className="text-xs text-muted-foreground font-mono">{formatDate(g.fecha)} {g.hora}</time>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">{g.comentario}</p>
                    
                    {isPromesa && (
                      <div className="mt-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex justify-between items-center text-xs">
                        <span className="text-purple-300 font-bold">Compromiso: {formatCurrency(g.monto_promesa)}</span>
                        <span className="text-purple-400 font-mono">{formatDate(g.fecha_promesa)}</span>
                      </div>
                    )}
                    
                    <p className="text-[10px] text-muted-foreground mt-3 font-semibold uppercase tracking-wider">Por: {g.agente_nombre}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ACUERDOS SIMULADOR */}
      {activeTab === 'acuerdos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-white/5 bg-slate-900">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Flame className="w-5 h-5 text-amber-500" /> Simulador de Negociación</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase font-bold">Descuento Autorizado (Max 30%)</label>
                <input type="range" min="0" max="30" defaultValue="0" className="w-full mt-2" />
                <div className="flex justify-between text-xs font-bold mt-1 text-white"><span>0%</span><span>30%</span></div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-400">Nuevo Saldo a Pagar:</span>
                <span className="text-2xl font-black text-emerald-400">{formatCurrency(cliente.capital)}</span>
              </div>
              <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition-colors">Generar Acuerdo Formal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
