'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Save, TrendingUp, Wallet, CheckCircle } from 'lucide-react';

export default function ComisionesAdminPage() {
  const [bucketMeta, setBucketMeta] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [bRes, cRes] = await Promise.all([
      fetch('/api/admin/bucket-meta'),
      fetch('/api/admin/commissions')
    ]);
    
    if (bRes.ok) setBucketMeta(await bRes.json());
    if (cRes.ok) setCommissions(await cRes.json());
    setLoading(false);
  };

  const handleBucketChange = (id: number, field: string, value: string) => {
    setBucketMeta(prev => prev.map(b => b.id === id ? { ...b, [field]: Number(value) } : b));
  };

  const handleCommissionChange = (id: number, field: string, value: string) => {
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, [field]: Number(value) } : c));
  };

  const handleSave = async () => {
    setSaving(true);
    // Para simplificar, guardamos usando un POST a un endpoint batch o individual
    // Aquí usamos llamadas individuales
    const bPromises = bucketMeta.map(b => fetch('/api/admin/bucket-meta', { method: 'POST', body: JSON.stringify(b) }));
    const cPromises = commissions.map(c => fetch('/api/admin/commissions', { method: 'POST', body: JSON.stringify(c) }));
    
    await Promise.all([...bPromises, ...cPromises]);
    
    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Metas y Comisiones</h1>
          <p className="text-sm text-muted-foreground">Configuración dinámica de tramos y comisiones para los gestores</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg flex items-center gap-2 font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Guardar Todo
        </button>
      </motion.div>

      {success && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          <p className="font-bold text-sm">Cambios guardados con éxito</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metas de Bucket */}
        <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold">Monto Meta Mínimo por Bucket (USD)</h2>
          </div>
          <div className="p-4 space-y-4">
            {bucketMeta.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-slate-900 border border-white/5 rounded-lg">
                <div>
                  <p className="font-bold text-slate-200">Bucket {b.bucket_number}</p>
                  <p className="text-xs text-muted-foreground">{b.bucket_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={b.threshold_usd}
                    onChange={(e) => handleBucketChange(b.id, 'threshold_usd', e.target.value)}
                    className="w-32 px-3 py-1.5 bg-black/50 border border-white/10 rounded-md focus:border-blue-500 text-right font-mono text-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comisiones */}
        <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold">Porcentaje de Comisión</h2>
          </div>
          <div className="p-4 space-y-4">
            {commissions.map(c => (
              <div key={c.id} className="p-3 bg-slate-900 border border-white/5 rounded-lg space-y-3">
                <div>
                  <p className="font-bold text-slate-200">{c.achievement_level}</p>
                  <p className="text-xs text-muted-foreground">Logro del agente</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Comisión Bucket 5</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" step="0.1"
                        value={c.bucket_5_rate}
                        onChange={(e) => handleCommissionChange(c.id, 'bucket_5_rate', e.target.value)}
                        className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-md focus:border-emerald-500 font-mono text-white"
                      />
                      <span className="text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Comisión Bucket 6</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" step="0.1"
                        value={c.bucket_6_rate}
                        onChange={(e) => handleCommissionChange(c.id, 'bucket_6_rate', e.target.value)}
                        className="w-full px-3 py-1.5 bg-black/50 border border-white/10 rounded-md focus:border-emerald-500 font-mono text-white"
                      />
                      <span className="text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
