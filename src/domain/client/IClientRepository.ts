import { Client } from './Client';

export interface ClientFilters {
  search?: string;
  bucket?: number;
  estado?: string;
  agenteId?: string;
  campanaId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Contrato de persistencia para Clientes (Repository Pattern en DDD).
 * Define los métodos necesarios para la manipulación y consulta de clientes morosos.
 */
export interface IClientRepository {
  /**
   * Busca un cliente por su identificador único (ID).
   */
  findById(id: string): Promise<Client | null>;

  /**
   * Busca un cliente por su número de cédula nacional.
   */
  findByCedula(cedula: string): Promise<Client | null>;

  /**
   * Registra o actualiza un cliente en el sistema.
   */
  save(client: Client): Promise<void>;

  /**
   * Guarda de forma masiva (bulk insert/upsert) una colección de clientes.
   * Optimiza el rendimiento durante las importaciones mensuales de Excel/CSV.
   */
  bulkSave(clients: Client[]): Promise<{ creados: number; actualizados: number; errores: any[], clientesGuardados?: any[] }>;

  /**
   * Lista clientes según filtros específicos de la cartera.
   */
  list(filters: ClientFilters): Promise<Client[]>;

  /**
   * Cuenta el total de clientes morosos que cumplen con los filtros especificados.
   */
  count(filters: ClientFilters): Promise<number>;

  /**
   * Elimina un cliente por su ID de la base de datos.
   */
  delete(id: string): Promise<void>;
}
