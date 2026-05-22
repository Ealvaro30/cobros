// ============================================
// GMG Cobranzas — TypeScript Types
// ============================================

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENTE';

export type EstadoCliente =
  | 'SALVADA'
  | 'NO SALVADA'
  | 'PROMESA DE PAGO'
  | 'REPROGRAMADO'
  | 'NO CONTESTA'
  | 'NUMERO INCORRECTO'
  | 'VOLVER A LLAMAR'
  | 'PAGARA HOY'
  | 'PAGARA SEMANA'
  | 'CLIENTE MOLESTO';

export type CanalGestion = 'llamada' | 'whatsapp' | 'sms';

export type EstadoCampana = 'activa' | 'cerrada' | 'planificada' | 'oculta';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campana {
  id: string;
  nombre: string;
  mes: number;
  anio: number;
  estado: EstadoCampana;
  meta_bucket5: number;
  meta_bucket6: number;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  id_cliente: string | null;
  cedula: string | null;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  capital: number;
  saldo_dolares: number;
  dias_mora: number;
  bucket: number | null;
  estado: EstadoCliente;
  agente_id: string | null;
  campana_id: string | null;
  fecha_asignacion: string | null;
  fecha_registro: string | null;
  mes_cartera: string | null;
  promesa_pago: boolean;
  fecha_promesa: string | null;
  monto_promesa: number;
  direccion: string | null;
  unica_operacion: boolean;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  empresa: string | null;
  observaciones: string | null;
  monto_recuperado: number;
  created_at: string;
  updated_at: string;
}

export interface ClienteDetalle extends Cliente {
  agente_nombre: string | null;
  agente_email: string | null;
  campana_nombre: string | null;
  total_gestiones: number;
  ultima_gestion: string | null;
}

export interface Gestion {
  id: string;
  cliente_id: string;
  agente_id: string;
  comentario: string | null;
  resultado: EstadoCliente;
  fecha: string;
  hora: string;
  promesa_pago: boolean;
  fecha_promesa: string | null;
  monto_promesa: number;
  canal: CanalGestion;
  created_at: string;
}

export interface GestionTimeline extends Gestion {
  agente_nombre: string;
  cliente_nombre: string;
  cliente_cedula: string | null;
}

export interface ImportLog {
  id: string;
  usuario_id: string;
  campana_id: string | null;
  archivo: string;
  total_registros: number;
  registros_creados: number;
  registros_actualizados: number;
  registros_error: number;
  errores: Array<{ row: number; message: string }>;
  created_at: string;
}

export interface DashboardStats {
  total_cartera: number;
  total_recuperado: number;
  total_pendiente: number;
  total_promesas: number;
  monto_promesas: number;
  pct_recuperacion: number;
  clientes_gestionados: number;
  clientes_sin_gestion: number;
  total_clientes: number;
}

export interface BucketStats {
  bucket5: {
    total_clientes: number;
    capital: number;
    recuperado: number;
    promesas: number;
    proyeccion: number;
  };
  bucket6: {
    total_clientes: number;
    capital: number;
    recuperado: number;
    promesas: number;
    proyeccion: number;
  };
}

export interface AgentKPI {
  id: string;
  full_name: string;
  total_gestiones: number;
  clientes_gestionados: number;
  recuperado: number;
  salvadas: number;
  promesas_activas: number;
  promesas_cumplidas: number;
  promesas_incumplidas: number;
  efectividad: number;
}

export interface ResumenCampana {
  campana_id: string;
  campana_nombre: string;
  mes: number;
  anio: number;
  campana_estado: EstadoCampana;
  meta_bucket5: number;
  meta_bucket6: number;
  total_clientes: number;
  total_capital: number;
  total_recuperado: number;
  total_pendiente: number;
  clientes_bucket5: number;
  clientes_bucket6: number;
  salvadas: number;
  promesas: number;
  pct_recuperacion: number;
}

export interface PromesaProxima {
  id: string;
  nombre: string;
  cedula: string | null;
  telefono: string | null;
  whatsapp: string | null;
  fecha_promesa: string;
  monto_promesa: number;
  estado: EstadoCliente;
  bucket: number | null;
  agente_nombre: string | null;
  agente_id: string | null;
}
