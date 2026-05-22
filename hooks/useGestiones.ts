'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { GestionTimeline } from '@/types';
import type { GestionFormData } from '@/lib/validations/gestion';

const supabase = createClient();

export function useGestiones(clienteId?: string | null) {
  return useQuery({
    queryKey: ['gestiones', clienteId],
    queryFn: async () => {
      let query = supabase
        .from('v_gestiones_timeline')
        .select('*')
        .order('created_at', { ascending: false });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as GestionTimeline[];
    },
  });
}

export function useCreateGestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: GestionFormData & { agente_id: string }) => {
      const { data, error } = await supabase
        .from('gestiones')
        .insert({
          ...formData,
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().split(' ')[0],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestiones'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
