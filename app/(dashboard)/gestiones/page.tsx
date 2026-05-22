'use client';

import { useState } from 'react';
import { useGestiones } from '@/hooks/useGestiones';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '@/lib/utils/index';
import { EstadoBadge } from '@/components/clientes/EstadoBadge';
import { Phone, MessageCircle, MessageSquare, Clock, ClipboardList, Plus, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { getWhatsAppLink, generateAntiBotMessage } from '@/lib/utils/whatsappGenerator';
import { Search, Filter, AlertTriangle, Download, Calendar } from 'lucide-react';

const supabase = createClient();

export default function GestionesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: gestiones, isLoading } = useGestiones();

  // --- Modal de Nueva Gestión ---
  const [showModal, setShowModal] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [canal, setCanal] = useState('llamada');
  const [resultado, setResultado] = useState('PROMESA DE PAGO');
  const [comentario, setComentario] = useState('');
  const [monto, setMonto] = useState(0);
  const [fechaPromesa, setFechaPromesa] = useState('');
  const [saving, setSaving] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCanal, setFilterCanal] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  // Reporte Promesas por Día
  const [activeTab, setActiveTab] = useState<'historial' | 'reporte_promesas'>('historial');
  const [fechaReporte, setFechaReporte] = useState(new Date().toISOString().split('T')[0]);

  const filteredGestiones = gestiones?.filter(g => {
    if (filterCanal && g.canal !== filterCanal) return false;
    if (filterEstado && g.resultado !== filterEstado) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!g.cliente_nombre.toLowerCase().includes(q) && !g.cliente_cedula?.toLowerCase().includes(q) && !g.comentario?.toLowerCase().includes(q)) return false;
    }
    return true;
  }) || [];

  const promesasReporte = gestiones?.filter(g => {
    const isPromesa = g.resultado === 'PROMESA DE PAGO' || g.promesa_pago === true;
    const matchesDate = g.fecha === fechaReporte;
    return isPromesa && matchesDate;
  }) || [];

  const exportToCSV = () => {
    if (promesasReporte.length === 0) return alert('No hay promesas para exportar en esta fecha.');
    const headers = ['ID Cliente', 'Cliente', 'Cedula', 'Monto Promesa', 'Fecha Promesa', 'Gestor', 'Fecha Gestion', 'Comentario'];
    const rows = promesasReporte.map(g => [
      g.cliente_id || '',
      g.cliente_nombre || '',
      g.cliente_cedula || '',
      g.monto_promesa || '0',
      g.fecha_promesa || g.fecha || '',
      g.agente_nombre || '',
      g.fecha || '',
      (g.comentario || '').replace(/"/g, '""')
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_promesas_${fechaReporte}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cargar clientes para el select
  const { data: clientesList } = useQuery({
    queryKey: ['clientes_list_basic'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nombre, cedula').order('nombre');
      return data;
    }
  });

  const handleSaveGestion = async () => {
    if (!clienteId || !comentario) return alert('Seleccione un cliente y añada un comentario.');
    if (!user) return alert('Error de sesión.');
    setSaving(true);
    try {
      // 1. Insertar la gestión
      const { error: errorGestion } = await supabase.from('gestiones').insert({
        cliente_id: clienteId,
        agente_id: user.id,
        canal,
        resultado,
        comentario
      });
      if (errorGestion) throw errorGestion;

      // 2. Si el resultado implica fecha/monto, actualizar cliente
      if (['PROMESA DE PAGO', 'REPROGRAMADO', 'VOLVER A LLAMAR', 'PAGARA HOY', 'PAGARA SEMANA'].includes(resultado) && fechaPromesa) {
        await supabase.from('clientes').update({
          estado: resultado,
          fecha_promesa: fechaPromesa,
          monto_promesa: monto > 0 ? monto : null,
          promesa_pago: true
        }).eq('id', clienteId);
      } else {
        await supabase.from('clientes').update({
          estado: resultado
        }).eq('id', clienteId);
      }

      setShowModal(false);
      setClienteId(''); setComentario(''); setMonto(0); setFechaPromesa('');
      queryClient.invalidateQueries({ queryKey: ['gestiones'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      console.error(err);
      alert('Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const canalIcons: Record<string, typeof Phone> = { llamada: Phone, whatsapp: MessageCircle, sms: MessageSquare };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Gestiones</h1>
          <p className="text-sm text-muted-foreground">Historial de todas las gestiones realizadas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-glow-blue"
        >
          <Plus className="w-4 h-4" /> Nueva Gestión Manual
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5">
        <button 
          onClick={() => setActiveTab('historial')} 
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'historial' ? 'border-blue-500 text-blue-400' : 'border-transparent text-muted-foreground hover:text-white'}`}
        >
          Historial de Gestiones
        </button>
        <button 
          onClick={() => setActiveTab('reporte_promesas')} 
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'reporte_promesas' ? 'border-blue-500 text-blue-400' : 'border-transparent text-muted-foreground hover:text-white'}`}
        >
          Reporte de Promesas Diarias
        </button>
      </div>

      {activeTab === 'historial' ? (
        <>
          <div className="p-4 rounded-xl border border-white/5 bg-card flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por cliente, cédula o comentario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <select value={filterCanal} onChange={(e) => setFilterCanal(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950">
              <option value="">Todos los Canales</option>
              <option value="llamada">Llamada</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950">
              <option value="">Todos los Estados</option>
              <option value="PROMESA DE PAGO">Promesa de Pago</option>
              <option value="VOLVER A LLAMAR">Seguimiento</option>
              <option value="NO CONTESTA">No Contesta</option>
              <option value="SALVADA">Salvada</option>
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGestiones.slice(0, 100).map((g, i) => {
                const Icon = canalIcons[g.canal] || Phone;
                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-xl border border-white/5 bg-card hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{g.cliente_nombre}</span>
                          <span className="text-[10px] text-muted-foreground">{g.cliente_cedula}</span>
                          <EstadoBadge estado={g.resultado} />
                        </div>
                        <p className="text-sm text-muted-foreground">{g.comentario}</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Icon className="w-3 h-3" /> {g.canal}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(g.fecha)}</span>
                          <span>Por: {g.agente_nombre}</span>
                        </div>
                      </div>
                      
                      {/* Acciones Rápidas Operativas */}
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        <a
                          href={`/clientes/${g.cliente_id}`}
                          className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-400 flex items-center justify-center gap-1.5 transition-colors border border-indigo-500/20"
                        >
                          Abrir CRM
                        </a>
                        <a
                          href={getWhatsAppLink(null, generateAntiBotMessage(g.cliente_nombre, 0, g.resultado))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/20"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {filteredGestiones.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No se encontraron gestiones con los filtros actuales</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-white/5 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-400" />
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-bold block">Seleccionar Fecha del Reporte</label>
                <input 
                  type="date" 
                  value={fechaReporte}
                  onChange={(e) => setFechaReporte(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 mt-1"
                />
              </div>
            </div>
            <button
              onClick={exportToCSV}
              disabled={promesasReporte.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-glow-green"
            >
              <Download className="w-4 h-4" /> Exportar CSV para Sistema Externo
            </button>
          </div>

          <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3">Monto Promesa</th>
                  <th className="px-4 py-3">Fecha Promesa</th>
                  <th className="px-4 py-3">Gestor</th>
                  <th className="px-4 py-3">Comentario</th>
                </tr>
              </thead>
              <tbody>
                {promesasReporte.map((g) => (
                  <tr key={g.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors text-xs">
                    <td className="px-4 py-3 font-semibold text-white">{g.cliente_nombre}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{g.cliente_cedula || '-'}</td>
                    <td className="px-4 py-3 text-amber-400 font-bold">C$ {g.monto_promesa ? g.monto_promesa.toLocaleString() : 'N/A'}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{g.fecha_promesa || g.fecha}</td>
                    <td className="px-4 py-3 text-slate-400">{g.agente_nombre}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate" title={g.comentario || undefined}>{g.comentario}</td>
                  </tr>
                ))}
                {promesasReporte.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      No hay promesas de pago registradas para la fecha seleccionada ({fechaReporte}).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVA GESTIÓN */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 bg-slate-950/50 flex items-center justify-between">
                <h3 className="font-bold text-lg text-white flex items-center gap-2"><ClipboardList className="w-5 h-5 text-blue-400" /> Registrar Nueva Gestión</h3>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Cliente</label>
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Seleccione un cliente --</option>
                      {clientesList?.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.cedula || 'Sin Cédula'})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Canal de Contacto</label>
                    <select value={canal} onChange={(e) => setCanal(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none">
                      <option value="llamada">Llamada Telefónica</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="terreno">Visita en Terreno</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Resultado / Estado</label>
                    <select value={resultado} onChange={(e) => setResultado(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none">
                      <option value="PROMESA DE PAGO">Promesa de Pago</option>
                      <option value="REPROGRAMADO">Reprogramado</option>
                      <option value="VOLVER A LLAMAR">Volver a Llamar</option>
                      <option value="NO CONTESTA">No Contesta</option>
                      <option value="PAGARA HOY">Pagará Hoy</option>
                      <option value="SALVADA">Completado (Salvada)</option>
                    </select>
                  </div>

                  {['PROMESA DE PAGO', 'REPROGRAMADO', 'VOLVER A LLAMAR', 'PAGARA HOY', 'PAGARA SEMANA'].includes(resultado) && (
                    <>
                      <div>
                        <label className="text-xs text-emerald-400 block mb-1">Fecha Programada (Seguimiento)</label>
                        <input type="date" value={fechaPromesa} onChange={(e) => setFechaPromesa(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-amber-400 block mb-1">Monto de Promesa (C$)</label>
                        <input type="number" value={monto} onChange={(e) => setMonto(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-lg text-sm text-white focus:border-amber-500 focus:outline-none" />
                      </div>
                    </>
                  )}

                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Comentario / Notas (Obligatorio)</label>
                    <textarea 
                      rows={3} 
                      value={comentario} 
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Ingrese los detalles de la gestión..."
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-t border-white/5 bg-slate-950/50 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-colors">Cancelar</button>
                <button
                  onClick={handleSaveGestion}
                  disabled={saving || !clienteId || !comentario}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-glow-blue"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar Gestión'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
