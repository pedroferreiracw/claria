import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Goal } from '@/types/goals';
import { toast } from 'sonner';

interface GoalRow {
  id: string;
  sdr_id: string | null;
  squad: string | null;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  metric_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const mapRowToGoal = (row: GoalRow): Goal => ({
  id: row.id,
  sdrId: row.sdr_id || undefined,
  squad: row.squad || undefined,
  title: row.title,
  description: row.description || undefined,
  targetValue: row.target_value,
  currentValue: row.current_value,
  metricType: row.metric_type as Goal['metricType'],
  startDate: new Date(row.start_date),
  endDate: new Date(row.end_date),
  status: row.status as Goal['status'],
  createdBy: row.created_by || undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as GoalRow[]).map(mapRowToGoal);
    },
  });
}

export function useAddGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData: any = {
        title: goal.title,
        description: goal.description || null,
        target_value: goal.targetValue,
        current_value: 0,
        metric_type: goal.metricType,
        start_date: goal.startDate.toISOString().split('T')[0],
        end_date: goal.endDate.toISOString().split('T')[0],
        status: goal.status,
        created_by: userData.user?.id || null,
      };
      
      if (goal.sdrId) insertData.sdr_id = goal.sdrId;
      if (goal.squad === 'Águia' || goal.squad === 'Lobo') insertData.squad = goal.squad;
      
      const { data, error } = await supabase
        .from('goals')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error adding goal:', error);
      toast.error('Erro ao criar meta');
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Goal> }) => {
      const updateData: Record<string, any> = {};
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.targetValue !== undefined) updateData.target_value = data.targetValue;
      if (data.currentValue !== undefined) updateData.current_value = data.currentValue;
      if (data.status) updateData.status = data.status;
      if (data.endDate) updateData.end_date = data.endDate.toISOString().split('T')[0];

      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta atualizada!');
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
      toast.error('Erro ao atualizar meta');
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta removida!');
    },
    onError: (error) => {
      console.error('Error deleting goal:', error);
      toast.error('Erro ao remover meta');
    },
  });
}
