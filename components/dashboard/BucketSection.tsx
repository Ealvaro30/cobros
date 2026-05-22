'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils/index';
import { calcularProyeccion, calcularFalta, calcularCumplimiento } from '@/lib/utils/bucket';
import type { BucketStats } from '@/types';

interface BucketSectionProps {
  stats: BucketStats | undefined;
  metaBucket5: number;
  metaBucket6: number;
  isLoading: boolean;
}

export function BucketSection({ stats, metaBucket5, metaBucket6, isLoading }: BucketSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-card p-6">
            <div className="h-6 w-24 skeleton mb-4" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((j) => (
                <div key={j} className="h-4 skeleton" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const buckets = [
    {
      label: 'Bucket 5',
      subtitle: '121–150 días mora',
      data: stats?.bucket5,
      meta: metaBucket5,
      color: 'amber',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Bucket 6',
      subtitle: '151–180 días mora',
      data: stats?.bucket6,
      meta: metaBucket6,
      color: 'red',
      gradient: 'from-red-500 to-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {buckets.map((bucket, i) => {
        const actual = bucket.data?.recuperado || 0;
        const promesas = bucket.data?.promesas || 0;
        const proyeccion = calcularProyeccion(actual, promesas);
        const falta = calcularFalta(bucket.meta, actual);
        const cumplimiento = calcularCumplimiento(actual, bucket.meta);

        return (
          <motion.div
            key={bucket.label}
            initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-white/5 bg-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{bucket.label}</h3>
                <p className="text-xs text-muted-foreground">{bucket.subtitle}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${bucket.color}-500/10 text-${bucket.color}-400`}>
                {bucket.data?.total_clientes || 0} clientes
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cumplimiento</span>
                <span className="font-bold">{cumplimiento}%</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(cumplimiento, 100)}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-full bg-gradient-to-r ${bucket.gradient} rounded-full`}
                />
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Recuperado', value: formatCurrency(actual), sub: 'Actual' },
                { label: 'Proyección', value: formatCurrency(proyeccion), sub: 'Actual + Promesas' },
                { label: 'Falta', value: formatCurrency(falta), sub: 'Meta - Actual' },
                { label: 'Meta', value: formatCurrency(bucket.meta), sub: 'Objetivo' },
              ].map((metric) => (
                <div key={metric.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{metric.label}</p>
                  <p className="text-sm font-bold mt-1">{metric.value}</p>
                  <p className="text-[10px] text-muted-foreground">{metric.sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
