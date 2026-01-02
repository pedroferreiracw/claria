import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BestPractice } from '@/types/goals';
import { toast } from 'sonner';

interface BestPracticeRow {
  id: string;
  evaluation_id: string;
  sdr_id: string;
  title: string;
  description: string | null;
  category: string;
  highlight_text: string | null;
  final_score: number;
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
}

const mapRowToBestPractice = (row: BestPracticeRow): BestPractice => ({
  id: row.id,
  evaluationId: row.evaluation_id,
  sdrId: row.sdr_id,
  title: row.title,
  description: row.description || undefined,
  category: row.category,
  highlightText: row.highlight_text || undefined,
  finalScore: row.final_score,
  isFeatured: row.is_featured,
  createdBy: row.created_by || undefined,
  createdAt: new Date(row.created_at),
});

export function useBestPractices(category?: string) {
  return useQuery({
    queryKey: ['best-practices', category],
    queryFn: async () => {
      let query = supabase
        .from('best_practices')
        .select('*')
        .order('final_score', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as BestPracticeRow[]).map(mapRowToBestPractice);
    },
  });
}

export function useAddBestPractice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (practice: Omit<BestPractice, 'id' | 'createdAt'>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('best_practices')
        .insert({
          evaluation_id: practice.evaluationId,
          sdr_id: practice.sdrId,
          title: practice.title,
          description: practice.description || null,
          category: practice.category,
          highlight_text: practice.highlightText || null,
          final_score: practice.finalScore,
          is_featured: practice.isFeatured,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['best-practices'] });
      toast.success('Prática adicionada à biblioteca!');
    },
    onError: (error) => {
      console.error('Error adding best practice:', error);
      toast.error('Erro ao adicionar prática');
    },
  });
}

export function useDeleteBestPractice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('best_practices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['best-practices'] });
      toast.success('Prática removida!');
    },
    onError: (error) => {
      console.error('Error deleting best practice:', error);
      toast.error('Erro ao remover prática');
    },
  });
}
