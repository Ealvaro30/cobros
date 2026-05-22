'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { motion } from 'framer-motion';
import type { Profile } from '@/types';
import { Shield, Users, UserCog, Loader2, Landmark, CheckCircle, Tag, HandCoins } from 'lucide-react';
import { EstadoManagementModal } from '@/components/admin/EstadoManagementModal';
import Link from 'next/link';

export default function AdminPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClient();
  const { user } = useAuthStore();
  
  const { rate, updateRate, isUpdating } = useExchangeRate();
  const [inputRate, setInputRate] = useState<string>('');
  const [rateSuccess, setRateSuccess] = useState(false);

  // Compliance Settings State
  const [compliance, setCompliance] = useState<Record<string, number>>({
    bucket_5_cosecha_5: 53, bucket_5_cosecha_4: 45, bucket_5_cosecha_3: 39,
    bucket_6_cosecha_5: 50, bucket_6_cosecha_4: 45, bucket_6_cosecha_3: 34,
  });
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [complianceSuccess, setComplianceSuccess] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);

  useEffect(() => {
    loadUsers();
    loadCompliance();
  }, []);

  useEffect(() => {
    if (rate) {
      setInputRate(String(rate));
    }
  }, [rate]);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  };

  const loadCompliance = async () => {
    const keys = [
      'bucket_5_cosecha_5', 'bucket_5_cosecha_4', 'bucket_5_cosecha_3',
      'bucket_6_cosecha_5', 'bucket_6_cosecha_4', 'bucket_6_cosecha_3'
    ];
    const { data } = await supabase.from('settings').select('*').in('key', keys);
    if (data && data.length > 0) {
      const newSettings = { ...compliance };
      data.forEach(s => { newSettings[s.key] = parseFloat(s.value) || 0; });
      setCompliance(newSettings);
    }
    setLoadingCompliance(false);
  };

  const saveCompliance = async () => {
    setSavingCompliance(true);
    const updates = Object.entries(compliance).map(([key, value]) => ({
      key,
      value: String(value),
      description: `Porcentaje de cumplimiento para ${key.replace(/_/g, ' ')}`
    }));

    const { error } = await supabase.from('settings').upsert(updates);
    setSavingCompliance(false);
    if (!error) {
      setComplianceSuccess(true);
      setTimeout(() => setComplianceSuccess(false), 3000);
    } else {
      alert("Error al guardar porcentajes: " + error.message);
    }
  };

  const updateRole = async (userId: string, role: string) => {
    setUpdating(userId);
    await supabase.from('profiles').update({ role }).eq('id', userId);
    await loadUsers();
    setUpdating(null);
  };

  const toggleActive = async (userId: string, active: boolean) => {
    setUpdating(userId);
    await supabase.from('profiles').update({ is_active: active }).eq('id', userId);
    await loadUsers();
    setUpdating(null);
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(inputRate);
    if (!isNaN(parsed) && parsed > 0) {
      await updateRate(parsed);
      setRateSuccess(true);
      setTimeout(() => setRateSuccess(false), 3000);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 mx-auto text-red-400 opacity-50" />
          <p className="text-lg font-semibold">Acceso Denegado</p>
          <p className="text-sm text-muted-foreground">Solo administradores pueden acceder a esta sección</p>
        </div>
      </div>
    );
  }

  const roleIcons: Record<string, typeof Shield> = { ADMIN: Shield, SUPERVISOR: UserCog, AGENTE: Users };
  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-500/10 text-red-400 border-red-500/20',
    SUPERVISOR: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    AGENTE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold gradient-text">Administración</h1>
        <p className="text-sm text-muted-foreground">Gestión de usuarios, roles y configuración global de la plataforma</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stats */}
        {['ADMIN', 'SUPERVISOR', 'AGENTE'].map((role) => {
          const count = users.filter((u) => u.role === role).length;
          const Icon = roleIcons[role];
          return (
            <div key={role} className="p-4 rounded-xl bg-card border border-white/5 text-center">
              <Icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{role}s</p>
            </div>
          );
        })}

        {/* Dynamic States Settings Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-violet-950/40 border border-indigo-500/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <Tag className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Estados</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium">Gestión de Estados de Clientes</p>
            <button
              onClick={() => setShowStateModal(true)}
              className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Configurar Estados
            </button>
          </div>
        </div>

        {/* Central Exchange Rate Settings Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-955/20 to-cyan-955/20 border border-blue-500/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <Landmark className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">Parámetro Global</span>
          </div>
          <form onSubmit={handleRateSubmit} className="space-y-2">
            <label className="text-xs text-slate-400 font-medium">Tasa Cambiaria (Córdobas a Dólares)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={inputRate}
                onChange={(e) => setInputRate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="36.62"
              />
              <button
                type="submit"
                disabled={isUpdating}
                className="px-3 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center min-w-[70px] disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
              </button>
            </div>
            {rateSuccess && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <CheckCircle className="w-3 h-3" /> Tipo de cambio guardado
              </motion.div>
            )}
          </form>
        </div>

        {/* Dynamic Commissions Link Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-teal-950/40 border border-emerald-500/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <HandCoins className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Comisiones</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium">Gestión de Tramos y Comisiones</p>
            <Link
              href="/admin/comisiones"
              className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Configurar Metas
            </Link>
          </div>
        </div>
      </div>

      {/* Compliance Settings Card */}
      <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Configuración de Cumplimiento por Bucket
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Defina los porcentajes meta de recuperación por cosecha. Estos valores sincronizan KPIs, Dashboards y Reportes de Campaña.</p>
          </div>
          <button
            onClick={saveCompliance}
            disabled={savingCompliance || loadingCompliance}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {savingCompliance ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
          </button>
        </div>
        
        {complianceSuccess && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
            <CheckCircle className="w-4 h-4" /> Configuración de cumplimiento actualizada con éxito para toda la plataforma.
          </div>
        )}

        {loadingCompliance ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
            {/* Bucket 5 */}
            <div className="p-5 space-y-4">
              <h4 className="text-sm font-bold text-blue-400 mb-3 border-b border-white/5 pb-2">Parámetros Bucket 5 (Mora Temprana)</h4>
              {[5, 4, 3].map((cosecha) => (
                <div key={`b5c${cosecha}`} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 font-medium">{cosecha}ª Cosecha</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="0" max="100" step="0.1"
                      value={compliance[`bucket_5_cosecha_${cosecha}`]} 
                      onChange={(e) => setCompliance(c => ({...c, [`bucket_5_cosecha_${cosecha}`]: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))}))}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-sm font-mono text-center focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-muted-foreground font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bucket 6 */}
            <div className="p-5 space-y-4">
              <h4 className="text-sm font-bold text-purple-400 mb-3 border-b border-white/5 pb-2">Parámetros Bucket 6 (Mora Avanzada)</h4>
              {[5, 4, 3].map((cosecha) => (
                <div key={`b6c${cosecha}`} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 font-medium">{cosecha}ª Cosecha</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="0" max="100" step="0.1"
                      value={compliance[`bucket_6_cosecha_${cosecha}`]} 
                      onChange={(e) => setCompliance(c => ({...c, [`bucket_6_cosecha_${cosecha}`]: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))}))}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-sm font-mono text-center focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-muted-foreground font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold">Usuarios del Sistema</h3>
          <span className="text-xs text-muted-foreground">Total: {users.length}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
                          {u.full_name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        disabled={u.id === user?.id}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border ${roleColors[u.role]} bg-slate-900 focus:outline-none disabled:opacity-50 [&>option]:bg-slate-950 [&>option]:text-white`}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPERVISOR">SUPERVISOR</option>
                        <option value="AGENTE">AGENTE</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => toggleActive(u.id, !u.is_active)}
                          disabled={updating === u.id}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline disabled:opacity-50"
                        >
                          {updating === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : u.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showStateModal && <EstadoManagementModal onClose={() => setShowStateModal(false)} />}
    </div>
  );
}
