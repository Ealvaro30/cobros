import { Campaign } from './Campaign';

/**
 * Contrato de persistencia para Campañas Mensuales (Repository Pattern en DDD).
 */
export interface ICampaignRepository {
  /**
   * Busca una campaña por su identificador único (ID).
   */
  findById(id: string): Promise<Campaign | null>;

  /**
   * Busca una campaña por su período exacto (mes y año).
   * Evita la creación de campañas duplicadas para un mismo mes.
   */
  findByPeriod(mes: number, anio: number): Promise<Campaign | null>;

  /**
   * Registra o actualiza una campaña en el sistema.
   */
  save(campaign: Campaign): Promise<void>;

  /**
   * Obtiene la campaña actualmente activa en el sistema de cobro.
   */
  findActive(): Promise<Campaign | null>;

  /**
   * Recupera la lista completa de campañas registradas, ordenadas cronológicamente.
   */
  listAll(): Promise<Campaign[]>;

  /**
   * Elimina una campaña y todos sus registros asociados.
   */
  delete(id: string): Promise<void>;
}
