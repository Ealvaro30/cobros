'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ClienteDetalle, Cliente } from '@/types';
import type { ClienteFormData } from '@/lib/validations/cliente';

const supabase = createClient();

export function useClientes(campanaId?: string | null) {
  return useQuery({
    queryKey: ['clientes', campanaId],
    queryFn: async () => {
      let query = supabase
        .from('v_clientes_detalle')
        .select('*')
        .order('dias_mora', { ascending: false });

      if (campanaId) {
        query = query.eq('campana_id', campanaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClienteDetalle[];
    },
  });
}

export function useCliente(id: string | null) {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('v_clientes_detalle')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as ClienteDetalle;
    },
    enabled: !!id,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: ClienteFormData) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert(formData)
        .select()
        .single();
      if (error) throw error;
      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...formData }: ClienteFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('clientes')
        .update(formData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cliente'] });
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clientes?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fallo al eliminar el cliente.');
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
