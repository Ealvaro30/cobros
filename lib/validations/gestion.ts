import { z } from 'zod';

export const gestionSchema = z.object({
  cliente_id: z.string().uuid('Cliente inválido'),
  comentario: z.string().min(1, 'El comentario es requerido'),
  resultado: z.enum([
    'SALVADA', 'NO SALVADA', 'PROMESA DE PAGO', 'REPROGRAMADO',
    'NO CONTESTA', 'NUMERO INCORRECTO', 'VOLVER A LLAMAR',
    'PAGARA HOY', 'PAGARA SEMANA', 'CLIENTE MOLESTO',
  ]),
  promesa_pago: z.boolean().default(false),
  fecha_promesa: z.string().nullable().optional(),
  monto_promesa: z.coerce.number().min(0).default(0),
  canal: z.enum(['llamada', 'whatsapp', 'sms']).default('llamada'),
});

export type GestionFormData = z.infer<typeof gestionSchema>;
