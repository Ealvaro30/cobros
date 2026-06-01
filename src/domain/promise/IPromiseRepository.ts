import { PaymentPromise, PromiseStatus, PromiseType } from './Promise';

/**
 * Interfaz del Repositorio de Promesas de Pago (DDD Repository Pattern).
 * Define el contrato de persistencia sin depender de infraestructura.
 */
export interface IPromiseRepository {
  save(promise: PaymentPromise): Promise<void>;
  findById(id: string): Promise<PaymentPromise | null>;
  findByClienteId(clienteId: string): Promise<PaymentPromise[]>;
  findByCampanaId(campanaId: string): Promise<PaymentPromise[]>;
  findByEstado(estado: PromiseStatus): Promise<PaymentPromise[]>;
  findExpiring(daysAhead: number): Promise<PaymentPromise[]>;
  findOverdue(): Promise<PaymentPromise[]>;
  list(filters: {
    clienteId?: string;
    agenteId?: string;
    campanaId?: string;
    estado?: PromiseStatus;
    tipo?: PromiseType;
    fechaDesde?: Date;
    fechaHasta?: Date;
    limit?: number;
    offset?: number;
  }): Promise<PaymentPromise[]>;
  count(filters?: {
    campanaId?: string;
    estado?: PromiseStatus;
  }): Promise<number>;
  delete(id: string): Promise<void>;
}
