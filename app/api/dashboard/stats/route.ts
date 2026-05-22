import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const campanaId = searchParams.get('campana_id');

  const [statsRes, bucketsRes, agentsRes] = await Promise.all([
    supabase.rpc('get_dashboard_stats', { p_campana_id: campanaId }),
    supabase.rpc('get_bucket_stats', { p_campana_id: campanaId }),
    supabase.rpc('get_agent_kpis', { p_campana_id: campanaId }),
  ]);

  if (statsRes.error) return NextResponse.json({ error: statsRes.error.message }, { status: 500 });

  return NextResponse.json({
    stats: statsRes.data,
    buckets: bucketsRes.data,
    agents: agentsRes.data,
  });
}
