import { IGestionRepository, GestionFilters } from '@domain/gestion/IGestionRepository';
import { Gestion, CanalGestion } from '@domain/gestion/Gestion';
import { Money } from '@domain/shared/ValueObjects';
import { EstadoCliente } from '@domain/client/Client';
import { SupabaseClientFactory } from './SupabaseClient';

/**
 * Implementación del Repositorio de Gestiones de Cobranza (Infrastructure Layer).
 */
export class GestionRepository implements IGestionRepository {
  private getSupabase() {
    return SupabaseClientFactory.getAdminClient();
  }

  private toDomain(row: any): Gestion {
    return Gestion.create(
      {
        clienteId: row.cliente_id,
        agenteId: row.agente_id,
        comentario: row.comentario || '',
        resultado: row.resultado as EstadoCliente,
        fecha: new Date(row.fecha),
        promesaPago: row.promesa_pago || false,
        fechaPromesa: row.fecha_promesa ? new Date(row.fecha_promesa) : null,
        montoPromesa: Money.create(Number(row.monto_promesa || 0)),
        canal: row.canal as CanalGestion,
        createdAt: new Date(row.created_at),
      },
      row.id
    );
  }

  private toPersistence(gestion: Gestion): Record<string, any> {
    return {
      id: gestion.id,
      cliente_id: gestion.clienteId,
      agente_id: gestion.agenteId,
      comentario: gestion.comentario,
      resultado: gestion.resultado,
      fecha: gestion.fecha.toISOString().split('T')[0],
      promesa_pago: gestion.promesaPago,
      fecha_promesa: gestion.fechaPromesa ? gestion.fechaPromesa.toISOString().split('T')[0] : null,
      monto_promesa: gestion.montoPromesa.amount,
      canal: gestion.canal,
    };
  }

  async findById(id: string): Promise<Gestion | null> {
    const { data, error } = await this.getSupabase()
      .from('gestiones')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(gestion: Gestion): Promise<void> {
    const row = this.toPersistence(gestion);
    const { error } = await this.getSupabase()
      .from('gestiones')
      .upsert(row);

    if (error) {
      throw new Error(`Error al persistir la gestión en Postgres: ${error.message}`);
    }
  }

  async findByClienteId(clienteId: string): Promise<Gestion[]> {
    const { data, error } = await this.getSupabase()
      .from('gestiones')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(row => this.toDomain(row));
  }

  async list(filters: GestionFilters): Promise<Gestion[]> {
    let query = this.getSupabase().from('gestiones').select('*');

    if (filters.clienteId) {
      query = query.eq('cliente_id', filters.clienteId);
    }
    if (filters.agenteId) {
      query = query.eq('agente_id', filters.agenteId);
    }
    if (filters.promesaPago !== undefined) {
      query = query.eq('promesa_pago', filters.promesaPago);
    }
    if (filters.startDate) {
      query = query.gte('fecha', filters.startDate.toISOString().split('T')[0]);
    }
    if (filters.endDate) {
      query = query.lte('fecha', filters.endDate.toISOString().split('T')[0]);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(row => this.toDomain(row));
  }

  async count(filters: GestionFilters): Promise<number> {
    let query = this.getSupabase().from('gestiones').select('*', { count: 'exact', head: true });

    if (filters.clienteId) {
      query = query.eq('cliente_id', filters.clienteId);
    }
    if (filters.agenteId) {
      query = query.eq('agente_id', filters.agenteId);
    }
    if (filters.promesaPago !== undefined) {
      query = query.eq('promesa_pago', filters.promesaPago);
    }

    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
  }
}
