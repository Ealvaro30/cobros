'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Error al cargar</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          No se pudo cargar esta sección. Verifica tu conexión e intenta de nuevo.
          {error.message && (
            <span className="block mt-2 text-xs font-mono bg-black/30 border border-white/5 rounded p-2 text-slate-500 text-left">
              {error.message}
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white font-semibold rounded-xl transition-all text-sm"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all text-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
