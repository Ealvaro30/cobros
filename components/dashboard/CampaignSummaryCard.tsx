'use client';

import { motion } from 'framer-motion';
import { formatCurrency, formatNumber } from '@/lib/utils/index';
import type { ResumenCampana } from '@/types';
import { Target, Users, Wallet, TrendingUp, HandshakeIcon, Percent } from 'lucide-react';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface CampaignSummaryCardProps {
  campana: ResumenCampana | undefined;
  isLoading: boolean;
}

export function CampaignSummaryCard({ campana, isLoading }: CampaignSummaryCardProps) {
  const { rate } = useExchangeRate();

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl border border-white/5 bg-card/50 flex flex-col items-center justify-center min-h-[250px]">
        <div className="w-8 h-8 rounded-full border-t-2 border-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium">Cargando métricas de la campaña...</p>
      </div>
    );
  }

  if (!campana) {
    return (
      <div className="p-6 rounded-xl border border-white/5 bg-card/50 flex flex-col items-center justify-center min-h-[250px] text-center">
        <Target className="w-10 h-10 text-slate-500 mb-3 opacity-50" />
        <p className="text-sm font-semibold text-slate-300">Sin Campaña Activa</p>
        <p className="text-xs text-muted-foreground mt-1">Seleccione una campaña en la barra superior para ver su rendimiento.</p>
      </div>
    );
  }

  // Conversions for USD display
  const totalCapitalUsd = campana.total_capital / rate;
  const totalRecuperadoUsd = campana.total_recuperado / rate;
  const totalPendienteUsd = campana.total_pendiente / rate;
  const progressPct = campana.pct_recuperacion;

  return (
    <div className="rounded-xl border border-white/5 glass-card overflow-hidden shadow-lg h-full">
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
            <Target className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Rendimiento de Campaña</h2>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-success/20 border border-success/30 text-[10px] font-bold text-success">
          {campana.campana_nombre}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Recuperación Total</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{progressPct}%</span>
                <span className="text-xs font-medium text-emerald-400">logrado</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-semibold">RECUPERADO</p>
              <p className="text-sm font-bold text-success">${formatNumber(totalRecuperadoUsd)}</p>
            </div>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${Math.min(100, progressPct)}%` }} 
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-success rounded-full relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Users className="w-3.5 h-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-wider">Total Clientes</p>
            </div>
            <p className="text-lg font-black text-white">{formatNumber(campana.total_clientes)}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              {campana.salvadas} recuperados
            </p>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <HandshakeIcon className="w-3.5 h-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-wider">Promesas Activas</p>
            </div>
            <p className="text-lg font-black text-white">{formatNumber(campana.promesas)}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Pendientes de pago</p>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-1.5 text-primary mb-1">
              <Wallet className="w-3.5 h-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-wider">Capital Inicial</p>
            </div>
            <p className="text-base font-bold text-primary/80">${formatNumber(totalCapitalUsd)} USD</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">≈ {formatCurrency(campana.total_capital)} C$</p>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-1.5 text-amber-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-wider">Saldo Pendiente</p>
            </div>
            <p className="text-base font-bold text-amber-100">${formatNumber(totalPendienteUsd)} USD</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">≈ {formatCurrency(campana.total_pendiente)} C$</p>
          </div>
        </div>
      </div>
    </div>
  );
}
