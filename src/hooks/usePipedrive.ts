import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PipedriveConfig, PipedriveDeal } from '@/types/goals';
import { toast } from 'sonner';

export function usePipedriveConfig() {
  return useQuery({
    queryKey: ['pipedrive-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipedrive_config')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) return null;

      return {
        id: data.id,
        apiToken: data.api_token,
        domain: data.domain,
        isConnected: data.is_connected,
        lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as PipedriveConfig;
    },
  });
}

export function useSavePipedriveConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ apiToken, domain }: { apiToken: string; domain: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Check if config exists
      const { data: existing } = await supabase
        .from('pipedrive_config')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('pipedrive_config')
          .update({
            api_token: apiToken,
            domain,
            is_connected: true,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pipedrive_config')
          .insert({
            api_token: apiToken,
            domain,
            is_connected: true,
            created_by: userData.user?.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipedrive-config'] });
      toast.success('Pipedrive conectado com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving pipedrive config:', error);
      toast.error('Erro ao conectar Pipedrive');
    },
  });
}

export function usePipedriveDeals() {
  return useQuery({
    queryKey: ['pipedrive-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipedrive_deals')
        .select('*')
        .order('synced_at', { ascending: false });

      if (error) throw error;
      
      return data.map((row: any) => ({
        id: row.id,
        pipedriveId: row.pipedrive_id,
        sdrId: row.sdr_id,
        title: row.title,
        value: row.value,
        currency: row.currency,
        stageName: row.stage_name,
        status: row.status,
        wonTime: row.won_time ? new Date(row.won_time) : undefined,
        lostTime: row.lost_time ? new Date(row.lost_time) : undefined,
        createdAt: new Date(row.created_at),
        syncedAt: new Date(row.synced_at),
      })) as PipedriveDeal[];
    },
  });
}

export function useSyncPipedrive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-pipedrive');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipedrive-deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipedrive-config'] });
      toast.success('Sincronização concluída!');
    },
    onError: (error) => {
      console.error('Error syncing pipedrive:', error);
      toast.error('Erro ao sincronizar com Pipedrive');
    },
  });
}
