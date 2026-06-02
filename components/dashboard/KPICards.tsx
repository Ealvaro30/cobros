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
  { key: 'total_cartera', label: 'Total Cartera', icon: Wallet, color: 'from-primary/80 to-primary/40', glow: 'glow-blue', format: 'currency', route: '/clientes' },
  { key: 'total_recuperado', label: 'Salvado', icon: TrendingUp, color: 'from-success/80 to-success/40', glow: 'glow-green', format: 'currency', route: '/clientes' },
  { key: 'total_pendiente', label: 'Pendiente', icon: Clock, color: 'from-secondary/80 to-secondary/40', glow: 'glow-amber', format: 'currency', route: '/clientes' },
  { key: 'monto_promesas', label: 'Promesas', icon: HandshakeIcon, color: 'from-accent/80 to-accent/40', glow: '', format: 'currency', route: '/calendario' },
  { key: 'pct_recuperacion', label: '% Recuperación', icon: Percent, color: 'from-success/60 to-success/30', glow: '', format: 'percent', route: '/clientes' },
  { key: 'clientes_gestionados', label: 'Gestionados', icon: Users, color: 'from-blue-600 to-blue-400', glow: '', format: 'number', route: '/gestiones' },
  { key: 'clientes_sin_gestion', label: 'Sin Gestión', icon: UserX, color: 'from-destructive/80 to-destructive/40', glow: 'glow-red', format: 'number', route: '/clientes?sin_gestion=true' },
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => router.push(card.route)}
            className={`relative overflow-hidden glass-card p-4 transition-all duration-300 group cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${card.glow}`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.color} opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1 group-hover:text-white transition-colors">
                  {card.label}
                </p>
                {isLoading ? (
                  <div className="h-7 w-28 skeleton" />
                ) : (
                  <div>
                    {card.format === 'currency' && stats ? (
                      <>
                        <p className="text-xl font-bold tracking-tight group-hover:text-blue-400 transition-colors">
                          $ {formatNumber(Math.round(((stats[card.key as keyof DashboardStats] as number) / 36.62) * 100) / 100)} USD
                        </p>
                        <p className="text-[10px] text-muted-foreground font-semibold group-hover:text-cyan-400 transition-colors mt-0.5">
                          ≈ {formatValue(card.key, card.format)} C$
                        </p>
                      </>
                    ) : (
                      <p className="text-xl font-bold tracking-tight group-hover:text-blue-400 transition-colors">
                        {formatValue(card.key, card.format)}
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
