import { ICampaignRepository } from '@domain/campaign/ICampaignRepository';
import { Campaign, EstadoCampana } from '@domain/campaign/Campaign';
import { Money } from '@domain/shared/ValueObjects';
import { SupabaseClientFactory } from './SupabaseClient';

/**
 * Implementación del Repositorio de Campañas (Infrastructure Layer).
 */
export class CampaignRepository implements ICampaignRepository {
  private getSupabase() {
    return SupabaseClientFactory.getAdminClient();
  }

  private toDomain(row: any): Campaign {
    return Campaign.create(
      {
        nombre: row.nombre,
        mes: row.mes,
        anio: row.anio,
        estado: row.estado as EstadoCampana,
        metaBucket5: Money.create(Number(row.meta_bucket5 || 0)),
        metaBucket6: Money.create(Number(row.meta_bucket6 || 0)),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      row.id
    );
  }

  private toPersistence(campaign: Campaign): Record<string, any> {
    return {
      id: campaign.id,
      nombre: campaign.nombre,
      mes: campaign.mes,
      anio: campaign.anio,
      estado: campaign.estado,
      meta_bucket5: campaign.metaBucket5.amount,
      meta_bucket6: campaign.metaBucket6.amount,
    };
  }

  async findById(id: string): Promise<Campaign | null> {
    const { data, error } = await this.getSupabase()
      .from('campanas')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async findByPeriod(mes: number, anio: number): Promise<Campaign | null> {
    const { data, error } = await this.getSupabase()
      .from('campanas')
      .select('*')
      .eq('mes', mes)
      .eq('anio', anio)
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async save(campaign: Campaign): Promise<void> {
    const row = this.toPersistence(campaign);
    const { error } = await this.getSupabase()
      .from('campanas')
      .upsert(row);

    if (error) {
      throw new Error(`Error al guardar la campaña en Postgres: ${error.message}`);
    }
  }

  async findActive(): Promise<Campaign | null> {
    const { data, error } = await this.getSupabase()
      .from('campanas')
      .select('*')
      .eq('estado', 'activa')
      .maybeSingle();

    if (error || !data) return null;
    return this.toDomain(data);
  }

  async listAll(): Promise<Campaign[]> {
    const { data, error } = await this.getSupabase()
      .from('campanas')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false });

    if (error || !data) return [];
    return data.map(row => this.toDomain(row));
  }

  async delete(id: string): Promise<void> {
    const supabase = this.getSupabase();
    
    // 1. Delete associated logs
    const { error: logsError } = await supabase
      .from('import_logs')
      .delete()
      .eq('campana_id', id);
    if (logsError) {
      throw new Error(`Error al eliminar los logs de importación: ${logsError.message}`);
    }

    // 2. Delete associated clients
    const { error: clientsError } = await supabase
      .from('clientes')
      .delete()
      .eq('campana_id', id);
    if (clientsError) {
      throw new Error(`Error al eliminar los clientes asociados: ${clientsError.message}`);
    }

    // 3. Delete the campaign
    const { error: campaignError } = await supabase
      .from('campanas')
      .delete()
      .eq('id', id);
    if (campaignError) {
      throw new Error(`Error al eliminar la campaña: ${campaignError.message}`);
    }
  }
}
