'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useCampanias } from '@/hooks/useCampanias';
import { formatCurrency, formatNumber } from '@/lib/utils/index';
import { 
  Users, UserCog, UserCheck, Shield, RefreshCw, Loader2, ArrowRightLeft, 
  ToggleLeft, ToggleRight, Sparkles, Trophy, Award, TrendingUp, AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

const supabase = createClient();

export default function AgentesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: campanas } = useCampanias();

  // Estados locales para formularios
  const [sourceAgent, setSourceAgent] = useState('');
  const [targetAgent, setTargetAgent] = useState('');
  const [reassignCampana, setReassignCampana] = useState('');
  const [reassignBucket, setReassignBucket] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Estados para Round-Robin
  const [rrCampana, setRrCampana] = useState('');
  const [rrBucket, setRrBucket] = useState('');
  const [rrLoading, setRrLoading] = useState(false);

  // 1. Cargar todos los agentes y su desempeño desde profiles
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents_performance'],
    queryFn: async () => {
      // Obtener perfiles de rol AGENTE
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'AGENTE')
        .eq('is_active', true);
      
      if (error) throw error;

      // Para cada gestor, calcular capital asignado, recuperado y recup % en base a la vista de clientes
      const { data: clients } = await supabase
        .from('clientes')
        .select('id, capital, monto_recuperado, agente_id, bucket');

      const performance = profiles.map((agent) => {
        const agentClients = clients?.filter((c) => c.agente_id === agent.id) || [];
        const totalCapital = agentClients.reduce((acc, c) => acc + (c.capital || 0), 0);
        const totalRecuperado = agentClients.reduce((acc, c) => acc + (c.monto_recuperado || 0), 0);
        
        // Tasa de recuperación
        const recPct = totalCapital > 0 ? Math.round((totalRecuperado / totalCapital) * 100) : 0;

        return {
          ...agent,
          totalClientes: agentClients.length,
          totalCapital,
          totalRecuperado,
          recPct
        };
      });

      // Ordenar por ranking de tasa de recuperación
      return performance.sort((a, b) => b.recPct - a.recPct);
    }
  });

  // 2. Cargar historial de auditoría de asignaciones recientes
  const { data: auditLogs, isLoading: loadingAudits } = useQuery({
    queryKey: ['assignment_audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_history')
        .select(`
          id,
          created_at,
          motivo,
          clientes (
            nombre,
            id_cliente
          ),
          agente_anterior:agente_anterior_id (
            full_name
          ),
          nuevo_agente:nuevo_agent_id (
            full_name
          ),
          usuario_modificador:usuario_modificador_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        // Si hay error porque el helper select falló por alias, traer normal y mapear
        const { data: dataRaw, error: rawError } = await supabase
          .from('assignment_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15);
        if (rawError) throw rawError;
        return dataRaw;
      }
      return data;
    }
  });

  // Mutación para alternar disponibilidad del agente
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (vars: { id: string; current: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ disponibilidad: !vars.current })
        .eq('id', vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents_performance'] });
    }
  });

  // Ejecutar Reasignación Manual en Lote (Bulk Reassign)
  const handleBulkReassign = async () => {
    if (!sourceAgent || !targetAgent) {
      alert('Debe seleccionar el agente origen y el agente destino.');
      return;
    }
    if (sourceAgent === targetAgent) {
      alert('El agente origen y el agente destino no pueden ser el mismo.');
      return;
    }

    setManualLoading(true);

    try {
      // 1. Buscar clientes que correspondan a los filtros
      let query = supabase
        .from('clientes')
        .select('id, agente_id')
        .eq('agente_id', sourceAgent);

      if (reassignCampana) {
        query = query.eq('campana_id', reassignCampana);
      }
      if (reassignBucket) {
        query = query.eq('bucket', parseInt(reassignBucket));
      }

      const { data: matchedClients, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      if (!matchedClients || matchedClients.length === 0) {
        alert('No se encontraron clientes asociados al agente origen con los filtros especificados.');
        setManualLoading(false);
        return;
      }

      const clientIds = matchedClients.map((c) => c.id);

      // 2. Actualizar en lote a los clientes
      const { error: updateErr } = await supabase
        .from('clientes')
        .update({ agente_id: targetAgent, updated_at: new Date().toISOString() })
        .in('id', clientIds);

      if (updateErr) throw updateErr;

      // 3. Registrar auditoría por cada reasignación en lote
      const auditInserts = clientIds.map((cId) => ({
        cliente_id: cId,
        agente_anterior_id: sourceAgent,
        nuevo_agente_id: targetAgent,
        usuario_modificador_id: user?.id || null,
        motivo: `Reasignación masiva en bloque. Campaña: ${reassignCampana || 'Todas'}, Bucket: ${reassignBucket || 'Todos'}`
      }));

      await supabase.from('assignment_history').insert(auditInserts);

      alert(`¡Reasignación completada! Se transfirieron ${clientIds.length} clientes al nuevo gestor.`);
      
      // Limpiar filtros
      setSourceAgent('');
      setTargetAgent('');
      setReassignCampana('');
      setReassignBucket('');

      // Refrescar vistas
      queryClient.invalidateQueries({ queryKey: ['agents_performance'] });
      queryClient.invalidateQueries({ queryKey: ['assignment_audit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(`Error al procesar reasignación masiva: ${err.message}`);
    } finally {
      setManualLoading(false);
    }
  };

  // Balanceo Round-Robin Equitativo Automático
  const handleRoundRobinBalancing = async () => {
    if (!rrCampana) {
      alert('Debe seleccionar la campaña que desea balancear de forma Round-Robin.');
      return;
    }

    setRrLoading(true);

    try {
      // 1. Obtener agentes disponibles para Round-Robin (disponibilidad = true)
      const { data: availableAgents, error: agentsErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'AGENTE')
        .eq('disponibilidad', true)
        .eq('is_active', true);

      if (agentsErr) throw agentsErr;

      if (!availableAgents || availableAgents.length === 0) {
        alert('No hay agentes activos marcados con "Disponibilidad = Activa" para balancear la carga.');
        setRrLoading(false);
        return;
      }

      // 2. Obtener clientes pertenecientes a la campaña y bucket correspondientes
      let query = supabase
        .from('clientes')
        .select('id, agente_id')
        .eq('campana_id', rrCampana);

      if (rrBucket) {
        query = query.eq('bucket', parseInt(rrBucket));
      }

      const { data: campaignClients, error: clientsErr } = await query;
      if (clientsErr) throw clientsErr;

      if (!campaignClients || campaignClients.length === 0) {
        alert('No se encontraron clientes en esta campaña para redistribuir.');
        setRrLoading(false);
        return;
      }

      // 3. Algoritmo Round-Robin de Distribución Balanceada
      let agentIndex = 0;
      const updates = [];

      for (const client of campaignClients) {
        const assignedAgent = availableAgents[agentIndex];
        
        // Solo actualizar y auditar si el agente asignado cambia
        if (client.agente_id !== assignedAgent.id) {
          updates.push({
            id: client.id,
            agente_anterior: client.agente_id,
            nuevo_agente: assignedAgent.id
          });
        }

        // Siguiente agente circular
        agentIndex = (agentIndex + 1) % availableAgents.length;
      }

      if (updates.length === 0) {
        alert('La cartera ya está perfectamente distribuida y balanceada entre los gestores.');
        setRrLoading(false);
        return;
      }

      // 4. Aplicar actualizaciones en lote y escribir auditoría
      for (const update of updates) {
        await supabase
          .from('clientes')
          .update({ agente_id: update.nuevo_agente, updated_at: new Date().toISOString() })
          .eq('id', update.id);

        await supabase
          .from('assignment_history')
          .insert({
            cliente_id: update.id,
            agente_anterior_id: update.agente_anterior || null,
            nuevo_agente_id: update.nuevo_agente,
            usuario_modificador_id: user?.id || null,
            motivo: `Distribución Round-Robin Automática. Campaña: ${rrCampana}, Bucket: ${rrBucket || 'Todos'}`
          });
      }

      alert(`¡Balanceo Completado con éxito! Se re-balancearon equitativamente ${updates.length} clientes entre ${availableAgents.length} gestores.`);
      
      // Limpiar filtros
      setRrCampana('');
      setRrBucket('');

      // Refrescar
      queryClient.invalidateQueries({ queryKey: ['agents_performance'] });
      queryClient.invalidateQueries({ queryKey: ['assignment_audit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(`Error al ejecutar Round-Robin: ${err.message}`);
    } finally {
      setRrLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Gestión de Agentes y Carga</h1>
          <p className="text-sm text-muted-foreground">Supervise el desempeño, reasigne carteras de clientes y balancee cargas de forma equitativa (Round-Robin)</p>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['agents_performance'] });
            queryClient.invalidateQueries({ queryKey: ['assignment_audit_logs'] });
          }}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Recargar
        </button>
      </motion.div>

      {/* 1. Ranking y Desempeño */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/5 bg-card p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
              Ranking de Cobradores y Desempeño
            </h3>

            {loadingAgents ? (
              <div className="p-8 text-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" /></div>
            ) : !agents || agents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay agentes activos registrados en la plataforma.</p>
            ) : (
              <div className="space-y-3">
                {agents.map((agent: any, idx: number) => {
                  // Definir metas de cosecha para comparar
                  const isTop = idx === 0;

                  return (
                    <div 
                      key={agent.id} 
                      className={`p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-colors flex items-center justify-between gap-4`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-muted-foreground'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-white flex items-center gap-1.5">
                            {agent.full_name}
                            {isTop && <Award className="w-4 h-4 text-amber-400" />}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Código: {agent.codigo || 'AGENT-01'} — {agent.totalClientes} Clientes Asignados</p>
                        </div>
                      </div>

                      {/* Info Financiera */}
                      <div className="text-right space-y-1">
                        <p className="text-[10px] text-muted-foreground">Cartera: <span className="font-bold text-white">{formatCurrency(agent.totalCapital)}</span></p>
                        <p className="text-[10px] text-muted-foreground">Recuperado: <span className="font-bold text-emerald-400">{formatCurrency(agent.totalRecuperado)}</span></p>
                      </div>

                      {/* Tasa Recuperación vs Cosechas Target */}
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm font-extrabold text-blue-400">{agent.recPct}%</p>
                          <p className="text-[9px] text-muted-foreground font-semibold">Tasa Recup.</p>
                        </div>

                        {/* Switch de disponibilidad */}
                        <div className="border-l border-white/10 pl-4 text-center">
                          <button
                            onClick={() => toggleAvailabilityMutation.mutate({ id: agent.id, current: agent.disponibilidad })}
                            className="focus:outline-none transition-transform active:scale-90"
                            title="Alternar disponibilidad para asignación Round-Robin"
                          >
                            {agent.disponibilidad ? (
                              <div className="flex flex-col items-center">
                                <ToggleRight className="w-6 h-6 text-emerald-400" />
                                <span className="text-[8px] text-emerald-500 font-extrabold">DISPONIBLE</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                                <span className="text-[8px] text-muted-foreground font-semibold">PAUSADO</span>
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. Metas e Indicadores de Cosecha */}
        <div className="space-y-6">
          <div className="p-5 rounded-xl border border-white/5 bg-card">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-blue-400" /> Metas Oficiales de Recuperación</h3>
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-600/5 border border-blue-500/15 rounded-lg space-y-1">
                <p className="font-bold text-blue-400">Bucket 5 (Mora Temprana)</p>
                <ul className="list-disc pl-4 text-muted-foreground text-[11px] space-y-0.5">
                  <li>5ª Cosecha: <span className="text-white font-bold">53%</span> salvado</li>
                  <li>4ª Cosecha: <span className="text-white font-bold">45%</span> salvado</li>
                  <li>3ª Cosecha: <span className="text-white font-bold">39%</span> salvado</li>
                </ul>
              </div>

              <div className="p-3 bg-cyan-600/5 border border-cyan-500/15 rounded-lg space-y-1">
                <p className="font-bold text-cyan-400">Bucket 6 (Mora Avanzada)</p>
                <ul className="list-disc pl-4 text-muted-foreground text-[11px] space-y-0.5">
                  <li>5ª Cosecha: <span className="text-white font-bold">50%</span> salvado</li>
                  <li>4ª Cosecha: <span className="text-white font-bold">45%</span> salvado</li>
                  <li>3ª Cosecha: <span className="text-white font-bold">34%</span> salvado</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Panel de Reasignaciones (Manual y Automática) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reasignación Manual en Bloque */}
        <div className="p-6 rounded-xl border border-white/5 bg-card space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            Transferencia de Carteras Manual
          </h3>
          <p className="text-xs text-muted-foreground">Transfiera carteras completas de clientes de un gestor a otro, filtrando opcionalmente por campaña y bucket.</p>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              {/* Origen */}
              <div>
                <label className="block text-muted-foreground mb-1">Agente Origen</label>
                <select
                  value={sourceAgent}
                  onChange={(e) => setSourceAgent(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950"
                >
                  <option value="">Seleccione Origen</option>
                  {agents?.map((a) => (
                    <option key={a.id} value={a.id}>{a.full_name} ({a.totalClientes} cl.)</option>
                  ))}
                </select>
              </div>

              {/* Destino */}
              <div>
                <label className="block text-muted-foreground mb-1">Agente Destino</label>
                <select
                  value={targetAgent}
                  onChange={(e) => setTargetAgent(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950"
                >
                  <option value="">Seleccione Destino</option>
                  {agents?.map((a) => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Filtro Campaña */}
              <div>
                <label className="block text-muted-foreground mb-1">Campaña (Opcional)</label>
                <select
                  value={reassignCampana}
                  onChange={(e) => setReassignCampana(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950"
                >
                  <option value="">Todas las Campañas</option>
                  {campanas?.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Bucket */}
              <div>
                <label className="block text-muted-foreground mb-1">Bucket (Opcional)</label>
                <select
                  value={reassignBucket}
                  onChange={(e) => setReassignBucket(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950"
                >
                  <option value="">Todos los Buckets</option>
                  <option value="5">Bucket 5</option>
                  <option value="6">Bucket 6</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleBulkReassign}
              disabled={manualLoading || !sourceAgent || !targetAgent}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              {manualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              Ejecutar Reasignación Manual
            </button>
          </div>
        </div>

        {/* Balanceo Automático Round-Robin */}
        <div className="p-6 rounded-xl border border-white/5 bg-card space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Balanceo de Carga Round-Robin Automático
          </h3>
          <p className="text-xs text-muted-foreground">Distribuye de manera equitativa e inteligente la cartera de clientes de una campaña entre los agentes disponibles.</p>

          <div className="space-y-3 text-xs">
            {/* Campaña a balancear */}
            <div>
              <label className="block text-muted-foreground mb-1">Campaña para Distribuir</label>
              <select
                value={rrCampana}
                onChange={(e) => setRrCampana(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950"
              >
                <option value="">Seleccione Campaña</option>
                {campanas?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Bucket a balancear */}
            <div>
              <label className="block text-muted-foreground mb-1">Filtrar por Bucket</label>
              <select
                value={rrBucket}
                onChange={(e) => setRrBucket(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-slate-950"
              >
                <option value="">Todos los Buckets</option>
                <option value="5">Bucket 5</option>
                <option value="6">Bucket 6</option>
              </select>
            </div>

            <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground">El balanceo asignará los clientes de forma rotatoria secuencial únicamente a los gestores marcados como <span className="text-emerald-400 font-bold">DISPONIBLE</span> en la tabla de arriba.</p>
            </div>

            <button
              onClick={handleRoundRobinBalancing}
              disabled={rrLoading || !rrCampana}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-glow-purple"
            >
              {rrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Iniciar Distribución Equitativa (Round-Robin)
            </button>
          </div>
        </div>
      </div>

      {/* 4. Historial de Auditoría de Asignaciones */}
      <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/[0.01]">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-400" /> Historial de Asignaciones y Auditoría</h3>
        </div>

        {loadingAudits ? (
          <div className="p-6 text-center"><Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" /></div>
        ) : !auditLogs || auditLogs.length === 0 ? (
          <p className="p-6 text-xs text-muted-foreground text-center">No hay registros de auditoría de asignaciones recientes.</p>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 border-b border-white/5 text-muted-foreground font-bold">
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">Gestor Anterior</th>
                  <th className="px-4 py-2.5">Nuevo Gestor</th>
                  <th className="px-4 py-2.5">Modificador</th>
                  <th className="px-4 py-2.5">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(log.created_at).toLocaleString('es-NI')}</td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {log.clientes?.nombre || 'Cliente Modificado'}
                      <span className="block text-[10px] text-muted-foreground font-normal">ID: {log.clientes?.id_cliente || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-red-400 font-medium">{log.agente_anterior?.full_name || 'Sin asignación'}</td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">{log.nuevo_agente?.full_name || 'Sin asignación'}</td>
                    <td className="px-4 py-3 text-white font-medium">{log.usuario_modificador?.full_name || 'Sistema'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[10px] italic max-w-xs truncate" title={log.motivo}>{log.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
