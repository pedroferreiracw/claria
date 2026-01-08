import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MeetimeConfig {
  id: string;
  api_token: string | null;
  is_connected: boolean;
  last_sync_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetimeLead {
  id: string;
  meetime_id: string;
  sdr_id: string | null;
  name: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
  status: string;
  fit_score: number | null;
  cadence_name: string | null;
  created_at: string;
  synced_at: string;
}

export interface MeetimeProspection {
  id: string;
  meetime_id: string;
  lead_id: string | null;
  sdr_id: string | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  synced_at: string;
}

export interface MeetimeActivity {
  id: string;
  meetime_id: string;
  prospection_id: string | null;
  sdr_id: string | null;
  type: string | null;
  status: string | null;
  execution_date: string | null;
  annotation: string | null;
  call_duration_seconds: number | null;
  created_at: string;
  synced_at: string;
}

export interface MeetimeMeeting {
  id: string;
  meetime_id: string;
  lead_id: string | null;
  sdr_id: string | null;
  scheduled_at: string | null;
  status: string;
  no_show: boolean;
  created_at: string;
  synced_at: string;
}

export interface MeetimeDealFeedback {
  id: string;
  meetime_id: string;
  lead_id: string | null;
  prospection_id: string | null;
  sdr_id: string | null;
  result: string | null; // 'QUALIFIED', 'UNQUALIFIED', 'NO_CONTACT'
  meeting_date: string | null;
  response_date: string | null;
  notes: string | null;
  created_at: string;
  synced_at: string;
}

export function useMeetimeConfig() {
  return useQuery({
    queryKey: ["meetime-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetime_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MeetimeConfig | null;
    },
  });
}

export function useSaveMeetimeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ apiToken }: { apiToken: string }) => {
      // Check if config exists
      const { data: existing } = await supabase
        .from("meetime_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("meetime_config")
          .update({
            api_token: apiToken,
            is_connected: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("meetime_config").insert({
          api_token: apiToken,
          is_connected: true,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetime-config"] });
      toast.success("Configuração do Meetime salva com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving Meetime config:", error);
      toast.error("Erro ao salvar configuração do Meetime");
    },
  });
}

export function useMeetimeLeads() {
  return useQuery({
    queryKey: ["meetime-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetime_leads")
        .select("*")
        .order("synced_at", { ascending: false });

      if (error) throw error;
      return data as MeetimeLead[];
    },
  });
}

export function useMeetimeProspections() {
  return useQuery({
    queryKey: ["meetime-prospections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetime_prospections")
        .select("*")
        .order("synced_at", { ascending: false });

      if (error) throw error;
      return data as MeetimeProspection[];
    },
  });
}

export function useMeetimeActivities() {
  return useQuery({
    queryKey: ["meetime-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetime_activities")
        .select("*")
        .order("execution_date", { ascending: false });

      if (error) throw error;
      return data as MeetimeActivity[];
    },
  });
}

export function useMeetimeMeetings() {
  return useQuery({
    queryKey: ["meetime-meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetime_meetings")
        .select("*")
        .order("scheduled_at", { ascending: false });

      if (error) throw error;
      return data as MeetimeMeeting[];
    },
  });
}

export function useMeetimeDealFeedbacks() {
  return useQuery({
    queryKey: ["meetime-deal-feedbacks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetime_deal_feedbacks")
        .select("*")
        .order("synced_at", { ascending: false });

      if (error) throw error;
      return data as MeetimeDealFeedback[];
    },
  });
}

export function useSyncMeetime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Usuário não autenticado");
      }

      const response = await supabase.functions.invoke("sync-meetime", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao sincronizar");
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetime-leads"] });
      queryClient.invalidateQueries({ queryKey: ["meetime-prospections"] });
      queryClient.invalidateQueries({ queryKey: ["meetime-activities"] });
      queryClient.invalidateQueries({ queryKey: ["meetime-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetime-deal-feedbacks"] });
      queryClient.invalidateQueries({ queryKey: ["meetime-config"] });
      
      toast.success(
        `Sincronização concluída! ${data.synced?.leads || 0} leads, ${data.synced?.activities || 0} atividades, ${data.synced?.dealFeedbacks || 0} oportunidades sincronizadas.`
      );
    },
    onError: (error) => {
      console.error("Error syncing Meetime:", error);
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });
}

export function useMeetime() {
  const config = useMeetimeConfig();
  const leads = useMeetimeLeads();
  const prospections = useMeetimeProspections();
  const activities = useMeetimeActivities();
  const meetings = useMeetimeMeetings();
  const dealFeedbacks = useMeetimeDealFeedbacks();
  const saveConfig = useSaveMeetimeConfig();
  const syncMeetime = useSyncMeetime();

  return {
    config: config.data,
    leads: leads.data || [],
    prospections: prospections.data || [],
    activities: activities.data || [],
    meetings: meetings.data || [],
    dealFeedbacks: dealFeedbacks.data || [],
    isLoading:
      config.isLoading ||
      leads.isLoading ||
      prospections.isLoading ||
      activities.isLoading ||
      meetings.isLoading ||
      dealFeedbacks.isLoading,
    saveConfig: saveConfig.mutate,
    isSaving: saveConfig.isPending,
    syncMeetime: syncMeetime.mutate,
    isSyncing: syncMeetime.isPending,
  };
}
