import { SupabaseClientFactory } from '../persistence/SupabaseClient';

export interface AuditLogInput {
  userId: string;
  action: string;
  entityName: string;
  entityId: string;
  beforeData: Record<string, any> | null;
  afterData: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Servicio de auditoría inmutable a nivel de Infraestructura (Security Adapter).
 * Registra cada mutación de datos financieros críticos para cumplimiento normativo (SLA/SOX).
 */
export class AuditLogger {
  /**
   * Registra una acción de auditoría de forma asíncrona e inmutable en PostgreSQL.
   */
  public static async log(input: AuditLogInput): Promise<void> {
    try {
      const supabase = SupabaseClientFactory.getAdminClient();
      
      const { error } = await supabase.from('audit_logs').insert({
        user_id: input.userId,
        action: input.action,
        entity_name: input.entityName,
        entity_id: input.entityId,
        before_data: input.beforeData,
        after_data: input.afterData,
        ip_address: input.ipAddress || '0.0.0.0',
        user_agent: input.userAgent || 'system'
      });

      if (error) {
        console.error('⚠️ [AuditLogger] Error al insertar log de auditoría:', error.message);
      }
    } catch (err) {
      console.error('❌ [AuditLogger] Error crítico inesperado:', err);
    }
  }
}
