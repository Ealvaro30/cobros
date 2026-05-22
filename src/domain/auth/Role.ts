import { ValueObject } from '../shared/ValueObjects';

export type RoleType = 'ADMIN' | 'SUPERVISOR' | 'AGENTE';

/**
 * Objeto de valor que representa el Rol de un usuario del sistema.
 * Modela la matriz de permisos y reglas de seguridad aplicativa (RBAC) de forma desacoplada.
 */
export class Role extends ValueObject<{ type: RoleType }> {
  private constructor(type: RoleType) {
    super({ type });
  }

  public static create(type: string): Role {
    const upperType = (type || '').trim().toUpperCase();
    if (upperType !== 'ADMIN' && upperType !== 'SUPERVISOR' && upperType !== 'AGENTE') {
      throw new Error(`Rol inválido o no reconocido: ${type}`);
    }
    return new Role(upperType as RoleType);
  }

  get value(): RoleType {
    return this.props.type;
  }

  get isAdmin(): boolean { return this.props.type === 'ADMIN'; }
  get isSupervisor(): boolean { return this.props.type === 'SUPERVISOR'; }
  get isAgente(): boolean { return this.props.type === 'AGENTE'; }

  // --- Matriz de Permisos del Dominio (RBAC) ---

  /**
   * Permiso: Ver todos los clientes de la cartera
   */
  public canViewAllClients(): boolean {
    return this.isAdmin || this.isSupervisor;
  }

  /**
   * Permiso: Importar carteras desde archivos Excel/CSV
   */
  public canImportExcel(): boolean {
    return this.isAdmin || this.isSupervisor;
  }

  /**
   * Permiso: Gestionar usuarios, roles y estados operativos
   */
  public canManageUsers(): boolean {
    return this.isAdmin;
  }

  /**
   * Permiso: Ver el dashboard completo con métricas financieras acumuladas
   */
  public canViewFullDashboard(): boolean {
    return this.isAdmin || this.isSupervisor;
  }

  /**
   * Permiso: Exportar reportes avanzados en formato PDF/Excel/CSV
   */
  public canExportReports(): boolean {
    return this.isAdmin || this.isSupervisor;
  }

  /**
   * Permiso: Registrar gestiones de cobros y promesas sobre clientes
   */
  public canRegisterGestiones(): boolean {
    return true; // Todos los roles del centro operativo pueden registrar llamadas/gestiones
  }
}
