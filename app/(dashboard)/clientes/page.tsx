'use client';

import { useClientes, useDeleteCliente } from '@/hooks/useClientes';
import { useUIStore } from '@/stores/uiStore';
import { useClienteStore } from '@/stores/clienteStore';
import { ClientesTable } from '@/components/clientes/ClientesTable';
import { ClienteModal } from '@/components/clientes/ClienteModal';
import { ClienteCRMDrawer } from '@/components/clientes/ClienteCRMDrawer';
import { motion } from 'framer-motion';
import { Plus, Filter, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ESTADOS } from '@/lib/utils/index';

export default function ClientesPage() {
  const { selectedCampanaId } = useUIStore();
  const { data: clientes, isLoading } = useClientes(selectedCampanaId);
  const deleteMutation = useDeleteCliente();
  
  const {
    isModalOpen, isTimelineOpen, selectedClienteId,
    openModal, closeModal, openTimeline, closeTimeline,
    filterBucket, filterEstado, setFilterBucket, setFilterEstado, resetFilters,
  } = useClienteStore();
  const [showGestionForm, setShowGestionForm] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<{ id: string; nombre: string } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);


  const filteredClientes = clientes?.filter((c) => {
    if (filterBucket && c.bucket !== filterBucket) return false;
    if (filterEstado && c.estado !== filterEstado) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold gradient-text">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de clientes morosos — {filteredClientes.length} registros
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all text-sm shadow-lg hover:shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={filterBucket || ''}
          onChange={(e) => setFilterBucket(e.target.value ? Number(e.target.value) : null)}
          className="bg-accent/50 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos los Buckets</option>
          <option value="5">Bucket 5</option>
          <option value="6">Bucket 6</option>
        </select>
        <select
          value={filterEstado || ''}
          onChange={(e) => setFilterEstado(e.target.value || null)}
          className="bg-accent/50 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos los Estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        {(filterBucket || filterEstado) && (
          <button onClick={resetFilters} className="text-xs text-blue-400 hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <ClientesTable
        data={filteredClientes}
        onView={(id) => {
          openTimeline(id);
          setShowGestionForm(false);
        }}
        onEdit={(id) => openModal(id)}
        onDelete={(id, nombre) => {
          setClienteToDelete({ id, nombre });
          setDeleteConfirmInput('');
          setDeleteError(null);
        }}
        isLoading={isLoading}
      />

      {/* Modal for create/edit */}
      {isModalOpen && (
        <ClienteModal
          cliente={clientes?.find((c) => c.id === selectedClienteId) || null}
          onClose={closeModal}
        />
      )}

      {/* Full Operational CRM slide-over */}
      {isTimelineOpen && selectedClienteId && (
        <ClienteCRMDrawer
          clienteId={selectedClienteId}
          onClose={closeTimeline}
        />
      )}
      {/* Advanced Client Delete Modal */}
      {clienteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-8 h-8" />
              <h2 className="text-lg font-bold text-white">Eliminar Cliente Definitivamente</h2>
            </div>
            
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-xs text-red-200 space-y-2">
              <p><strong>¡ADVERTENCIA DE SEGURIDAD!</strong></p>
              <p>Está a punto de eliminar al cliente <strong>{clienteToDelete.nombre}</strong>.</p>
              <p>Esta acción eliminará de forma permanente todos sus registros de gestiones, recordatorios e historial de pagos asociados en el sistema.</p>
              <p><strong>Restricciones de negocio aplicadas:</strong></p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>No debe tener saldo pendiente de pago.</li>
                <li>No debe pertenecer a una campaña actualmente activa.</li>
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
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg font-mono text-sm uppercase"
                placeholder="ELIMINAR"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setClienteToDelete(null); setDeleteConfirmInput(''); setDeleteError(null); }}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  try {
                    setDeleteError(null);
                    await deleteMutation.mutateAsync(clienteToDelete.id);
                    setClienteToDelete(null);
                    setDeleteConfirmInput('');
                  } catch (err: any) {
                    setDeleteError(err.message || 'Error al eliminar el cliente.');
                  }
                }}
                disabled={deleteConfirmInput.toUpperCase().trim() !== 'ELIMINAR' || deleteMutation.isPending}
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
