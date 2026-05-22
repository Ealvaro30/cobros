'use client';

import { motion } from 'framer-motion';
import { Target, TrendingUp, ShieldCheck } from 'lucide-react';

export function CosechasCompliance() {
  const cosechas = [
    {
      nombre: '5ª Cosecha (Actual)',
      bucket5: 53,
      bucket6: 50,
      color5: 'from-emerald-500 to-teal-500',
      color6: 'from-blue-500 to-cyan-500',
    },
    {
      nombre: '4ª Cosecha',
      bucket5: 45,
      bucket6: 45,
      color5: 'from-emerald-600 to-teal-600',
      color6: 'from-blue-600 to-cyan-600',
    },
    {
      nombre: '3ª Cosecha',
      bucket5: 39,
      bucket6: 34,
      color5: 'from-amber-500 to-orange-500',
      color6: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-white/5 bg-card p-6 shadow-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Matriz de Cumplimiento (Cosechas Históricas)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Porcentaje de cartera salvada sobre el total asignado por cohorte.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <TrendingUp className="w-3.5 h-3.5" />
          Rendimiento Estable
        </div>
      </div>

      <div className="space-y-6">
        {cosechas.map((cosecha, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300"
          >
            <div className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              {cosecha.nombre}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bucket 5 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Bucket 5 (121-150 Mora)</span>
                  <span className="text-emerald-400 font-bold">{cosecha.bucket5}% Salvado</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cosecha.bucket5}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className={`h-full bg-gradient-to-r ${cosecha.color5}`}
                  />
                </div>
              </div>

              {/* Bucket 6 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Bucket 6 (151-180 Mora)</span>
                  <span className="text-blue-400 font-bold">{cosecha.bucket6}% Salvado</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cosecha.bucket6}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className={`h-full bg-gradient-to-r ${cosecha.color6}`}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
