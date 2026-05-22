import { Gestion } from './Gestion';

export interface GestionFilters {
  clienteId?: string;
  agenteId?: string;
  startDate?: Date;
  endDate?: Date;
  promesaPago?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Contrato de persistencia para Gestiones de Cobranza (Repository Pattern en DDD).
 */
export interface IGestionRepository {
  /**
   * Busca una gestión específica por su identificador único (ID).
   */
  findById(id: string): Promise<Gestion | null>;

  /**
   * Registra una nueva gestión en la base de datos.
   * Esto suele disparar los triggers correspondientes que actualizan el estado del cliente moroso.
   */
  save(gestion: Gestion): Promise<void>;

  /**
   * Recupera la historia cronológica de gestiones realizadas sobre un cliente moroso.
   */
  findByClienteId(clienteId: string): Promise<Gestion[]>;

  /**
   * Obtiene la lista completa de gestiones que cumplen con los filtros de búsqueda.
   */
  list(filters: GestionFilters): Promise<Gestion[]>;

  /**
   * Cuenta el total de gestiones realizadas según filtros específicos.
   */
  count(filters: GestionFilters): Promise<number>;
}
