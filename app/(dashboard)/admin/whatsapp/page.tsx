'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, QrCode, Power, Settings, RefreshCw, Send, Trash, Plus } from 'lucide-react';

export default function WhatsappConfigPage() {
  const [status, setStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await fetchStatus();
    
    const { data: configData } = await supabase.from('whatsapp_config').select('*').single();
    if (configData) setConfig(configData);

    const { data: recData } = await supabase.from('whatsapp_report_recipients').select('*').order('created_at', { ascending: false });
    if (recData) setRecipients(recData);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchStatus, 5000); // poll status
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async () => {
    toast({ title: 'Reiniciando sesión...' });
    await fetch('/api/admin/whatsapp/restart', { method: 'POST' });
    setTimeout(fetchStatus, 2000);
  };

  const handleTestReport = async () => {
    toast({ title: 'Generando y enviando reporte de prueba...' });
    const res = await fetch('/api/admin/whatsapp/test-report', { method: 'POST' });
    if (res.ok) {
      toast({ title: 'Reporte de prueba enviado.' });
    } else {
      toast({ title: 'Error al enviar reporte de prueba.', variant: 'destructive' });
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    const { error } = await supabase.from('whatsapp_config').update(config).eq('id', config.id);
    if (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive' });
    } else {
      toast({ title: 'Configuración guardada' });
    }
  };

  const addRecipient = async () => {
    if (!newRecipientPhone) return;
    const { data, error } = await supabase.from('whatsapp_report_recipients').insert({
      phone_number: newRecipientPhone,
      name: newRecipientName
    }).select().single();

    if (!error && data) {
      setRecipients([data, ...recipients]);
      setNewRecipientPhone('');
      setNewRecipientName('');
      toast({ title: 'Destinatario agregado' });
    } else {
      toast({ title: 'Error al agregar', variant: 'destructive' });
    }
  };

  const deleteRecipient = async (id: string) => {
    await supabase.from('whatsapp_report_recipients').delete().eq('id', id);
    setRecipients(recipients.filter(r => r.id !== id));
    toast({ title: 'Destinatario eliminado' });
  };

  const toggleRecipient = async (id: string, active: boolean) => {
    await supabase.from('whatsapp_report_recipients').update({ is_active: active }).eq('id', id);
    setRecipients(recipients.map(r => r.id === id ? { ...r, is_active: active } : r));
  };

  if (loading && !config) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Configuración WhatsApp y Reportes Automáticos</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estado del Bot */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Power className="w-5 h-5"/> Estado de Conexión</CardTitle>
            <CardDescription>Gestiona la sesión del bot de WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Estado:</span>
              <span className={`px-2 py-1 rounded-md text-sm font-semibold ${status?.state === 'CONNECTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {status?.state || 'DESCONECTADO'}
              </span>
            </div>
            
            {status?.qrCode && (
              <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-white">
                <p className="text-sm text-gray-500 mb-2">Escanea el QR para conectar</p>
                {/* wa-automate returns QR as dataURI */}
                <img src={status.qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
              </div>
            )}

            <Button onClick={handleRestart} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" /> Reiniciar Sesión / Nuevo QR
            </Button>
          </CardContent>
        </Card>

        {/* Configuración de Reportes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5"/> Configuración Reporte Diario</CardTitle>
            <CardDescription>Ajustes de envío al final del día</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config && (
              <>
                <div className="space-y-2">
                  <Label>Hora de Ejecución</Label>
                  <Input 
                    type="time" 
                    value={config.schedule_time} 
                    onChange={e => setConfig({...config, schedule_time: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="send_excel" checked={config.send_excel} onCheckedChange={(c) => setConfig({...config, send_excel: c})} />
                    <Label htmlFor="send_excel">Enviar Excel Actualizado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="send_pdf" checked={config.send_pdf} onCheckedChange={(c) => setConfig({...config, send_pdf: c})} />
                    <Label htmlFor="send_pdf">Enviar PDF Resumen</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="send_summary" checked={config.send_summary} onCheckedChange={(c) => setConfig({...config, send_summary: c})} />
                    <Label htmlFor="send_summary">Enviar Resumen en Mensaje</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="is_active" checked={config.is_active} onCheckedChange={(c) => setConfig({...config, is_active: c})} />
                    <Label htmlFor="is_active">Activar Módulo de Reportes</Label>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={saveConfig} className="flex-1">Guardar Configuración</Button>
                  <Button onClick={handleTestReport} variant="secondary" className="flex-1">
                    <Send className="w-4 h-4 mr-2" /> Probar Envío
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Destinatarios */}
      <Card>
        <CardHeader>
          <CardTitle>Destinatarios de Reportes</CardTitle>
          <CardDescription>Números de WhatsApp que recibirán el reporte diario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Input 
              placeholder="Nombre (ej. Juan Perez)" 
              value={newRecipientName} 
              onChange={e => setNewRecipientName(e.target.value)} 
            />
            <Input 
              placeholder="Número (ej. 50588888888)" 
              value={newRecipientPhone} 
              onChange={e => setNewRecipientPhone(e.target.value)} 
            />
            <Button onClick={addRecipient}><Plus className="w-4 h-4 mr-2" /> Agregar</Button>
          </div>

          <div className="border rounded-md divide-y">
            {recipients.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No hay destinatarios registrados</div>
            ) : (
              recipients.map(recipient => (
                <div key={recipient.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{recipient.name || 'Sin Nombre'}</div>
                    <div className="text-sm text-gray-500">{recipient.phone_number}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`active-${recipient.id}`} 
                        checked={recipient.is_active} 
                        onCheckedChange={(c) => toggleRecipient(recipient.id, !!c)} 
                      />
                      <Label htmlFor={`active-${recipient.id}`}>Activo</Label>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteRecipient(recipient.id)} className="text-red-500 hover:text-red-700">
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
