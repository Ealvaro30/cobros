export interface RecordGestionInput {
  clienteId: string;
  agenteId: string;
  comentario: string;
  resultado: string;
  promesaPago: boolean;
  fechaPromesa: string | null;
  montoPromesa: number;
  canal: string;
}

export interface GestionOutput {
  id: string;
  clienteId: string;
  agenteId: string;
  comentario: string;
  resultado: string;
  fecha: string;
  promesaPago: boolean;
  fechaPromesa: string | null;
  montoPromesa: number;
  canal: string;
  createdAt: string;
}
