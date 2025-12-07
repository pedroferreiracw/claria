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
}

const mapRowToSDR = (row: SDRRow): SDR => ({
  id: row.id,
  name: row.name,
  squad: row.squad as Squad,
  role: row.role,
  avatarUrl: row.avatar_url ?? undefined,
  createdAt: new Date(row.created_at),
});

export function useSDRs() {
  return useQuery({
    queryKey: ['sdrs'],
    queryFn: async (): Promise<SDR[]> => {
      const { data, error } = await supabase
        .from('sdrs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row) => mapRowToSDR(row as unknown as SDRRow));
    },
  });
}

export function useAddSDR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sdr: Omit<SDR, 'id' | 'createdAt'>) => {
      const insertData = {
        name: sdr.name,
        squad: sdr.squad,
        role: sdr.role,
        avatar_url: sdr.avatarUrl,
      };

      const { data, error } = await supabase
        .from('sdrs')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return mapRowToSDR(data as unknown as SDRRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdrs'] });
      toast.success('SDR cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar SDR: ' + error.message);
    },
  });
}

export function useUpdateSDR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SDR> }) => {
      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.squad) updateData.squad = data.squad;
      if (data.role) updateData.role = data.role;
      if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;

      const { error } = await supabase
        .from('sdrs')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdrs'] });
      toast.success('SDR atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar SDR: ' + error.message);
    },
  });
}

export function useDeleteSDR() {
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
      queryClient.invalidateQueries({ queryKey: ['sdrs'] });
      toast.success('SDR removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover SDR: ' + error.message);
    },
  });
}
