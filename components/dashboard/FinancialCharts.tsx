'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils/index';
import type { DashboardStats, BucketStats } from '@/types';

interface FinancialChartsProps {
  stats: DashboardStats | undefined;
  bucketStats: BucketStats | undefined;
  isLoading: boolean;
}

export function FinancialCharts({ stats, bucketStats, isLoading }: FinancialChartsProps) {
  const [currency, setCurrency] = useState<'NIO' | 'USD'>('NIO');

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-card p-6 h-80 skeleton" />
        ))}
      </div>
    );
  }

  const rate = 36.62;

  // Data for portfolio distribution pie chart
  const portfolioData = [
    { 
      name: 'Recuperado', 
      value: currency === 'NIO' ? (stats?.total_salvado || 0) : (stats?.total_salvado || 0) / rate, 
      color: '#10b981' 
    },
    { 
      name: 'Promesas', 
      value: currency === 'NIO' ? (stats?.monto_promesas || 0) : (stats?.monto_promesas || 0) / rate, 
      color: '#f59e0b' 
    },
    { 
      name: 'Pendiente', 
      value: currency === 'NIO' 
        ? ((stats?.total_pendiente || 0) - (stats?.monto_promesas || 0)) 
        : ((stats?.total_pendiente || 0) - (stats?.monto_promesas || 0)) / rate, 
      color: '#ef4444' 
    },
  ].filter((d) => d.value > 0);

  // Data for bucket comparison bar chart
  const bucketCompare = [
    {
      name: 'Bucket 5',
      Capital: currency === 'NIO' ? (bucketStats?.bucket5?.capital || 0) : (bucketStats?.bucket5?.capital || 0) / rate,
      Recuperado: currency === 'NIO' ? (bucketStats?.bucket5?.recuperado || 0) : (bucketStats?.bucket5?.recuperado || 0) / rate,
      Promesas: currency === 'NIO' ? (bucketStats?.bucket5?.promesas || 0) : (bucketStats?.bucket5?.promesas || 0) / rate,
    },
    {
      name: 'Bucket 6',
      Capital: currency === 'NIO' ? (bucketStats?.bucket6?.capital || 0) : (bucketStats?.bucket6?.capital || 0) / rate,
      Recuperado: currency === 'NIO' ? (bucketStats?.bucket6?.recuperado || 0) : (bucketStats?.bucket6?.recuperado || 0) / rate,
      Promesas: currency === 'NIO' ? (bucketStats?.bucket6?.promesas || 0) : (bucketStats?.bucket6?.promesas || 0) / rate,
    },
  ];

  // Data for client status bar
  const statusData = [
    { name: 'Gestionados', value: stats?.clientes_gestionados || 0, fill: '#3b82f6' },
    { name: 'Sin Gestión', value: stats?.clientes_sin_gestion || 0, fill: '#64748b' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs font-semibold text-white mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color || entry.fill }}>
            {entry.name}: {currency === 'NIO' ? formatCurrency(entry.value) : `$ ${formatNumber(Math.round(entry.value * 100) / 100)}`}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Selector de Divisas Interactivo */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground font-semibold">Visualizar en:</span>
        <div className="inline-flex rounded-lg bg-white/5 p-0.5 border border-white/10">
          <button
            onClick={() => setCurrency('NIO')}
            className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-all ${
              currency === 'NIO' ? 'bg-blue-600 text-white shadow' : 'text-muted-foreground hover:text-white'
            }`}
          >
            C$ NIO
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1 rounded-md text-[10px] font-extrabold transition-all ${
              currency === 'USD' ? 'bg-blue-600 text-white shadow' : 'text-muted-foreground hover:text-white'
            }`}
          >
            $ USD
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Portfolio Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-white/5 bg-card p-6"
        >
          <h3 className="font-bold mb-4 text-white text-sm">Distribución de Cartera</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={portfolioData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {portfolioData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-400 font-medium">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Bucket Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-white/5 bg-card p-6"
        >
          <h3 className="font-bold mb-4 text-white text-sm">Comparación por Bucket</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={bucketCompare} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                tickFormatter={(v) => currency === 'NIO' ? `C$ ${(v / 1000).toFixed(0)}k` : `$ ${(v / 1000).toFixed(0)}k`} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Capital" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Recuperado" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Promesas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-slate-400 font-medium">{value}</span>
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Client Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-white/5 bg-card p-6 md:col-span-2"
        >
          <h3 className="font-bold mb-4 text-white text-sm">Estado de Gestión de Clientes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} layout="vertical" barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#94a3b8' }} width={100} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  return (
                    <div className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
                      <p className="text-xs text-white font-semibold">{payload[0].payload.name}: {payload[0].value}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
