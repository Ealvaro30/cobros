import { z } from 'zod';

export const clienteSchema = z.object({
  id_cliente: z.string().optional().or(z.literal('')),
  cedula: z.string().optional().or(z.literal('')),
  nombre: z.string().min(1, 'El nombre es requerido'),
  telefono: z.string().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  capital: z.coerce.number().min(0).default(0),
  saldo_dolares: z.coerce.number().min(0).default(0),
  bucket: z.preprocess((val) => Number(val), z.union([z.literal(5), z.literal(6)])).default(5),
  estado: z.string().default('NO CONTESTA'),
  agente_id: z.string().uuid().nullable().optional().or(z.literal('')),
  campana_id: z.string().uuid('Campaña inválida').nullable().optional().or(z.literal('')),
  promesa_pago: z.boolean().default(false),
  fecha_promesa: z.string().nullable().optional().or(z.literal('')),
  unica_operacion: z.boolean().default(false),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).default('media'),
  empresa: z.string().optional().or(z.literal('')),
  observaciones: z.string().optional().or(z.literal('')),
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
