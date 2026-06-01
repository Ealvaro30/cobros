'use client';

import { useState } from 'react';
import type { ClienteDetalle } from '@/types';
import { formatCurrency } from '@/lib/utils/index';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import {
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  DollarSign,
  Phone,
  Calendar,
  AlertCircle,
  Target,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Activity
} from 'lucide-react';

interface ClientesStatusDetailProps {
  clientes: ClienteDetalle[] | undefined;
  isLoading: boolean;
}

export function ClientesStatusDetail({ clientes, isLoading }: ClientesStatusDetailProps) {
  const [activeTab, setActiveTab] = useState<'promesas' | 'salvados' | 'nosalvados'>('promesas');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const { setPendingCallClientId } = useUIStore();

  if (isLoading) {
    return <div className="h-64 skeleton rounded-xl" />;
  }

  // Filter clients
  const promesas = clientes?.filter(c =>
    ['PROMESA DE PAGO', 'PAGARA HOY', 'PAGARA SEMANA'].includes(c.estado)
  ) || [];

  const salvados = clientes?.filter(c =>
    c.estado === 'SALVADA'
  ) || [];

  const noSalvados = clientes?.filter(c =>
    ['NO SALVADA', 'NO CONTESTA', 'NUMERO INCORRECTO', 'VOLVER A LLAMAR', 'CLIENTE MOLESTO'].includes(c.estado)
  ) || [];

  // Generate suggested WhatsApp follow-up messages based on client state and outstanding balance
  const getSugerenciaMensaje = (cliente: ClienteDetalle) => {
    const isHighValue = cliente.saldo_dolares > 1000 || cliente.capital > 35000;
    const name = cliente.nombre.split(' ')[0];
    const capitalStr = formatCurrency(cliente.capital);
    const usdStr = `${cliente.saldo_dolares.toFixed(2)}`;

    if (cliente.estado === 'PROMESA DE PAGO' || cliente.estado === 'PAGARA HOY') {
      return {
        mensaje: `Estimado/a ${name}, le recordamos de parte de GMG Servicios que su compromiso de pago por ${capitalStr} está programado para hoy. Agradecemos su puntualidad para mantener su cuenta al día. Quedamos a sus órdenes.`,
        sugerencia: 'Recordatorio cortés de promesa de pago programada para hoy.'
      };
    }

    if (isHighValue) {
      return {
        mensaje: `Estimado/a ${name}, de parte de GMG Servicios. Hemos diseñado una opción especial de descuento con cuotas adaptadas para liquidar su saldo de $${usdStr}. Nos gustaría coordinar una llamada corta hoy para presentársela. ¿A qué hora le queda mejor?`,
        sugerencia: 'Propuesta de descuento exclusivo para saldos de alto valor.'
      };
    }

    if (cliente.estado === 'VOLVER A LLAMAR' || cliente.estado === 'REPROGRAMADO') {
      return {
        mensaje: `Estimado/a ${name}, le saluda GMG Servicios. Le escribimos para dar seguimiento al contacto acordado para hoy y brindarle las mejores alternativas para normalizar su saldo. ¿Le parece bien si le llamamos en 5 minutos?`,
        sugerencia: 'Mensaje de seguimiento reactivo para reprogramación acordada.'
      };
    }

    // Default contact builder
    return {
      mensaje: `Buenos días ${name}, le saludamos de parte de GMG Servicios. El motivo del mensaje es porque queremos ayudarle a limpiar su historial crediticio con opciones de pago flexibles. ¿Podríamos conversar unos minutos hoy?`,
      sugerencia: 'Mensaje de contacto inicial amigable para negociar facilidades.'
    };
  };

  const getWhatsAppLink = (phone: string | null, text: string) => {
    if (!phone) return '#';
    const cleaned = phone.replace(/[^\d+]/g, '');
    const prefix = cleaned.startsWith('+') ? '' : '+505';
    return `https://wa.me/${prefix}${cleaned}?text=${encodeURIComponent(text)}`;
  };

  const getProbabilidad = (c: ClienteDetalle) => {
    let score = 90;
    if (c.bucket === 6) score -= 35;
    if (c.bucket === 5) score -= 15;
    if (c.estado === 'NO CONTESTA') score -= 25;
    if (c.estado === 'PROMESA DE PAGO') score += 20;
    if (c.estado === 'NO SALVADA') score -= 40;
    if (c.dias_mora > 150) score -= 10;
    
    score = Math.max(5, Math.min(98, score));
    
    let label = 'Media';
    let color = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    let Icon = Activity;
    
    if (score >= 75) {
      label = 'Alta Probabilidad';
      color = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      Icon = ShieldCheck;
    } else if (score < 40) {
      label = 'Riesgo Alto';
      color = 'text-red-400 bg-red-400/10 border-red-400/20';
      Icon = ShieldAlert;
    }

    return { score, label, color, Icon };
  };

  const tabs = [
    { id: 'promesas', label: 'Promesas y Compromisos', count: promesas.length, icon: Clock, color: 'text-amber-400 border-amber-500/30' },
    { id: 'salvados', label: 'Clientes Salvados', count: salvados.length, icon: CheckCircle, color: 'text-emerald-400 border-emerald-500/30' },
    { id: 'nosalvados', label: 'Por Gestionar / No Salvados', count: noSalvados.length, icon: XCircle, color: 'text-red-400 border-red-500/30' }
  ];

  const getActiveList = () => {
    switch (activeTab) {
      case 'promesas': return promesas;
      case 'salvados': return salvados;
      case 'nosalvados': return noSalvados;
    }
  };

  const list = getActiveList();

  return (
    <div className="rounded-xl border border-white/5 bg-card p-6 shadow-xl space-y-6">
      <div>
        <h3 className="text-lg font-bold">Detalle de Cartera por Estado</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Lista de clientes y herramientas de contacto según su estado actual en la campaña.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-white/5 pb-3">
        {tabs.map(t => {
          const Icon = t.icon;
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setSelectedClienteId(null);
              }}
              className={`flex items-center justify-between p-3 rounded-lg border text-sm font-semibold transition-all duration-300 ${
                isSelected
                  ? 'bg-white/5 border-white/10 text-white shadow-md'
                  : 'bg-transparent border-transparent text-muted-foreground hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${t.color.split(' ')[0]}`} />
                {t.label}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isSelected ? 'bg-white/10 text-white' : 'bg-white/5 text-muted-foreground'
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clients list */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No hay registros en esta categoría.</p>
        ) : (
          list.map(cliente => {
            const isSelected = selectedClienteId === cliente.id;
            const mensajeObj = getSugerenciaMensaje(cliente);

            return (
              <div
                key={cliente.id}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  isSelected
                    ? 'bg-white/5 border-white/20 shadow-lg'
                    : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{cliente.nombre}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground font-medium">
                        ID: {cliente.id_cliente || 'N/A'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/5 ${
                        cliente.bucket === 5 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        Bucket {cliente.bucket}
                      </span>
                      {(() => {
                        const { score, label, color, Icon } = getProbabilidad(cliente);
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${color}`} title={`Score IA: ${score}%`}>
                            <Icon className="w-3 h-3" />
                            {label} ({score}%)
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Mora: <strong className="text-white">{cliente.dias_mora} días</strong>
                      </span>
                      <span>Cédula: <strong className="text-white">{cliente.cedula || 'N/A'}</strong></span>
                      {cliente.fecha_promesa && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Calendar className="w-3.5 h-3.5" />
                          Fecha Compromiso: {cliente.fecha_promesa}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right space-y-0.5">
                      <p className="text-[10px] text-muted-foreground font-medium">Saldo Capital</p>
                      <p className="text-sm font-bold text-white">{formatCurrency(cliente.capital)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Equivalente: <span className="text-cyan-400 font-medium">${cliente.saldo_dolares.toFixed(2)} USD</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedClienteId(isSelected ? null : cliente.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${
                        isSelected
                          ? 'bg-white/10 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/20'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {isSelected ? 'Cerrar' : 'Estrategia Contacto'}
                    </button>
                  </div>
                </div>

                {/* Strategy Suggestion Drawer */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/5 space-y-3 overflow-hidden"
                    >
                      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs">
                        <p className="font-bold text-blue-400 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Sugerencia Estratégica:
                        </p>
                        <p className="text-muted-foreground mt-1 font-medium">{mensajeObj.sugerencia}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Mensaje Sugerido para WhatsApp:
                        </label>
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-xs text-white leading-relaxed select-all">
                          {mensajeObj.mensaje}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        {cliente.telefono && (
                          <a
                            href={`tel:${cliente.telefono}`}
                            onClick={() => setPendingCallClientId(cliente.id)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5 text-muted-foreground hover:text-white transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Llamar ({cliente.telefono})
                          </a>
                        )}
                        <a
                          href={getWhatsAppLink(cliente.whatsapp || cliente.telefono, mensajeObj.mensaje)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition-all duration-300"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Enviar WhatsApp
                        </a>
                        <a 
                          href={`/clientes/${cliente.id}`} 
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/20 transition-all"
                        >
                          <Target className="w-3.5 h-3.5" />
                          Abrir CRM Operativo
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
