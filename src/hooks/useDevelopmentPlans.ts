import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DevelopmentPlan } from '@/types/goals';
import { toast } from 'sonner';

interface PDIRow {
  id: string;
  sdr_id: string;
  evaluation_id: string | null;
  weak_area: string;
  recommendation: string;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  pdi: DevelopmentPlan['pdi'] | null;
}

const mapRowToPDI = (row: PDIRow): DevelopmentPlan => ({
  id: row.id,
  sdrId: row.sdr_id,
  evaluationId: row.evaluation_id || undefined,
  weakArea: row.weak_area,
  recommendation: row.recommendation,
  priority: row.priority as DevelopmentPlan['priority'],
  status: row.status as DevelopmentPlan['status'],
  dueDate: row.due_date ? new Date(row.due_date) : undefined,
  completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  pdi: row.pdi ?? undefined,
});

export function useDevelopmentPlans(sdrId?: string) {
  return useQuery({
    queryKey: ['development-plans', sdrId],
    queryFn: async () => {
      let query = supabase
        .from('development_plans')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (sdrId) {
        query = query.eq('sdr_id', sdrId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as PDIRow[]).map(mapRowToPDI);
    },
  });
}

export function useAddDevelopmentPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: Omit<DevelopmentPlan, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => {
      const { data, error } = await supabase
        .from('development_plans')
        .insert({
          sdr_id: plan.sdrId,
          evaluation_id: plan.evaluationId || null,
          weak_area: plan.weakArea,
          recommendation: plan.recommendation,
          priority: plan.priority,
          status: plan.status,
          due_date: plan.dueDate?.toISOString().split('T')[0] || null,
          pdi: (plan.pdi ?? null) as never,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-plans'] });
      toast.success('Plano de desenvolvimento criado!');
    },
    onError: (error) => {
      console.error('Error adding development plan:', error);
      toast.error('Erro ao criar plano');
    },
  });
}

export function useUpdateDevelopmentPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DevelopmentPlan> }) => {
      const updateData: Record<string, any> = {};
      if (data.status) {
        updateData.status = data.status;
        if (data.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (data.recommendation) updateData.recommendation = data.recommendation;
      if (data.priority) updateData.priority = data.priority;
      if (data.dueDate) updateData.due_date = data.dueDate.toISOString().split('T')[0];

      const { error } = await supabase
        .from('development_plans')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-plans'] });
      toast.success('Plano atualizado!');
    },
    onError: (error) => {
      console.error('Error updating development plan:', error);
      toast.error('Erro ao atualizar plano');
    },
  });
}

export function useDeleteDevelopmentPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('development_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-plans'] });
      toast.success('Plano removido!');
    },
    onError: (error) => {
      console.error('Error deleting development plan:', error);
      toast.error('Erro ao remover plano');
    },
  });
}
