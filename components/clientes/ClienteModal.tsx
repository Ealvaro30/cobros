'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, type ClienteFormData } from '@/lib/validations/cliente';
import { useCreateCliente, useUpdateCliente } from '@/hooks/useClientes';
import { useCampanias } from '@/hooks/useCampanias';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { ESTADOS } from '@/lib/utils/index';
import { X, Loader2, Trash2, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ClienteDetalle } from '@/types';

interface ClienteModalProps {
  cliente: ClienteDetalle | null;
  onClose: () => void;
}

export function ClienteModal({ cliente, onClose }: ClienteModalProps) {
  const isEditing = !!cliente;
  const clienteId = cliente?.id;

  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();
  const { data: campanias } = useCampanias();
  const { rate: exchangeRate } = useExchangeRate();

  const [operacionesLocal, setOperacionesLocal] = useState<{ codigo: string, totalOperacion: number, montoMinimo: number }[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: '',
      capital: 0,
      saldo_dolares: 0,
      bucket: 5,
      estado: 'NO CONTESTA',
      promesa_pago: false,
      unica_operacion: false,
      prioridad: 'media',
    },
  });

  const isSubmittingState = isSubmitting || createMutation.isPending || updateMutation.isPending;

  // Cargar datos si es edición
  useEffect(() => {
    if (cliente) {
      reset({
        id_cliente: cliente.id_cliente || '',
        cedula: cliente.cedula || '',
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        whatsapp: cliente.whatsapp || '',
        capital: cliente.capital,
        saldo_dolares: cliente.saldo_dolares,
        bucket: (cliente.bucket === 6 ? 6 : 5) as 5 | 6,
        estado: cliente.estado,
        promesa_pago: cliente.promesa_pago,
        fecha_promesa: cliente.fecha_promesa || '',
        unica_operacion: cliente.unica_operacion || false,
        prioridad: cliente.prioridad || 'media',
        empresa: cliente.empresa || '',
        campana_id: cliente.campana_id || '',
        observaciones: cliente.observaciones || '',
      });

      if (cliente.observaciones) {
        try {
          const parsed = JSON.parse(cliente.observaciones);
          if (parsed && Array.isArray(parsed.ops)) {
            setOperacionesLocal(parsed.ops);
          } else {
            setOperacionesLocal([]);
          }
        } catch (e) {
          setOperacionesLocal([]);
        }
      } else {
        setOperacionesLocal([]);
      }
    } else {
      setOperacionesLocal([]);
    }
  }, [cliente, reset]);

  const addOperacion = () => {
    setOperacionesLocal([...operacionesLocal, { 
      codigo: `OP-${1000 + Math.floor(Math.random() * 9000)}`, 
      totalOperacion: 0, 
      montoMinimo: 0 
    }]);
  };

  const removeOperacion = (index: number) => {
    const nextOps = operacionesLocal.filter((_, i) => i !== index);
    setOperacionesLocal(nextOps);
    const totalCap = nextOps.reduce((acc, curr) => acc + curr.totalOperacion, 0);
    setValue('capital', totalCap);
  };

  const updateOperacion = (index: number, field: 'codigo' | 'totalOperacion' | 'montoMinimo', value: string | number) => {
    const nextOps = [...operacionesLocal];
    nextOps[index] = {
      ...nextOps[index],
      [field]: field === 'codigo' ? value : Number(value || 0)
    };
    setOperacionesLocal(nextOps);
    
    if (field === 'totalOperacion') {
      const totalCap = nextOps.reduce((acc, curr) => acc + curr.totalOperacion, 0);
      setValue('capital', totalCap);
    }
  };

  // Escuchar capital para auto-cálculo reactivo a dólares
  const capital = watch('capital');
  useEffect(() => {
    const parsedCapital = parseFloat(String(capital || 0));
    if (!isNaN(parsedCapital)) {
      const dollars = Math.round((parsedCapital / exchangeRate) * 100) / 100;
      setValue('saldo_dolares', dollars);
    }
  }, [capital, setValue, exchangeRate]);

  const onSubmit = async (data: ClienteFormData) => {
    try {
      const sumCapital = operacionesLocal.reduce((acc, curr) => acc + Number(curr.totalOperacion), 0);
      const finalCapital = sumCapital > 0 ? sumCapital : data.capital;

      const cleanedData: ClienteFormData = {
        ...data,
        capital: finalCapital,
        id_cliente: data.id_cliente || undefined,
        cedula: data.cedula || undefined,
        telefono: data.telefono || undefined,
        whatsapp: data.whatsapp || undefined,
        agente_id: data.agente_id === '' ? undefined : (data.agente_id || undefined),
        campana_id: data.campana_id === '' ? undefined : (data.campana_id || undefined),
        fecha_promesa: data.fecha_promesa === '' ? undefined : (data.fecha_promesa || undefined),
        unica_operacion: data.unica_operacion,
        prioridad: data.prioridad,
        empresa: data.empresa || undefined,
        observaciones: operacionesLocal.length > 0 ? JSON.stringify({ ops: operacionesLocal }) : (data.observaciones || undefined),
      };
      if (isEditing && clienteId) {
        await updateMutation.mutateAsync({ ...cleanedData, id: clienteId });
      } else {
        await createMutation.mutateAsync(cleanedData);
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving cliente:', err);
      alert(err.message || 'Ocurrió un error al guardar el cliente.');
    }
  };

  const inputClass = 'w-full px-4 py-3 min-h-[44px] bg-slate-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground text-white';
  const labelClass = 'text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5';

  return (
    <div className="modal-responsive p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative modal-content bg-card border border-white/10 shadow-2xl overflow-hidden scrollbar-thin"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nombre <span className="text-red-400">*</span></label>
              <input {...register('nombre')} className={inputClass} placeholder="Nombre completo" />
              {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Cédula</label>
              <input {...register('cedula')} className={inputClass} placeholder="001-000000-0000A" />
            </div>
            <div>
              <label className={labelClass}>ID Cliente</label>
              <input {...register('id_cliente')} className={inputClass} placeholder="ID externo" />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input {...register('telefono')} className={inputClass} placeholder="+505 8888-8888" />
            </div>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input {...register('whatsapp')} className={inputClass} placeholder="+50588888888" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 p-3 bg-slate-900 border border-white/10 rounded-xl min-h-[44px] cursor-pointer touch-target">
                <input {...register('unica_operacion')} type="checkbox" className="w-5 h-5 rounded border-white/10 bg-slate-800 text-primary focus:ring-primary/50 cursor-pointer" />
                <span className="text-sm font-semibold text-white">Cliente con única operación</span>
              </label>
              <p className="text-[10px] text-muted-foreground">Ocultar múltiples operaciones si solo tiene un pago mínimo.</p>
            </div>
            <div>
              <label className={labelClass}>Capital (Córdobas) <span className="text-red-400">*</span></label>
              <input {...register('capital')} type="number" step="0.01" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Saldo Dólares (Auto-calculado)</label>
              <input {...register('saldo_dolares')} type="number" step="0.01" readOnly className={`${inputClass} bg-white/5 opacity-80 cursor-not-allowed`} />
            </div>
            <div>
              <label className={labelClass}>Bucket <span className="text-red-400">*</span></label>
              <select {...register('bucket')} className={inputClass + ' [&>option]:bg-slate-950 [&>option]:text-white'}>
                <option value={5}>Bucket 5 (121 - 150 días)</option>
                <option value={6}>Bucket 6 (151 - 180 días)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Estado <span className="text-red-400">*</span></label>
              <select {...register('estado')} className={inputClass + ' [&>option]:bg-slate-950 [&>option]:text-white'}>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Prioridad</label>
              <select {...register('prioridad')} className={inputClass + ' [&>option]:bg-slate-950 [&>option]:text-white'}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Campaña <span className="text-red-400">*</span></label>
              <select {...register('campana_id')} className={inputClass + ' [&>option]:bg-slate-950 [&>option]:text-white'}>
                <option value="">Seleccionar campaña...</option>
                {campanias?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.mes}/{c.anio})
                  </option>
                ))}
              </select>
              {errors.campana_id && <p className="text-xs text-red-400 mt-1">{errors.campana_id.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Empresa</label>
              <input {...register('empresa')} className={inputClass} placeholder="Empresa del cliente" />
            </div>
            <div>
              <label className={labelClass}>Fecha Promesa (Opcional)</label>
              <input {...register('fecha_promesa')} type="date" className={inputClass} />
            </div>

            {/* Gestor de Operaciones Activas */}
            <div className="sm:col-span-2 border-t border-white/5 pt-4 mt-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-slate-300">Operaciones Activas del Cliente</h4>
                <button
                  type="button"
                  onClick={addOperacion}
                  className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded text-xs flex items-center gap-1 font-bold transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-400" /> Agregar Operación
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">Si especifica operaciones, el sistema sumará automáticamente sus capitales y actualizará el campo de "Capital" general.</p>

              {!watch('unica_operacion') && (
                <>
                  {operacionesLocal.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-white/5 text-center text-xs text-muted-foreground">
                  No hay operaciones individuales registradas. Se generarán automáticamente a partir del capital.
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {operacionesLocal.map((op, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-black/25 p-3 rounded-lg border border-white/5">
                      <div className="flex-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Código</label>
                        <input
                          type="text"
                          value={op.codigo}
                          onChange={(e) => updateOperacion(idx, 'codigo', e.target.value)}
                          className={inputClass}
                          placeholder="OP-1001"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Capital (Monto)</label>
                        <input
                          type="number"
                          value={op.totalOperacion || ''}
                          onChange={(e) => updateOperacion(idx, 'totalOperacion', e.target.value)}
                          className={inputClass}
                          placeholder="C$ 0.00"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Monto Mínimo</label>
                        <input
                          type="number"
                          value={op.montoMinimo || ''}
                          onChange={(e) => updateOperacion(idx, 'montoMinimo', e.target.value)}
                          className={inputClass}
                          placeholder="C$ 0.00"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOperacion(idx)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded mt-4 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-lg flex justify-between items-center text-xs mt-2">
                    <span className="text-blue-300 font-bold">Resumen de Operaciones:</span>
                    <div className="flex gap-4">
                      <span>Total Capital: <strong className="text-white">C$ {operacionesLocal.reduce((acc, curr) => acc + curr.totalOperacion, 0).toLocaleString()}</strong></span>
                      <span>Total Mínimo: <strong className="text-amber-400 font-mono font-bold">C$ {operacionesLocal.reduce((acc, curr) => acc + curr.montoMinimo, 0).toLocaleString()}</strong></span>
                    </div>
                  </div>
                  </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-white/5">
            <button type="button" onClick={onClose} className="px-4 py-3 min-h-[44px] text-sm rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors w-full sm:w-auto">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingState}
              className="px-6 py-3 min-h-[44px] bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto active:scale-[0.98] transition-transform"
            >
              {isSubmittingState && <Loader2 className="w-5 h-5 animate-spin" />}
              {isEditing ? 'Actualizar' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
