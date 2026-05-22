'use client';

import { useResumenCampanas, useCreateCampana, useUpdateCampana, useDeleteCampana } from '@/hooks/useCampanias';
import { formatCurrency } from '@/lib/utils/index';
import { MESES } from '@/lib/utils/index';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Plus, FolderOpen, TrendingUp, EyeOff, Eye, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

export default function CampanasPage() {
  const { data: resumenes, isLoading } = useResumenCampanas();
  const createMutation = useCreateCampana();
  const [showForm, setShowForm] = useState(false);
  const [newMes, setNewMes] = useState(new Date().getMonth() + 1);
  const [newAnio, setNewAnio] = useState(new Date().getFullYear());
  const [meta5, setMeta5] = useState(60000);
  const [meta6, setMeta6] = useState(40000);

  const updateMutation = useUpdateCampana();
  const deleteMutation = useDeleteCampana();
  const [campanaToDelete, setCampanaToDelete] = useState<{id: string, nombre: string} | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);


  const handleCreate = async () => {
    await createMutation.mutateAsync({
      nombre: `${MESES[newMes - 1]} ${newAnio}`,
      mes: newMes,
      anio: newAnio,
      estado: 'activa',
      meta_bucket5: meta5,
      meta_bucket6: meta6,
    });
    setShowForm(false);
  };

  const chartData = resumenes?.map((r) => ({
    name: `${MESES[r.mes - 1]?.slice(0, 3)} ${r.anio}`,
    Recuperado: r.total_recuperado,
    Capital: r.total_capital,
    Salvadas: r.salvadas,
  })).reverse() || [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Campañas</h1>
          <p className="text-sm text-muted-foreground">Gestión de campañas mensuales</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium rounded-lg hover:from-blue-500 hover:to-cyan-500 transition-all">
          <Plus className="w-4 h-4" /> Nueva Campaña
        </button>
      </motion.div>

      {/* New campaign form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 rounded-xl border border-white/10 bg-card space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Mes</label>
              <select value={newMes} onChange={(e) => setNewMes(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Año</label>
              <input type="number" value={newAnio} onChange={(e) => setNewAnio(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Meta B5</label>
              <input type="number" value={meta5} onChange={(e) => setMeta5(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Meta B6</label>
              <input type="number" value={meta6} onChange={(e) => setMeta6(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={createMutation.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors">
            Crear Campaña
          </button>
        </motion.div>
      )}

      {/* Comparison chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Comparación Mensual
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Legend formatter={(v: string) => <span className="text-xs text-slate-400">{v}</span>} />
              <Bar dataKey="Capital" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Recuperado" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-48 skeleton rounded-xl" />)
        ) : (
          resumenes?.map((r) => (
            <motion.div key={r.campana_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/5 bg-card p-5 space-y-3 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className={`w-4 h-4 ${r.campana_estado === 'oculta' ? 'text-slate-500' : 'text-blue-400'}`} />
                  <h3 className={`font-bold text-sm ${r.campana_estado === 'oculta' ? 'text-slate-500' : 'text-white'}`}>{r.campana_nombre}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    r.campana_estado === 'activa' ? 'bg-emerald-500/10 text-emerald-400' :
                    r.campana_estado === 'oculta' ? 'bg-slate-800 text-slate-400' : 'bg-slate-500/10 text-slate-400'
                  }`}>{r.campana_estado}</span>
                  
                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                    <button 
                      title={r.campana_estado === 'oculta' ? 'Mostrar Campaña' : 'Ocultar Campaña'}
                      onClick={() => updateMutation.mutate({ id: r.campana_id, estado: r.campana_estado === 'oculta' ? 'activa' : 'oculta' })}
                      disabled={updateMutation.isPending}
                      className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                    >
                      {r.campana_estado === 'oculta' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      title="Eliminar Campaña"
                      onClick={() => { setCampanaToDelete({ id: r.campana_id, nombre: r.campana_nombre }); setDeleteInput(''); setDeleteError(null); }}
                      className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Clientes:</span> <strong>{r.total_clientes}</strong></div>
                <div><span className="text-muted-foreground">B5/B6:</span> <strong>{r.clientes_bucket5}/{r.clientes_bucket6}</strong></div>
                <div><span className="text-muted-foreground">Capital:</span> <strong>{formatCurrency(r.total_capital)}</strong></div>
                <div><span className="text-emerald-400">Recuperado:</span> <strong className="text-emerald-400">{formatCurrency(r.total_recuperado)}</strong></div>
                <div><span className="text-muted-foreground">Salvadas:</span> <strong>{r.salvadas}</strong></div>
                <div><span className="text-muted-foreground">Promesas:</span> <strong>{r.promesas}</strong></div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Recuperación</span>
                  <span className="font-bold">{r.pct_recuperacion}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" style={{ width: `${Math.min(r.pct_recuperacion, 100)}%` }} />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Advanced Delete Modal */}
      {campanaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-8 h-8" />
              <h2 className="text-lg font-bold text-white">Eliminar Campaña Definitivamente</h2>
            </div>
            
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-xs text-red-200 space-y-2">
              <p><strong>¡ADVERTENCIA CRÍTICA!</strong></p>
              <p>Está a punto de eliminar la campaña <strong>{campanaToDelete.nombre}</strong>.</p>
              <p>Esta acción es <strong>IRREVERSIBLE</strong> y provocará la eliminación en cascada de:</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>Todos los clientes asociados.</li>
                <li>Todo el historial de gestiones.</li>
                <li>Todas las promesas de pago y métricas.</li>
                <li>Todos los registros de importación.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-xs text-red-400">
                <strong>Error:</strong> {deleteError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Para confirmar, escriba <strong>ELIMINAR</strong> en el siguiente campo:
              </label>
              <input 
                type="text" 
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-sm uppercase"
                placeholder="ELIMINAR"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setCampanaToDelete(null); setDeleteInput(''); setDeleteError(null); }}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  try {
                    setDeleteError(null);
                    await deleteMutation.mutateAsync(campanaToDelete.id);
                    setCampanaToDelete(null);
                    setDeleteInput('');
                  } catch (err: any) {
                    setDeleteError(err.message || 'Error al eliminar la campaña.');
                  }
                }}
                disabled={deleteInput.toUpperCase().trim() !== 'ELIMINAR' || deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 disabled:bg-red-600/30 disabled:text-white/50 hover:bg-red-500 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:shadow-none"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirmar Eliminación
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
