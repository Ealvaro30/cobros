'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import {
  Loader2, Power, Settings, RefreshCw, Send,
  Trash2, Plus, Check, X, MessageSquare,
  Clock, FileText, FileSpreadsheet, Wifi, WifiOff
} from 'lucide-react';

export default function WhatsappConfigPage() {
  const [status, setStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await fetchStatus();

    const { data: configData } = await supabase.from('whatsapp_config').select('*').single();
    if (configData) setConfig(configData);

    const { data: recData } = await supabase
      .from('whatsapp_report_recipients')
      .select('*')
      .order('created_at', { ascending: false });
    if (recData) setRecipients(recData);

    setLoading(false);
  }, [fetchStatus, supabase]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = async () => {
    showToast('Reiniciando sesión WhatsApp...');
    await fetch('/api/admin/whatsapp/restart', { method: 'POST' });
    setTimeout(fetchStatus, 2000);
  };

  const handleTestReport = async () => {
    setTestingSend(true);
    showToast('Generando y enviando reporte de prueba...');
    try {
      const res = await fetch('/api/admin/whatsapp/test-report', { method: 'POST' });
      if (res.ok) {
        showToast('Reporte de prueba enviado exitosamente.', 'success');
      } else {
        showToast('Error al enviar reporte de prueba.', 'error');
      }
    } catch {
      showToast('Error de conexión con el servicio.', 'error');
    }
    setTestingSend(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase.from('whatsapp_config').update({
      schedule_time: config.schedule_time,
      send_excel: config.send_excel,
      send_pdf: config.send_pdf,
      send_summary: config.send_summary,
      is_active: config.is_active,
    }).eq('id', config.id);

    if (error) {
      showToast('Error al guardar configuración', 'error');
    } else {
      showToast('Configuración guardada exitosamente');
    }
    setSaving(false);
  };

  const addRecipient = async () => {
    if (!newRecipientPhone) return;
    const { data, error } = await supabase.from('whatsapp_report_recipients').insert({
      phone_number: newRecipientPhone,
      name: newRecipientName || null,
    }).select().single();

    if (!error && data) {
      setRecipients([data, ...recipients]);
      setNewRecipientPhone('');
      setNewRecipientName('');
      showToast('Destinatario agregado');
    } else {
      showToast('Error al agregar destinatario', 'error');
    }
  };

  const deleteRecipient = async (id: string) => {
    await supabase.from('whatsapp_report_recipients').delete().eq('id', id);
    setRecipients(recipients.filter(r => r.id !== id));
    showToast('Destinatario eliminado');
  };

  const toggleRecipient = async (id: string, active: boolean) => {
    await supabase.from('whatsapp_report_recipients').update({ is_active: active }).eq('id', id);
    setRecipients(recipients.map(r => r.id === id ? { ...r, is_active: active } : r));
  };

  if (loading && !config) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  const isConnected = status?.state === 'CONNECTED';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-20 right-4 left-4 sm:left-auto sm:w-auto z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl ${
            toast.type === 'success'
              ? 'bg-emerald-500/90 text-white backdrop-blur-xl'
              : 'bg-red-500/90 text-white backdrop-blur-xl'
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
              <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" />
              Configuración WhatsApp
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Gestión del bot, destinatarios y reportes automáticos
            </p>
          </div>
        </div>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Estado de Conexión */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-4 border-b border-white/5">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Power className="w-5 h-5 text-green-400" />
              Estado de Conexión
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Gestiona la sesión del bot de WhatsApp</p>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {/* Status indicator */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-green-400" />
                ) : (
                  <WifiOff className="w-5 h-5 text-amber-400" />
                )}
                <span className="text-sm font-medium">Estado:</span>
              </div>
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                isConnected
                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
              }`}>
                {status?.state || 'DESCONECTADO'}
              </span>
            </div>

            {/* QR Code */}
            {status?.qrCode && (
              <div className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl bg-white border border-white/10">
                <p className="text-sm text-slate-500 mb-3 font-medium">Escanea el QR para conectar</p>
                <img
                  src={status.qrCode}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg"
                />
              </div>
            )}

            {/* Restart Button */}
            <button
              onClick={handleRestart}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium transition-all active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" /> Reiniciar Sesión / Nuevo QR
            </button>
          </div>
        </motion.div>

        {/* Configuración Reporte Diario */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-4 border-b border-white/5">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configuración Reporte Diario
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ajustes de envío al final del día</p>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {config && (
              <>
                {/* Schedule Time */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Hora de Ejecución
                  </label>
                  <input
                    type="time"
                    value={config.schedule_time}
                    onChange={e => setConfig({ ...config, schedule_time: e.target.value })}
                    className="w-full px-4 py-3 min-h-[44px] bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-2">
                  {[
                    { key: 'send_excel', label: 'Enviar Excel Actualizado', icon: FileSpreadsheet, color: 'text-green-400' },
                    { key: 'send_pdf', label: 'Enviar PDF Resumen', icon: FileText, color: 'text-red-400' },
                    { key: 'send_summary', label: 'Enviar Resumen en Mensaje', icon: MessageSquare, color: 'text-blue-400' },
                    { key: 'is_active', label: 'Módulo de Reportes Activo', icon: Power, color: 'text-primary' },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-colors min-h-[44px]"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={config[key]}
                        onClick={() => setConfig({ ...config, [key]: !config[key] })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          config[key] ? 'bg-primary' : 'bg-white/20'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg ${
                            config[key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Guardar
                  </button>
                  <button
                    onClick={handleTestReport}
                    disabled={testingSend}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-white/10 border border-white/10 text-sm font-medium hover:bg-white/15 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {testingSend ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Probar Envío
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Destinatarios */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-white/5">
          <h2 className="text-base sm:text-lg font-semibold">Destinatarios de Reportes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Números de WhatsApp que recibirán el reporte diario
          </p>
        </div>
        <div className="p-4 sm:p-6">
          {/* Add form */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-6">
            <input
              placeholder="Nombre (ej. Juan Perez)"
              value={newRecipientName}
              onChange={e => setNewRecipientName(e.target.value)}
              className="flex-1 px-4 py-3 min-h-[44px] bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
            <input
              placeholder="Número (ej. 50588888888)"
              value={newRecipientPhone}
              onChange={e => setNewRecipientPhone(e.target.value)}
              className="flex-1 px-4 py-3 min-h-[44px] bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
            <button
              onClick={addRecipient}
              className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all active:scale-[0.98] sm:w-auto"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          {/* Recipients list */}
          <div className="rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {recipients.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm">
                No hay destinatarios registrados
              </div>
            ) : (
              recipients.map(recipient => (
                <div
                  key={recipient.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-3 sm:gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{recipient.name || 'Sin Nombre'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{recipient.phone_number}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-end">
                    {/* Toggle active */}
                    <button
                      type="button"
                      onClick={() => toggleRecipient(recipient.id, !recipient.is_active)}
                      className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors ${
                        recipient.is_active
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-white/5 text-muted-foreground border border-white/10'
                      }`}
                    >
                      {recipient.is_active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      {recipient.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => deleteRecipient(recipient.id)}
                      className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
