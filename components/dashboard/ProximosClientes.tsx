'use client';

import { useState } from 'react';
import type { PromesaProxima } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/index';
import { motion } from 'framer-motion';
import { Calendar, Phone, Clock, MessageSquare, AlertCircle } from 'lucide-react';

interface ProximosClientesProps {
  proximos: PromesaProxima[] | undefined;
  isLoading: boolean;
}

export function ProximosClientes({ proximos, isLoading }: ProximosClientesProps) {
  const [filtro, setFiltro] = useState<'todos' | 'promesas' | 'seguimientos'>('todos');

  if (isLoading) {
    return <div className="h-64 skeleton rounded-xl" />;
  }

  // Filter
  const list = proximos?.filter(p => {
    const isCall = ['VOLVER A LLAMAR', 'REPROGRAMADO'].includes(p.estado);
    if (filtro === 'promesas') return !isCall;
    if (filtro === 'seguimientos') return isCall;
    return true;
  }) || [];

  const getWhatsAppLink = (p: PromesaProxima) => {
    const isCall = ['VOLVER A LLAMAR', 'REPROGRAMADO'].includes(p.estado);
    const name = p.nombre.split(' ')[0];
    let msg = '';

    if (isCall) {
      msg = `Estimado/a ${name}, le saluda GMG Servicios. Le escribimos para dar seguimiento al contacto acordado para hoy y conversar brevemente sobre las alternativas para normalizar su cuenta. ¿Le parece bien si le llamamos ahora?`;
    } else {
      msg = `Estimado/a ${name}, le recordamos de parte de GMG Servicios que su compromiso de pago por ${formatCurrency(p.monto_promesa)} está programado para hoy. Agradecemos su puntualidad. Quedamos a su disposición.`;
    }

    const phone = p.whatsapp || p.telefono || '';
    const cleaned = phone.replace(/[^\d+]/g, '');
    const prefix = cleaned.startsWith('+') ? '' : '+505';
    return `https://wa.me/${prefix}${cleaned}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/5 bg-card p-6 shadow-xl space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Agenda: Próximos Clientes a Gestionar
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Clientes con compromisos de pago o llamadas de seguimiento programadas para hoy y próximos días.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 p-1 rounded-lg bg-white/5 border border-white/5 self-start sm:self-center">
          {(['todos', 'promesas', 'seguimientos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                filtro === f
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'promesas' ? '💰 Promesas' : '📞 Llamadas'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No hay compromisos agendados en esta categoría.</p>
        ) : (
          list.map(p => {
            const isCall = ['VOLVER A LLAMAR', 'REPROGRAMADO'].includes(p.estado);
            return (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{p.nombre}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCall
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {isCall ? '📞 Seguimiento / Llamada' : '💰 Compromiso Pago'}
                    </span>
                    {p.bucket && (
                      <span className="text-[10px] text-muted-foreground">
                        Bucket {p.bucket}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Programado: <strong className="text-white">{formatDate(p.fecha_promesa)}</strong>
                    </span>
                    {p.agente_nombre && (
                      <span>Gestor: <strong className="text-white">{p.agente_nombre}</strong></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                  {!isCall && (
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-muted-foreground">Monto Comprometido</p>
                      <p className="text-sm font-bold text-amber-400">{formatCurrency(p.monto_promesa)}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {(p.telefono || p.whatsapp) && (
                      <a
                        href={`tel:${p.telefono || p.whatsapp}`}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white transition-colors"
                        title="Llamar por teléfono"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <a
                      href={getWhatsAppLink(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all duration-300"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Enviar Recordatorio
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
