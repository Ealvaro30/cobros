'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function EstadoManagementModal({ onClose }: { onClose: () => void }) {
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newState, setNewState] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    loadStates();
  }, []);

  const loadStates = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/states');
    if (res.ok) {
      const data = await res.json();
      setStates(data);
    }
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newState.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/admin/states', {
      method: 'POST',
      body: JSON.stringify({ name: newState.trim().toUpperCase(), is_active: true })
    });
    if (res.ok) {
      setNewState('');
      loadStates();
    } else {
      alert('Error al agregar estado');
    }
    setSubmitting(false);
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    const res = await fetch('/api/admin/states', {
      method: 'PUT',
      body: JSON.stringify({ id, is_active: !isActive })
    });
    if (res.ok) loadStates();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Está seguro que desea eliminar el estado "${name}"? Si hay clientes con este estado podrían requerir migración manual.`)) return;
    
    const res = await fetch(`/api/admin/states?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadStates();
    } else {
      alert('No se pudo eliminar el estado. Es posible que esté en uso.');
    }
  };

  return (
    <div className="modal-responsive bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 100 }}
        className="modal-content bg-card border border-white/10 shadow-2xl relative"
      >
        <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-slate-950">
          <h2 className="text-lg font-bold">Gestión de Estados</h2>
          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6 flex gap-3 text-amber-400 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>Los estados eliminados podrían requerir actualizar manualmente los clientes asignados a ellos para no perder filtros.</p>
          </div>

          <form onSubmit={handleAdd} className="flex gap-2 mb-6">
            <input 
              value={newState} 
              onChange={e => setNewState(e.target.value)}
              placeholder="NUEVO ESTADO" 
              className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-white uppercase"
            />
            <button 
              type="submit" 
              disabled={submitting || !newState.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Agregar
            </button>
          </form>

          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {states.map(state => (
                <div key={state.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-slate-900">
                  <span className={`text-sm font-bold ${state.is_active ? 'text-white' : 'text-slate-500 line-through'}`}>
                    {state.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleActive(state.id, state.is_active)}
                      className={`text-xs px-2 py-1 rounded font-semibold ${state.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {state.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                    <button 
                      onClick={() => handleDelete(state.id, state.name)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {states.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-4">No hay estados configurados</div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
