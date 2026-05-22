'use client';

import { useMemo, useState } from 'react';
import { useProximasPromesas } from '@/hooks/useDashboard';
import { useCampanias } from '@/hooks/useCampanias';
import { formatCurrency, formatDate, getEstadoColor } from '@/lib/utils/index';
import { WhatsAppButton } from '@/components/clientes/WhatsAppButton';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalIcon, X, Search, Filter, 
  User, RefreshCw, AlertCircle, Trash2, CheckCircle2, DollarSign, ArrowRight 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { generateAntiBotMessage, getWhatsAppLink } from '@/lib/utils/whatsappGenerator';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const supabase = createClient();

export default function CalendarioPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: promesas, isLoading } = useProximasPromesas();
  const { data: campanas } = useCampanias();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filtros locales
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampana, setSelectedCampana] = useState('');
  const [selectedBucket, setSelectedBucket] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');

  // Control del Popup
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Formulario de edición rápida
  const [editFecha, setEditFecha] = useState('');
  const [editMonto, setEditMonto] = useState(0);
  const [editEstado, setEditEstado] = useState('');
  const [editAgente, setEditAgente] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // --- Modal de Nuevo Evento ---
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventCliente, setNewEventCliente] = useState('');
  const [newEventFecha, setNewEventFecha] = useState('');
  const [newEventMonto, setNewEventMonto] = useState(0);
  const [newEventEstado, setNewEventEstado] = useState('PROMESA DE PAGO');
  const [newEventAgente, setNewEventAgente] = useState('');

  // Cargar clientes para el select de Nuevo Evento
  const { data: clientesList } = useQuery({
    queryKey: ['clientes_list_basic'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nombre, cedula, agente_id').order('nombre');
      return data;
    }
  });

  // Cargar todos los agentes disponibles para el selector
  const { data: agents } = useQuery({
    queryKey: ['profiles', 'agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Filtrar promesas según los filtros del encabezado
  const filteredPromesas = useMemo(() => {
    if (!promesas) return [];
    return promesas.filter((p) => {
      const matchesSearch = searchTerm === '' || 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cedula && p.cedula.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCampana = selectedCampana === '' || p.bucket === parseInt(selectedCampana); // Campaña mapeada
      const matchesBucket = selectedBucket === '' || p.bucket === parseInt(selectedBucket);
      const matchesAgent = selectedAgent === '' || p.agente_id === selectedAgent;
      const matchesEstado = selectedEstado === '' || p.estado === selectedEstado;

      return matchesSearch && matchesBucket && matchesAgent && matchesEstado;
    });
  }, [promesas, searchTerm, selectedCampana, selectedBucket, selectedAgent, selectedEstado]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ day: number | null; dateStr: string | null; promesas: typeof filteredPromesas }> = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, dateStr: null, promesas: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayPromesas = filteredPromesas.filter((p) => p.fecha_promesa === dateStr);
      days.push({ day: d, dateStr, promesas: dayPromesas });
    }

    return days;
  }, [year, month, filteredPromesas]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Mutación para actualizar un compromiso o gestión de cliente
  const updateCommitmentMutation = useMutation({
    mutationFn: async (vars: { 
      id: string; 
      fecha_promesa: string | null; 
      monto_promesa: number | null; 
      estado: string; 
      agente_id: string | null;
      agente_anterior_id: string | null;
    }) => {
      // 1. Actualizar el cliente
      const { error: clientError } = await supabase
        .from('clientes')
        .update({
          fecha_promesa: vars.fecha_promesa,
          monto_promesa: vars.monto_promesa,
          estado: vars.estado,
          agente_id: vars.agente_id,
          promesa_pago: vars.fecha_promesa !== null,
          updated_at: new Date().toISOString()
        })
        .eq('id', vars.id);

      if (clientError) throw clientError;

      // 2. Registrar en auditoría de asignación si cambió de agente
      if (vars.agente_id !== vars.agente_anterior_id) {
        await supabase
          .from('assignment_history')
          .insert({
            cliente_id: vars.id,
            agente_anterior_id: vars.agente_anterior_id || null,
            nuevo_agente_id: vars.agente_id || null,
            usuario_modificador_id: user?.id || null,
            motivo: 'Reasignado desde el módulo de Calendario'
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'promesas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Cerrar edición y refrescar lista del día
      setEditingEventId(null);
      if (selectedDateStr) {
        // Encontrar de nuevo las promesas frescas para ese día
        setTimeout(async () => {
          const { data } = await supabase
            .from('v_promesas_proximas')
            .select('*');
          if (data) {
            const fresh = data.filter((p: any) => p.fecha_promesa === selectedDateStr);
            setSelectedDayEvents(fresh);
          }
        }, 300);
      }
    }
  });

  const handleDayClick = (dateStr: string, dayEvents: any[]) => {
    setSelectedDateStr(dateStr);
    setSelectedDayEvents(dayEvents);
    setEditingEventId(null);
  };

  const startEditEvent = (event: any) => {
    setEditingEventId(event.id);
    setEditFecha(event.fecha_promesa || '');
    setEditMonto(event.monto_promesa || 0);
    setEditEstado(event.estado || 'NO CONTESTA');
    setEditAgente(event.agente_id || '');
  };

  const handleSaveEvent = async (event: any) => {
    setSaveLoading(true);
    try {
      await updateCommitmentMutation.mutateAsync({
        id: event.id,
        fecha_promesa: editFecha === '' ? null : editFecha,
        monto_promesa: editMonto === 0 ? null : editMonto,
        estado: editEstado,
        agente_id: editAgente === '' ? null : editAgente,
        agente_anterior_id: event.agente_id || null
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteEventCommitment = async (event: any) => {
    if (!window.confirm(`¿Desea eliminar la promesa de pago y el seguimiento de ${event.nombre}?`)) return;
    try {
      await updateCommitmentMutation.mutateAsync({
        id: event.id,
        fecha_promesa: null,
        monto_promesa: null,
        estado: 'NO CONTESTA', // Regresa a estado base
        agente_id: event.agente_id || null,
        agente_anterior_id: event.agente_id || null
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Función para determinar prioridad financiera automática
  const getPriorityBadge = (monto: number) => {
    if (monto >= 50000) return { label: 'Crítico (C$ 50k+)', styles: 'bg-red-500/10 text-red-400 border border-red-500/20' };
    if (monto >= 20000) return { label: 'Alto (C$ 20k+)', styles: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
    return { label: 'Estándar', styles: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' };
  };

  const getEventStyle = (estado: string) => {
    if (['PAGARA HOY', 'URGENTE'].includes(estado)) return 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20';
    if (['VOLVER A LLAMAR', 'REPROGRAMADO'].includes(estado)) return 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/20';
    if (estado === 'SALVADA') return 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20';
    return 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20'; // PROMESA DE PAGO
  };

  const getEventIcon = (estado: string) => {
    if (['PAGARA HOY', 'URGENTE'].includes(estado)) return '🔥';
    if (['VOLVER A LLAMAR', 'REPROGRAMADO'].includes(estado)) return '📞';
    if (estado === 'SALVADA') return '✅';
    return '💰';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Calendario Inteligente</h1>
          <p className="text-sm text-muted-foreground">Promesas de pago, llamadas y actividades de cobro automatizadas</p>
        </div>
        <button
          onClick={() => setShowNewEventModal(true)}
          className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-glow-blue"
        >
          <CalIcon className="w-4 h-4" /> Nuevo Evento
        </button>
      </motion.div>

      {/* Barra de Filtros Avanzada */}
      <div className="p-4 rounded-xl border border-white/5 bg-card flex flex-col md:flex-row md:items-center gap-4">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por cliente o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* selectores */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bucket */}
          <select
            value={selectedBucket}
            onChange={(e) => setSelectedBucket(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950 [&>option]:text-white"
          >
            <option value="">Todos los Buckets</option>
            <option value="5">Bucket 5</option>
            <option value="6">Bucket 6</option>
          </select>

          {/* Gestor */}
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950 [&>option]:text-white"
          >
            <option value="">Todos los Gestores</option>
            {agents?.map((a) => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>

          {/* Estado */}
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950 [&>option]:text-white"
          >
            <option value="">Todos los Estados</option>
            <option value="PROMESA DE PAGO">Promesa de Pago</option>
            <option value="REPROGRAMADO">Reprogramado</option>
            <option value="VOLVER A LLAMAR">Volver a Llamar</option>
            <option value="PAGARA HOY">Pagará Hoy</option>
            <option value="PAGARA SEMANA">Pagará Semana</option>
            <option value="SALVADA">Salvada</option>
          </select>

          {/* Botón Limpiar */}
          {(searchTerm || selectedBucket || selectedAgent || selectedEstado) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBucket('');
                setSelectedAgent('');
                setSelectedEstado('');
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-white">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
        {/* Header col-days */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.01]">
          {DAYS.map((d) => (
            <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, i) => (
            <div
              key={i}
              onClick={() => cell.day && handleDayClick(cell.dateStr!, cell.promesas)}
              className={`min-h-[110px] p-2 border-b border-r border-white/[0.03] flex flex-col justify-between transition-colors ${
                cell.day ? 'hover:bg-white/[0.02] cursor-pointer' : 'bg-white/[0.005]'
              }`}
            >
              {cell.day ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isToday(cell.day) ? 'bg-blue-600 text-white font-extrabold shadow' : 'text-muted-foreground'
                    }`}>
                      {cell.day}
                    </span>
                    {cell.promesas.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-glow" />
                    )}
                  </div>

                  {/* Listado en Miniatura */}
                  <div className="mt-1 space-y-0.5 flex-1 flex flex-col justify-end overflow-hidden">
                    {cell.promesas.slice(0, 3).map((p) => {
                      const isCall = ['VOLVER A LLAMAR', 'REPROGRAMADO'].includes(p.estado);
                      return (
                        <div
                          key={p.id}
                          className={`text-[8.5px] px-1 py-0.5 rounded truncate font-medium flex items-center gap-0.5 transition-colors border ${getEventStyle(p.estado)}`}
                          title={`${p.nombre}: ${p.estado} - ${formatCurrency(p.monto_promesa)}`}
                        >
                          <span>{getEventIcon(p.estado)}</span>
                          <span className="truncate">{p.nombre.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                    {cell.promesas.length > 3 && (
                      <span className="text-[8px] text-muted-foreground font-semibold">+ {cell.promesas.length - 3} más</span>
                    )}
                  </div>
                </>
              ) : (
                <div />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Listado de Próximos Seguimientos */}
      <div className="rounded-xl border border-white/5 bg-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-white">
          <CalIcon className="w-4 h-4 text-blue-400" />
          Próximos Seguimientos y Compromisos
        </h3>
        <div className="space-y-2">
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)
          ) : promesas?.length ? (
            promesas.slice(0, 6).map((p) => {
              const isCall = ['VOLVER A LLAMAR', 'REPROGRAMADO'].includes(p.estado);
              const waLink = getWhatsAppLink(p.whatsapp || p.telefono, generateAntiBotMessage(p.nombre, p.monto_promesa || 0, p.estado));

              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{p.nombre}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getEventStyle(p.estado)}`}>
                        {p.estado}
                      </span>
                      <span className="text-[9px] font-semibold bg-white/5 text-muted-foreground px-1.5 py-0.5 rounded">
                        B{p.bucket}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{formatDate(p.fecha_promesa)} — Gestor: {p.agente_nombre || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {!isCall && (
                      <span className="text-sm font-bold text-amber-400">{formatCurrency(p.monto_promesa)}</span>
                    )}
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all duration-300"
                    >
                      Recordatorio
                    </a>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay promesas ni seguimientos próximos</p>
          )}
        </div>
      </div>

      {/* POPUP / MODAL CENTRADO AVANZADO (AnimatePresence) */}
      <AnimatePresence>
        {selectedDateStr && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop con desenfoque profesional */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDateStr(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Centrado */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-950/50">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <CalIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    Agenda Operativa — {formatDate(selectedDateStr)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 ml-12">Visualizando {selectedDayEvents.length} gestiones programadas</p>
                </div>
                <button
                  onClick={() => setSelectedDateStr(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Event list - Scroll Interno */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-950/30 scrollbar-thin">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {selectedDayEvents.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                      <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-xl font-bold text-white mb-1">Día Libre de Gestiones</p>
                      <p className="text-sm text-muted-foreground">No existen eventos ni compromisos programados para esta fecha.</p>
                    </div>
                  ) : (
                    selectedDayEvents.map((event) => {
                      const isCall = ['VOLVER A LLAMAR', 'REPROGRAMADO'].includes(event.estado);
                      const prio = getPriorityBadge(event.monto_promesa || 0);
                      const isEditing = editingEventId === event.id;
                      const waLink = getWhatsAppLink(event.whatsapp || event.telefono, generateAntiBotMessage(event.nombre, event.monto_promesa || 0, event.estado));

                      return (
                        <div
                          key={event.id}
                          className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col bg-card shadow-lg ${
                            isEditing ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'border-white/5 hover:border-white/20'
                          }`}
                        >
                          {/* Cabecera del Evento */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-bold text-white text-base flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                {event.nombre}
                              </h4>
                              <p className="text-xs text-muted-foreground ml-6 mt-0.5 font-mono">ID: {event.cedula || 'N/A'}</p>
                            </div>
                            <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-lg ${prio.styles}`}>
                              {prio.label}
                            </span>
                          </div>

                          {/* Detalles (Grid) */}
                          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground bg-black/20 p-3 rounded-xl border border-white/5 mb-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase font-bold text-slate-500">Campaña / Bucket</span>
                              <span className="text-white font-medium">B{event.bucket}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase font-bold text-slate-500">Estado Actual</span>
                              <span className={`font-bold ${getEstadoColor(event.estado)}`}>{event.estado}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase font-bold text-slate-500">Gestor Asignado</span>
                              <span className="text-white font-medium flex items-center gap-1">
                                {event.agente_nombre || 'Sin asignar'}
                              </span>
                            </div>
                            {!isCall && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Capital Prometido</span>
                                <span className="text-amber-400 font-bold text-sm">{formatCurrency(event.monto_promesa)}</span>
                              </div>
                            )}
                          </div>

                          {/* Modificador rápido inline */}
                          {isEditing ? (
                            <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/30 space-y-4 shadow-inner mt-auto">
                              <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5" /> Reagendar / Modificar
                              </h5>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Nueva Fecha</label>
                                  <input
                                    type="date"
                                    value={editFecha}
                                    onChange={(e) => setEditFecha(e.target.value)}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Nuevo Monto (C$)</label>
                                  <input
                                    type="number"
                                    value={editMonto}
                                    onChange={(e) => setEditMonto(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Actualizar Estado</label>
                                  <select
                                    value={editEstado}
                                    onChange={(e) => setEditEstado(e.target.value)}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 [&>option]:bg-slate-900"
                                  >
                                    <option value="PROMESA DE PAGO">Promesa de Pago</option>
                                    <option value="REPROGRAMADO">Reprogramado</option>
                                    <option value="VOLVER A LLAMAR">Volver a Llamar</option>
                                    <option value="PAGARA HOY">Pagará Hoy</option>
                                    <option value="PAGARA SEMANA">Pagará Semana</option>
                                    <option value="SALVADA">Salvada</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Reasignar Agente</label>
                                  <select
                                    value={editAgente}
                                    onChange={(e) => setEditAgente(e.target.value)}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 [&>option]:bg-slate-900"
                                  >
                                    <option value="">Sin asignar</option>
                                    {agents?.map((a) => (
                                      <option key={a.id} value={a.id}>{a.full_name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                                <button
                                  onClick={() => setEditingEventId(null)}
                                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSaveEvent(event)}
                                  disabled={saveLoading}
                                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-glow-blue disabled:opacity-50"
                                >
                                  {saveLoading ? 'Guardando...' : 'Confirmar Cambios'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Menú de Acciones Rápidas Inferior */
                            <div className="flex flex-wrap items-center gap-2 mt-auto">
                              <button
                                onClick={() => startEditEvent(event)}
                                className="flex-1 justify-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-colors border border-white/5"
                              >
                                Editar / Reagendar
                              </button>
                              
                              <a
                                href={`/clientes/${event.id}`}
                                className="px-3 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-400 flex items-center gap-1.5 transition-colors border border-indigo-500/20"
                                title="Abrir CRM Operativo"
                              >
                                CRM
                              </a>

                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-1.5 transition-colors border border-emerald-500/20"
                                title="Enviar WhatsApp Inteligente"
                              >
                                WhatsApp
                              </a>
                              
                              <button
                                onClick={() => {
                                  if (window.confirm(`¿Desea marcar como completada con éxito la gestión de ${event.nombre}?`)) {
                                    updateCommitmentMutation.mutate({
                                      id: event.id,
                                      fecha_promesa: null,
                                      monto_promesa: null,
                                      estado: 'SALVADA',
                                      agente_id: event.agente_id || null,
                                      agente_anterior_id: event.agente_id || null
                                    });
                                  }
                                }}
                                className="px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-1.5 transition-colors border border-emerald-500/20"
                                title="Marcar como éxito (Salvada)"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteEventCommitment(event)}
                                className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 transition-colors border border-red-500/20"
                                title="Eliminar seguimiento permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CREAR NUEVO EVENTO */}
      <AnimatePresence>
        {showNewEventModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNewEventModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 bg-slate-950/50 flex items-center justify-between">
                <h3 className="font-bold text-lg text-white flex items-center gap-2"><CalIcon className="w-5 h-5 text-blue-400" /> Crear Nuevo Evento de Seguimiento</h3>
                <button onClick={() => setShowNewEventModal(false)} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Buscar y Seleccionar Cliente</label>
                    <select
                      value={newEventCliente}
                      onChange={(e) => {
                        setNewEventCliente(e.target.value);
                        // Autoasignar el agente si el cliente ya tiene uno
                        const client = clientesList?.find(c => c.id === e.target.value);
                        if (client && client.agente_id) setNewEventAgente(client.agente_id);
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Seleccione un cliente --</option>
                      {clientesList?.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.cedula || 'Sin Cédula'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Fecha Programada</label>
                    <input type="date" value={newEventFecha} onChange={(e) => setNewEventFecha(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Estado / Tipo de Evento</label>
                    <select value={newEventEstado} onChange={(e) => setNewEventEstado(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none">
                      <option value="PROMESA DE PAGO">Promesa de Pago</option>
                      <option value="REPROGRAMADO">Reprogramado</option>
                      <option value="VOLVER A LLAMAR">Volver a Llamar</option>
                      <option value="PAGARA HOY">Pagará Hoy</option>
                      <option value="PAGARA SEMANA">Pagará Semana</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Capital Prometido (Si aplica)</label>
                    <input type="number" value={newEventMonto} onChange={(e) => setNewEventMonto(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Gestor Asignado</label>
                    <select value={newEventAgente} onChange={(e) => setNewEventAgente(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none">
                      <option value="">Sin asignar (Global)</option>
                      {agents?.map((a) => (
                        <option key={a.id} value={a.id}>{a.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-white/5 bg-slate-950/50 flex justify-end gap-3">
                <button onClick={() => setShowNewEventModal(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-colors">Cancelar</button>
                <button
                  onClick={async () => {
                    if (!newEventCliente || !newEventFecha) return alert('Seleccione un cliente y una fecha.');
                    setSaveLoading(true);
                    try {
                      await updateCommitmentMutation.mutateAsync({
                        id: newEventCliente,
                        fecha_promesa: newEventFecha,
                        monto_promesa: newEventMonto,
                        estado: newEventEstado,
                        agente_id: newEventAgente || null,
                        agente_anterior_id: null // simplificado
                      });
                      setShowNewEventModal(false);
                      setNewEventCliente(''); setNewEventFecha(''); setNewEventMonto(0);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setSaveLoading(false);
                    }
                  }}
                  disabled={saveLoading || !newEventCliente || !newEventFecha}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-glow-blue"
                >
                  {saveLoading ? 'Guardando...' : 'Programar Evento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
