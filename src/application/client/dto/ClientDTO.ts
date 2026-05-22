export interface CreateClientInput {
  idCliente: string | null;
  cedula: string | null;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  capital: number;
  saldoDolares: number;
  diasMora: number;
  estado: string;
  agenteId: string | null;
  campanaId: string | null;
  mesCartera: string | null;
  direccion: string | null;
  correo: string | null;
  empresa: string | null;
  observaciones: string | null;
}

export interface ImportClientRow {
  PROMESA?: string;
  ID?: string;
  CAPITAL?: number;
  CEDULA?: string;
  NOMBRE?: string;
  DOLARES?: number;
  ESTADO?: string;
  BUCKET?: number;
  AGENTE?: string;
  WAP?: string;
  TIPO?: string;
  COLOR_PROMESA?: string;
  FECHA_PROMESA?: Date;
  OPERACIONES?: string;
}

export interface ClientOutput {
  id: string;
  idCliente: string | null;
  cedula: string | null;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  capital: number;
  saldoDolares: number;
  diasMora: number;
  bucket: number | null;
  estado: string;
  agenteId: string | null;
  campanaId: string | null;
  fechaAsignacion: string | null;
  fechaRegistro: string;
  mesCartera: string | null;
  promesaPago: boolean;
  fechaPromesa: string | null;
  montoPromesa: number;
  direccion: string | null;
  correo: string | null;
  empresa: string | null;
  observaciones: string | null;
  montoRecuperado: number;
  createdAt: string;
  updatedAt: string;
}
