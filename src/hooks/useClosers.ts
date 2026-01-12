import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SDR, Squad } from '@/types';
import { toast } from 'sonner';

interface SDRRow {
  id: string;
  name: string;
  squad: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  team_type: string;
}

function mapRowToSDR(row: SDRRow): SDR {
  return {
    id: row.id,
    name: row.name,
    squad: row.squad as Squad,
    role: row.role,
    avatarUrl: row.avatar_url || undefined,
    createdAt: new Date(row.created_at),
  };
}

export function useClosers() {
  return useQuery({
    queryKey: ['closers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sdrs')
        .select('*')
        .eq('team_type', 'Closer')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as SDRRow[]).map(mapRowToSDR);
    },
  });
}

export function useAddCloser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (closer: Omit<SDR, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('sdrs')
        .insert({
          name: closer.name,
          squad: closer.squad,
          role: closer.role,
          avatar_url: closer.avatarUrl,
          team_type: 'Closer',
        })
        .select()
        .single();
      
      if (error) throw error;
      return mapRowToSDR(data as SDRRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closers'] });
      toast.success('Closer adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar closer: ${error.message}`);
    },
  });
}

export function useUpdateCloser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SDR> }) => {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.squad !== undefined) updateData.squad = data.squad;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;

      const { error } = await supabase
        .from('sdrs')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closers'] });
      toast.success('Closer atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar closer: ${error.message}`);
    },
  });
}

export function useDeleteCloser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sdrs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closers'] });
      toast.success('Closer removido com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao remover closer: ${error.message}`);
    },
  });
}
