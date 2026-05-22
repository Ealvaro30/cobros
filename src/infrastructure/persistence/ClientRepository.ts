import { IClientRepository, ClientFilters } from '@domain/client/IClientRepository';
import { Client, EstadoCliente } from '@domain/client/Client';
import { Money, DiasMora, PhoneNumber, EmailAddress } from '@domain/shared/ValueObjects';
import { SupabaseClientFactory } from './SupabaseClient';

/**
 * Implementación concreta del Repositorio de Clientes (Infrastructure Layer).
 * Traduce de forma bidireccional entre la base de datos física (snake_case) y las entidades puras del dominio (camelCase).
 */
export class ClientRepository implements IClientRepository {
  private getSupabase() {
    return SupabaseClientFactory.getAdminClient();
  }

  /**
   * Mapea una fila cruda de la base de datos a una Entidad de Dominio `Client`.
   */
  private toDomain(row: any): Client {
    return Client.create(
      {
        idCliente: row.id_cliente,
        cedula: row.cedula,
        nombre: row.nombre,
        telefono: row.telefono ? PhoneNumber.create(row.telefono) : null,
        whatsapp: row.whatsapp ? PhoneNumber.create(row.whatsapp) : null,
        capital: Money.create(Number(row.capital || 0)),
        saldoDolares: Money.create(Number(row.saldo_dolares || 0)),
        diasMora: DiasMora.create(row.dias_mora || 0),
        estado: row.estado as EstadoCliente,
        agenteId: row.agente_id,
        campanaId: row.campana_id,
        fechaAsignacion: row.fecha_asignacion ? new Date(row.fecha_asignacion) : null,
        fechaRegistro: new Date(row.fecha_registro),
        mesCartera: row.mes_cartera,
        promesaPago: row.promesa_pago || false,
        fechaPromesa: row.fecha_promesa ? new Date(row.fecha_promesa) : null,
        montoPromesa: Money.create(Number(row.monto_promesa || 0)),
        direccion: row.direccion,
        correo: row.correo ? EmailAddress.create(row.correo) : null,
        empresa: row.empresa,
        observaciones: row.observaciones,
        montoRecuperado: Money.create(Number(row.monto_recuperado || 0)),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      row.id
    );
  }

  /**
   * Mapea una Entidad de Dominio `Client` a una fila plana compatible con PostgreSQL.
   */
  private toPersistence(client: Client): Record<string, any> {
    return {
      id: client.id,
      id_cliente: client.idCliente,
      cedula: client.cedula,
      nombre: client.nombre,
      telefono: client.telefono ? client.telefono.value : null,
      whatsapp: client.whatsapp ? client.whatsapp.value : null,
      capital: client.capital.amount,
      saldo_dolares: client.saldoDolares.amount,
      dias_mora: client.diasMora.value,
      estado: client.estado,
      agente_id: client.agenteId,
      campana_id: client.campanaId,
      fecha_asignacion: client.fechaAsignacion ? client.fechaAsignacion.toISOString() : null,
      fecha_registro: client.fechaRegistro.toISOString(),
      mes_cartera: client.mesCartera,
      promesa_pago: client.promesaPago,
      fecha_promesa: client.fechaPromesa ? client.fechaPromesa.toISOString().split('T')[0] : null,
      monto_promesa: client.montoPromesa.amount,
      direccion: client.direccion,
      correo: client.correo ? client.correo.value : null,
      empresa: client.empresa,
      observaciones: client.observaciones,
      monto_recuperado: client.montoRecuperado.amount,
    };
  }

  async findById(id: string): Promise<Client | null> {
    const { data, error } = await this.getSupabase()
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByCedula(cedula: string): Promise<Client | null> {
    const { data, error } = await this.getSupabase()
      .from('clientes')
      .select('*')
      .eq('cedula', cedula)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(client: Client): Promise<void> {
    const row = this.toPersistence(client);
    const { error } = await this.getSupabase()
      .from('clientes')
      .upsert(row);

    if (error) {
      throw new Error(`Error al persistir el cliente en Postgres: ${error.message}`);
    }
  }

  async bulkSave(clients: Client[]): Promise<{ creados: number; actualizados: number; errores: any[], clientesGuardados?: any[] }> {
    // Deduplicar localmente por cédula para evitar el error de Postgres "cannot affect row a second time"
    const uniqueClientsMap = new Map<string, Client>();
    clients.forEach(c => {
      if (c.cedula) {
        uniqueClientsMap.set(c.cedula, c); // Mantendrá la última aparición en el Excel
      } else {
        // Generamos una key temporal para los que no tienen cédula (aunque validación lo impide normalmente)
        uniqueClientsMap.set(c.id, c);
      }
    });

    const rows = Array.from(uniqueClientsMap.values()).map(c => {
      const row = this.toPersistence(c);
      delete row.id; // Evitar sobrescribir el ID (PK) cuando haya conflicto por cédula
      return row;
    });

    const createdList: string[] = [];
    const updatedList: string[] = [];
    const errores: any[] = [];

    // Hacemos el bulk upsert utilizando la API de Supabase en bloques optimizados
    const { data, error } = await this.getSupabase()
      .from('clientes')
      .upsert(rows, { onConflict: 'cedula' })
      .select('id, cedula, created_at, updated_at');

    if (error) {
      errores.push({ fila: 0, nombre: 'Transacción General', campo: 'Base de Datos', mensaje: `Database Error: ${error.message} ${error.details ? '(' + error.details + ')' : ''}`, sugerencia: 'Verifique si hay registros duplicados o conflictos.' });
      return { creados: 0, actualizados: 0, errores, clientesGuardados: [] };
    }

    // Identificar creados y actualizados basándose en las marcas de tiempo
    (data || []).forEach(row => {
      const created = new Date(row.created_at).getTime();
      const updated = new Date(row.updated_at).getTime();
      if (Math.abs(updated - created) < 2000) {
        createdList.push(row.id);
      } else {
        updatedList.push(row.id);
      }
    });

    return {
      creados: createdList.length,
      actualizados: updatedList.length,
      errores,
      clientesGuardados: data || []
    };
  }

  async list(filters: ClientFilters): Promise<Client[]> {
    let query = this.getSupabase().from('clientes').select('*');

    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,cedula.ilike.%${filters.search}%,id_cliente.ilike.%${filters.search}%`);
    }
    if (filters.bucket) {
      query = query.eq('bucket', filters.bucket);
    }
    if (filters.estado) {
      query = query.eq('estado', filters.estado);
    }
    if (filters.agenteId) {
      query = query.eq('agente_id', filters.agenteId);
    }
    if (filters.campanaId) {
      query = query.eq('campana_id', filters.campanaId);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(row => this.toDomain(row));
  }

  async count(filters: ClientFilters): Promise<number> {
    let query = this.getSupabase().from('clientes').select('*', { count: 'exact', head: true });

    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,cedula.ilike.%${filters.search}%,id_cliente.ilike.%${filters.search}%`);
    }
    if (filters.bucket) {
      query = query.eq('bucket', filters.bucket);
    }
    if (filters.estado) {
      query = query.eq('estado', filters.estado);
    }
    if (filters.agenteId) {
      query = query.eq('agente_id', filters.agenteId);
    }
    if (filters.campanaId) {
      query = query.eq('campana_id', filters.campanaId);
    }

    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.getSupabase()
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar el cliente de la base de datos: ${error.message}`);
    }
  }
}
