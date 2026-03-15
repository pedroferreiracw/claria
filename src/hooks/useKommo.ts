import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KommoConversation {
  id: string;
  kommo_id: string;
  sdr_id: string | null;
  lead_name: string | null;
  lead_phone: string | null;
  lead_email: string | null;
  status: string | null;
  started_at: string | null;
  finished_at: string | null;
  messages_count: number;
  avg_response_time_seconds: number | null;
  ai_analysis_id: string | null;
  synced_at: string;
  created_at: string;
  sdr?: { id: string; name: string } | null;
}

export interface KommoMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  content: string;
  sent_at: string;
  response_time_seconds: number | null;
}

export interface KommoAnalysis {
  id: string;
  conversation_id: string;
  sdr_id: string | null;
  evaluation_id: string | null;
  scores: Record<string, number>;
  ai_feedback: any;
  objections: any[];
  result: string | null;
  final_score: number;
  analyzed_at: string;
}

export interface KommoConfig {
  id: string;
  subdomain: string | null;
  access_token: string | null;
  refresh_token: string | null;
  is_connected: boolean;
  last_sync_at: string | null;
}

export function useKommoConfig() {
  return useQuery({
    queryKey: ['kommo-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kommo_config')
        .select('id, subdomain, is_connected, last_sync_at')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as KommoConfig | null;
    },
  });
}

export function useKommoConversations(filters?: { sdrId?: string; status?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['kommo-conversations', filters],
    queryFn: async () => {
      let query = supabase
        .from('kommo_conversations')
        .select('*, sdr:sdrs(id, name)')
        .order('synced_at', { ascending: false });

      if (filters?.sdrId) query = query.eq('sdr_id', filters.sdrId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.dateFrom) query = query.gte('started_at', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('started_at', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as KommoConversation[];
    },
  });
}

export function useKommoMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['kommo-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('kommo_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });
      if (error) throw error;
      return (data || []) as KommoMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useKommoAnalyses(filters?: { sdrId?: string }) {
  return useQuery({
    queryKey: ['kommo-analyses', filters],
    queryFn: async () => {
      let query = (supabase.from('kommo_analyses') as any)
        .select('*')
        .order('analyzed_at', { ascending: false });

      if (filters?.sdrId) query = query.eq('sdr_id', filters.sdrId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as KommoAnalysis[];
    },
  });
}

export function useKommoAnalysisForConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ['kommo-analysis', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data, error } = await (supabase.from('kommo_analyses') as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();
      if (error) throw error;
      return data as KommoAnalysis | null;
    },
    enabled: !!conversationId,
  });
}

export function useSyncKommo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-kommo', {
        body: { limit: 50 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kommo-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['kommo-config'] });
      toast.success(`Sincronização concluída! ${data.synced} conversas sincronizadas.`);
    },
    onError: (error: Error) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });
}

export function useSaveKommoConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: { subdomain: string; long_lived_token: string }) => {
      const { data: existing } = await supabase.from('kommo_config').select('id').limit(1).maybeSingle();
      
      const configData = {
        subdomain: config.subdomain,
        access_token: config.long_lived_token,
        is_connected: true,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from('kommo_config')
          .update(configData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kommo_config')
          .insert(configData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kommo-config'] });
      toast.success('Kommo conectada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao conectar: ${error.message}`);
    },
  });
}
