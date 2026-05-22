'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gestionSchema, type GestionFormData } from '@/lib/validations/gestion';
import { useCreateGestion } from '@/hooks/useGestiones';
import { useAuthStore } from '@/stores/authStore';
import { ESTADOS, CANALES } from '@/lib/utils/index';
import { Loader2, Phone, MessageCircle, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface GestionFormProps {
  clienteId: string;
  onSuccess: () => void;
}

const canalIcons = { llamada: Phone, whatsapp: MessageCircle, sms: MessageSquare };

export function GestionForm({ clienteId, onSuccess }: GestionFormProps) {
  const { user } = useAuthStore();
  const createMutation = useCreateGestion();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<GestionFormData>({
    resolver: zodResolver(gestionSchema),
    defaultValues: { 
      cliente_id: clienteId, 
      canal: 'llamada', 
      promesa_pago: false, 
      monto_promesa: 0,
      fecha_promesa: '',
    },
  });

  const resultado = watch('resultado');
  const showPromesa = resultado === 'PROMESA DE PAGO' || resultado === 'PAGARA HOY' || resultado === 'PAGARA SEMANA';

  const onSubmit = async (data: GestionFormData) => {
    if (!user) return;
    
    // Determinar automáticamente si es una promesa según el estado de resultado seleccionado
    const isPromise = data.resultado === 'PROMESA DE PAGO' || data.resultado === 'PAGARA HOY' || data.resultado === 'PAGARA SEMANA';
    
    await createMutation.mutateAsync({
      ...data,
      promesa_pago: isPromise,
      fecha_promesa: isPromise ? (data.fecha_promesa || null) : null,
      monto_promesa: isPromise ? Number(data.monto_promesa || 0) : 0,
      agente_id: user.id,
    });
    
    onSuccess();
  };

  const inputClass = 'w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white';

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <input type="hidden" {...register('cliente_id')} />

      {/* Canal */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-2 block">Canal</label>
        <div className="flex gap-2">
          {CANALES.map((canal) => {
            const Icon = canalIcons[canal];
            return (
              <label key={canal} className="flex-1">
                <input type="radio" value={canal} {...register('canal')} className="sr-only peer" />
                <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-white/10 cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-500/10 hover:bg-white/5 transition-all">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs capitalize">{canal}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Resultado */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Resultado <span className="text-red-400">*</span></label>
        <select 
          {...register('resultado')} 
          className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-white [&>option]:bg-slate-950 [&>option]:text-white"
        >
          <option value="">Seleccionar resultado...</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        {errors.resultado && <p className="text-xs text-red-400 mt-1">{errors.resultado.message}</p>}
      </div>

      {/* Comentario */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Comentario <span className="text-red-400">*</span></label>
        <textarea {...register('comentario')} rows={3} className={inputClass} placeholder="Detalle de la gestión..." />
        {errors.comentario && <p className="text-xs text-red-400 mt-1">{errors.comentario.message}</p>}
      </div>

      {/* Promesa fields (Completamente Opcionales) */}
      {showPromesa && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }} 
          className="space-y-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
        >
          <p className="text-xs font-semibold text-amber-400">Datos de Promesa de Pago (Opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold">Fecha Promesa</label>
              <input type="date" {...register('fecha_promesa')} className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold">Monto</label>
              <input type="number" step="0.01" {...register('monto_promesa')} className={inputClass} placeholder="0.00" />
            </div>
          </div>
        </motion.div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-lg hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Registrar Gestión
      </button>
    </motion.form>
  );
}
