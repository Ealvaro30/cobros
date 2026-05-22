import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Proveedor de Clientes de Supabase para la Capa de Infraestructura.
 * Configura instancias seguras para consultas generales y operaciones administrativas (bypass RLS).
 */
export class SupabaseClientFactory {
  private static clientInstance: SupabaseClient | null = null;
  private static adminInstance: SupabaseClient | null = null;

  /**
   * Obtiene la instancia estándar de Supabase (respeta Row Level Security).
   */
  public static getClient(): SupabaseClient {
    if (!this.clientInstance) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !anonKey) {
        throw new Error('Las variables de entorno de Supabase (URL y ANON_KEY) no están configuradas.');
      }

      this.clientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: false,
        },
      });
    }
    return this.clientInstance;
  }

  /**
   * Obtiene la instancia administrativa con privilegios totales (bypassea RLS).
   * Requiere la variable secreta SUPABASE_SERVICE_ROLE_KEY.
   */
  public static getAdminClient(): SupabaseClient {
    if (!this.adminInstance) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceRoleKey) {
        throw new Error('Las variables de entorno de Supabase (URL y SERVICE_ROLE_KEY) no están configuradas.');
      }

      this.adminInstance = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return this.adminInstance;
  }
}
