import { Agreement, AgreementStatus } from './Agreement';

export interface IAgreementRepository {
  save(agreement: Agreement): Promise<void>;
  findById(id: string): Promise<Agreement | null>;
  findByClienteId(clienteId: string): Promise<Agreement[]>;
  findByEstado(estado: AgreementStatus): Promise<Agreement[]>;
  list(filters: {
    clienteId?: string;
    agenteId?: string;
    estado?: AgreementStatus;
    limit?: number;
    offset?: number;
  }): Promise<Agreement[]>;
  delete(id: string): Promise<void>;
}
