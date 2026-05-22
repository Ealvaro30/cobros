'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function useExchangeRate() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['settings', 'exchange-rate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'tipo_cambio')
        .maybeSingle();
      if (error) {
        console.error('Error al obtener tipo de cambio:', error.message);
        return 36.62; // Fallback corporativo
      }
      return Number(data?.value || '36.62');
    },
    staleTime: 1000 * 60 * 10, // Cache de 10 minutos
  });

  const mutation = useMutation({
    mutationFn: async (newValue: number) => {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'tipo_cambio', 
          value: String(newValue), 
          description: 'Tipo de cambio oficial (Córdobas a Dólares)' 
        });
      if (error) throw error;
      return newValue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'exchange-rate'] });
    },
  });

  return {
    rate: query.data ?? 36.62,
    isLoading: query.isLoading,
    updateRate: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
