import { RecordGestionInput, GestionOutput } from './dto/GestionDTO';

/**
 * Contrato para los Casos de Uso de Gestiones de Cobranza (Service/Application Layer).
 */
export interface GestionUseCase {
  /**
   * Registra una gestión de llamada, whatsapp, sms o email, actualizando el estado de la deuda y promesas.
   */
  recordGestion(input: RecordGestionInput): Promise<GestionOutput>;

  /**
   * Recupera el historial cronológico completo de contactos y gestiones de un cliente moroso.
   */
  getHistoryForClient(clienteId: string): Promise<GestionOutput[]>;

  /**
   * Lista las gestiones operativas realizadas por agentes aplicando filtros y periodos de tiempo.
   */
  listGestiones(filters: {
    clienteId?: string;
    agenteId?: string;
    startDate?: string;
    endDate?: string;
    promesaPago?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<GestionOutput[]>;
}
