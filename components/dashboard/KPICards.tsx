'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatNumber } from '@/lib/utils/index';
import type { DashboardStats } from '@/types';
import {
  DollarSign,
  TrendingUp,
  Clock,
  HandshakeIcon,
  Percent,
  Users,
  UserX,
  Wallet,
} from 'lucide-react';

interface KPICardsProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}

const cards = [
  { key: 'total_cartera', label: 'Total Cartera', icon: Wallet, color: 'from-blue-600 to-blue-400', glow: 'glow-blue', format: 'currency', route: '/clientes' },
  { key: 'total_recuperado', label: 'Recuperado', icon: TrendingUp, color: 'from-emerald-600 to-emerald-400', glow: 'glow-green', format: 'currency', route: '/clientes' },
  { key: 'total_pendiente', label: 'Pendiente', icon: Clock, color: 'from-amber-600 to-amber-400', glow: 'glow-amber', format: 'currency', route: '/clientes' },
  { key: 'monto_promesas', label: 'Promesas', icon: HandshakeIcon, color: 'from-violet-600 to-violet-400', glow: '', format: 'currency', route: '/calendario' },
  { key: 'pct_recuperacion', label: '% Recuperación', icon: Percent, color: 'from-cyan-600 to-cyan-400', glow: '', format: 'percent', route: '/clientes' },
  { key: 'clientes_gestionados', label: 'Gestionados', icon: Users, color: 'from-indigo-600 to-indigo-400', glow: '', format: 'number', route: '/gestiones' },
  { key: 'clientes_sin_gestion', label: 'Sin Gestión', icon: UserX, color: 'from-red-600 to-red-400', glow: 'glow-red', format: 'number', route: '/clientes?sin_gestion=true' },
  { key: 'total_clientes', label: 'Total Clientes', icon: DollarSign, color: 'from-slate-600 to-slate-400', glow: '', format: 'number', route: '/clientes' },
];

export function KPICards({ stats, isLoading }: KPICardsProps) {
  const router = useRouter();

  const formatValue = (key: string, format: string) => {
    if (!stats) return '-';
    const val = stats[key as keyof DashboardStats] as number;
    if (format === 'currency') return formatCurrency(val);
    if (format === 'percent') return `${val}%`;
    return formatNumber(val);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => router.push(card.route)}
            className={`relative overflow-hidden rounded-xl border border-white/5 bg-card p-4 hover:border-white/20 transition-all duration-300 group cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${card.glow}`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.color} opacity-5 rounded-bl-full group-hover:opacity-10 transition-opacity`} />
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1 group-hover:text-white transition-colors">
                  {card.label}
                </p>
                {isLoading ? (
                  <div className="h-7 w-28 skeleton" />
                ) : (
                  <div>
                    <p className="text-xl font-bold tracking-tight group-hover:text-blue-400 transition-colors">
                      {formatValue(card.key, card.format)}
                    </p>
                    {card.format === 'currency' && stats && (
                      <p className="text-[10px] text-muted-foreground font-semibold group-hover:text-cyan-400 transition-colors mt-0.5">
                        ≈ $ {formatNumber(Math.round(((stats[card.key as keyof DashboardStats] as number) / 36.62) * 100) / 100)} USD
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} opacity-80 group-hover:scale-110 transition-transform`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
