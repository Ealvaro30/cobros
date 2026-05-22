'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { DashboardStats, BucketStats, AgentKPI, PromesaProxima } from '@/types';

const supabase = createClient();

export function useDashboardStats(campanaId?: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'stats', campanaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_campana_id: campanaId || null,
      });
      if (error) throw error;
      return data as DashboardStats;
    },
  });
}

export function useBucketStats(campanaId?: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'buckets', campanaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bucket_stats', {
        p_campana_id: campanaId || null,
      });
      if (error) throw error;
      return data as BucketStats;
    },
  });
}

export function useAgentKPIs(campanaId?: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'agents', campanaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agent_kpis', {
        p_campana_id: campanaId || null,
      });
      if (error) throw error;
      return (data || []) as AgentKPI[];
    },
  });
}

export function useProximasPromesas() {
  return useQuery({
    queryKey: ['dashboard', 'promesas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_promesas_proximas')
        .select('*')
        .limit(20);
      if (error) throw error;
      return data as PromesaProxima[];
    },
  });
}
