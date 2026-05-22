import { GestionUseCase } from './GestionUseCase';
import { RecordGestionInput, GestionOutput } from './dto/GestionDTO';
import { Gestion, CanalGestion } from '@domain/gestion/Gestion';
import { Money } from '@domain/shared/ValueObjects';
import { EstadoCliente } from '@domain/client/Client';
import { GestionRepository } from '@infrastructure/persistence/GestionRepository';
import { ClientRepository } from '@infrastructure/persistence/ClientRepository';
import { AuditLogger } from '@infrastructure/security/AuditLogger';

/**
 * Servicio de Coordinación de Gestiones y CRM (Application Layer).
 */
export class GestionService implements GestionUseCase {
  private repository: GestionRepository;
  private clientRepository: ClientRepository;

  constructor() {
    this.repository = new GestionRepository();
    this.clientRepository = new ClientRepository();
  }

  private toOutput(gestion: Gestion): GestionOutput {
    return {
      id: gestion.id,
      clienteId: gestion.clienteId,
      agenteId: gestion.agenteId,
      comentario: gestion.comentario,
      resultado: gestion.resultado,
      fecha: gestion.fecha.toISOString().split('T')[0],
      promesaPago: gestion.promesaPago,
      fechaPromesa: gestion.fechaPromesa ? gestion.fechaPromesa.toISOString().split('T')[0] : null,
      montoPromesa: gestion.montoPromesa.amount,
      canal: gestion.canal,
      createdAt: gestion.createdAt ? gestion.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  async recordGestion(input: RecordGestionInput): Promise<GestionOutput> {
    // 1. Instanciamos la gestión con validaciones de Dominio
    const gestion = Gestion.create({
      clienteId: input.clienteId,
      agenteId: input.agenteId,
      comentario: input.comentario,
      resultado: input.resultado as EstadoCliente,
      fecha: new Date(),
      promesaPago: input.promesaPago,
      fechaPromesa: input.fechaPromesa ? new Date(input.fechaPromesa) : null,
      montoPromesa: Money.create(input.montoPromesa),
      canal: input.canal as CanalGestion,
    });

    // 2. Buscamos el cliente para auditoría de cambios y validación
    const clientBefore = await this.clientRepository.findById(input.clienteId);
    if (!clientBefore) {
      throw new Error(`Cliente con ID ${input.clienteId} no existe en el sistema.`);
    }

    // 3. Persistimos la gestión
    await this.repository.save(gestion);

    // 4. Modificamos el estado del cliente en el dominio (para consistencia del modelo DDD)
    clientBefore.registrarGestion(
      input.resultado as EstadoCliente,
      input.promesaPago,
      input.montoPromesa,
      input.fechaPromesa ? new Date(input.fechaPromesa) : null
    );

    // 5. Persistimos el cliente actualizado
    await this.clientRepository.save(clientBefore);

    // 6. Auditoría inmutable de seguridad
    const clientAfter = await this.clientRepository.findById(input.clienteId);
    await AuditLogger.log({
      userId: input.agenteId,
      action: 'RECORD_GESTION',
      entityName: 'clientes',
      entityId: input.clienteId,
      beforeData: clientBefore ? { estado: clientBefore.estado, promesa: clientBefore.promesaPago } : null,
      afterData: clientAfter ? { estado: clientAfter.estado, promesa: clientAfter.promesaPago } : null,
    });

    return this.toOutput(gestion);
  }

  async getHistoryForClient(clienteId: string): Promise<GestionOutput[]> {
    const list = await this.repository.findByClienteId(clienteId);
    return list.map(g => this.toOutput(g));
  }

  async listGestiones(filters: {
    clienteId?: string;
    agenteId?: string;
    startDate?: string;
    endDate?: string;
    promesaPago?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<GestionOutput[]> {
    const domainFilters = {
      clienteId: filters.clienteId,
      agenteId: filters.agenteId,
      promesaPago: filters.promesaPago,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      limit: filters.limit,
      offset: filters.offset,
    };

    const list = await this.repository.list(domainFilters);
    return list.map(g => this.toOutput(g));
  }
}
