import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <SearchX className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-5xl font-black text-white mb-3">404</h1>
        <p className="text-xl font-semibold text-slate-300 mb-2">Página no encontrada</p>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
        >
          Ir al Dashboard
        </Link>
      </div>
    </div>
  );
}
