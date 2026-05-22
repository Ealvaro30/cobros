'use client';

import { useGestiones } from '@/hooks/useGestiones';
import { useCliente } from '@/hooks/useClientes';
import { formatDate, formatCurrency, getEstadoColor } from '@/lib/utils/index';
import { EstadoBadge } from '@/components/clientes/EstadoBadge';
import { WhatsAppButton } from '@/components/clientes/WhatsAppButton';
import { Phone, MessageCircle, MessageSquare, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const canalIcons = { llamada: Phone, whatsapp: MessageCircle, sms: MessageSquare };

export function GestionTimeline({ clienteId }: { clienteId: string }) {
  const { data: gestiones, isLoading } = useGestiones(clienteId);
  const { data: cliente } = useCliente(clienteId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Client header card */}
      {cliente && (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{cliente.nombre}</h3>
            <WhatsAppButton whatsapp={cliente.whatsapp} size="md" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Cédula: {cliente.cedula || '-'}</span>
            <span>Bucket: {cliente.bucket || '-'}</span>
            <span>Capital: {formatCurrency(cliente.capital)}</span>
            <span>Mora: {cliente.dias_mora} días</span>
          </div>
          <EstadoBadge estado={cliente.estado} />
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />

        {gestiones?.map((gestion, i) => {
          const Icon = canalIcons[gestion.canal] || Phone;
          return (
            <motion.div
              key={gestion.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-10 pb-6"
            >
              {/* Dot */}
              <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-background" />

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground capitalize">{gestion.canal}</span>
                    <EstadoBadge estado={gestion.resultado} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(gestion.fecha)}
                  </div>
                </div>

                <p className="text-sm">{gestion.comentario}</p>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Por: {gestion.agente_nombre}</span>
                  {gestion.promesa_pago && gestion.monto_promesa > 0 && (
                    <span className="text-[10px] text-amber-400">
                      Promesa: {formatCurrency(gestion.monto_promesa)} — {gestion.fecha_promesa ? formatDate(gestion.fecha_promesa) : '-'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {(!gestiones || gestiones.length === 0) && (
          <div className="pl-10 text-center py-8 text-muted-foreground text-sm">
            No hay gestiones registradas
          </div>
        )}
      </div>
    </div>
  );
}
