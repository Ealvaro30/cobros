import { CreateClientInput, ImportClientRow, ClientOutput } from './dto/ClientDTO';

/**
 * Contrato para los Casos de Uso de Clientes (Service/Application Layer).
 * Desacopla la lógica de coordinación de la UI de Next.js y los Controladores REST.
 */
export interface ClientUseCase {
  /**
   * Crea manualmente un nuevo cliente moroso validando sus datos estructurados.
   */
  createClient(input: CreateClientInput): Promise<ClientOutput>;

  /**
   * Procesa la importación masiva de clientes desde filas leídas de un Excel/CSV.
   */
  importClients(
    campanaId: string,
    rows: ImportClientRow[],
    usuarioId: string
  ): Promise<{ creados: number; actualizados: number; errores: any[] }>;

  /**
   * Obtiene la ficha de detalle estructurado de un cliente.
   */
  getClientDetails(id: string): Promise<ClientOutput | null>;

  /**
   * Lista los clientes aplicando filtros de segmentación de cartera (bucket, agente, etc.).
   */
  listClients(filters: {
    search?: string;
    bucket?: number;
    estado?: string;
    agenteId?: string;
    campanaId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ClientOutput[]>;

  /**
   * Asigna un cliente moroso a un agente específico del centro operativo.
   */
  assignAgent(clientId: string, agenteId: string): Promise<void>;

  /**
   * Elimina un cliente moroso si cumple con las reglas de negocio (sin saldo y campaña inactiva).
   */
  deleteClient(id: string, usuarioRole: string): Promise<void>;
}

