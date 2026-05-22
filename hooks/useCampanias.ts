'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Campana, ResumenCampana } from '@/types';

const supabase = createClient();

export function useCampanias() {
  return useQuery({
    queryKey: ['campanas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campanas')
        .select('*')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false });
      if (error) throw error;
      return data as Campana[];
    },
  });
}

export function useResumenCampanas() {
  return useQuery({
    queryKey: ['campanas', 'resumen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_resumen_campana')
        .select('*')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false });
      if (error) throw error;
      return data as ResumenCampana[];
    },
  });
}

export function useCreateCampana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campana: Partial<Campana>) => {
      const { data, error } = await supabase
        .from('campanas')
        .insert(campana)
        .select()
        .single();
      if (error) throw error;
      return data as Campana;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanas'] });
    },
  });
}

export function useUpdateCampana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...campana }: Partial<Campana> & { id: string }) => {
      const { data, error } = await supabase
        .from('campanas')
        .update(campana)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Campana;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteCampana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campanas?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fallo al eliminar la campaña.');
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
