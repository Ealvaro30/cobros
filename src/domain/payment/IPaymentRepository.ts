import { Payment, PaymentType, PaymentMethod, PaymentStatus } from './Payment';

/**
 * Interfaz del Repositorio de Pagos (DDD Repository Pattern).
 */
export interface IPaymentRepository {
  save(payment: Payment): Promise<void>;
  findById(id: string): Promise<Payment | null>;
  findByClienteId(clienteId: string): Promise<Payment[]>;
  findByPromesaId(promesaId: string): Promise<Payment[]>;
  findByAcuerdoId(acuerdoId: string): Promise<Payment[]>;
  findPendientesConciliacion(): Promise<Payment[]>;
  list(filters: {
    clienteId?: string;
    campanaId?: string;
    tipo?: PaymentType;
    metodoPago?: PaymentMethod;
    estado?: PaymentStatus;
    conciliado?: boolean;
    fechaDesde?: Date;
    fechaHasta?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]>;
  sumByCampana(campanaId: string): Promise<number>;
  sumByCliente(clienteId: string): Promise<number>;
  count(filters?: {
    campanaId?: string;
    estado?: PaymentStatus;
  }): Promise<number>;
  delete(id: string): Promise<void>;
}
