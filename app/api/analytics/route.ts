import { NextResponse } from 'next/server';
import { SupabaseClientFactory } from '@infrastructure/persistence/SupabaseClient';

/**
 * Controller de Analíticas Avanzadas (Presentation API Layer).
 * Consume las vistas analíticas de PostgreSQL en tiempo real para proveer datos a los dashboards.
 */
export async function GET(request: Request) {
  try {
    const supabase = SupabaseClientFactory.getClient();
    const { searchParams } = new URL(request.url);
    const campanaId = searchParams.get('campana_id');

    let bucketsQuery = supabase.from('v_bucket_analytics').select('*');
    if (campanaId) {
      bucketsQuery = bucketsQuery.eq('campana_id', campanaId);
    } else {
      bucketsQuery = bucketsQuery.eq('campana_estado', 'activa');
    }

    const leaderboardQuery = supabase.from('v_leaderboard_agentes').select('*');

    const [bucketsRes, leaderboardRes] = await Promise.all([
      bucketsQuery,
      leaderboardQuery
    ]);

    if (bucketsRes.error) {
      throw new Error(`Error en v_bucket_analytics: ${bucketsRes.error.message}`);
    }
    if (leaderboardRes.error) {
      throw new Error(`Error en v_leaderboard_agentes: ${leaderboardRes.error.message}`);
    }

    return NextResponse.json({
      bucketAnalytics: bucketsRes.data || [],
      leaderboard: leaderboardRes.data || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
