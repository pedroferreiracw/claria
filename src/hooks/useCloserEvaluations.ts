import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CloserEvaluation, CloserScores, CloserAIFeedback, CloserObjection, CloserEvaluationResult } from '@/types/closer';
import { toast } from 'sonner';

/** "YYYY-MM-DD" no fuso local (evita shift UTC ao salvar). */
const toLocalDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Parseia "YYYY-MM-DD" como data local (evita interpretar como UTC 00:00). */
const parseLocalDate = (s: string): Date => {
  if (/T|Z|\+/.test(s)) return new Date(s);
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

interface CloserEvaluationRow {
  id: string;
  closer_id: string;
  date: string;
  video_url: string | null;
  transcription: string | null;
  scores: any;
  final_score: number;
  result: string;
  objections: any;
  ai_feedback: any;
  meeting_duration_minutes: number | null;
  deal_value: number | null;
  plan_sold: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToCloserEvaluation(row: CloserEvaluationRow): CloserEvaluation {
  return {
    id: row.id,
    closerId: row.closer_id,
    date: parseLocalDate(row.date),
    videoUrl: row.video_url || undefined,
    transcription: row.transcription || undefined,
    scores: row.scores as CloserScores,
    finalScore: row.final_score,
    result: row.result as CloserEvaluationResult,
    objections: (row.objections || []) as CloserObjection[],
    aiFeedback: row.ai_feedback as CloserAIFeedback | undefined,
    meetingDurationMinutes: row.meeting_duration_minutes || undefined,
    dealValue: row.deal_value || undefined,
    planSold: row.plan_sold || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function useCloserEvaluations() {
  return useQuery({
    queryKey: ['closer-evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('closer_evaluations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as CloserEvaluationRow[]).map(mapRowToCloserEvaluation);
    },
  });
}

export function useAddCloserEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evaluation: Omit<CloserEvaluation, 'id' | 'createdAt' | 'updatedAt'>) => {
      const insertData = {
        closer_id: evaluation.closerId,
        date: toLocalDateString(evaluation.date),
        video_url: evaluation.videoUrl || null,
        transcription: evaluation.transcription || null,
        scores: evaluation.scores as any,
        final_score: evaluation.finalScore,
        result: evaluation.result as any,
        objections: evaluation.objections as any,
        ai_feedback: evaluation.aiFeedback as any || null,
        meeting_duration_minutes: evaluation.meetingDurationMinutes || null,
        deal_value: evaluation.dealValue || null,
        plan_sold: evaluation.planSold || null,
      };

      const { data, error } = await supabase
        .from('closer_evaluations')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return mapRowToCloserEvaluation(data as CloserEvaluationRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-evaluations'] });
      toast.success('Avaliação salva com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao salvar avaliação: ${error.message}`);
    },
  });
}

export function useUpdateCloserEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CloserEvaluation> }) => {
      const updateData: any = {};
      if (data.closerId !== undefined) updateData.closer_id = data.closerId;
      if (data.date !== undefined) updateData.date = toLocalDateString(data.date);
      if (data.videoUrl !== undefined) updateData.video_url = data.videoUrl;
      if (data.transcription !== undefined) updateData.transcription = data.transcription;
      if (data.scores !== undefined) updateData.scores = data.scores;
      if (data.finalScore !== undefined) updateData.final_score = data.finalScore;
      if (data.result !== undefined) updateData.result = data.result;
      if (data.objections !== undefined) updateData.objections = data.objections;
      if (data.aiFeedback !== undefined) updateData.ai_feedback = data.aiFeedback;
      if (data.meetingDurationMinutes !== undefined) updateData.meeting_duration_minutes = data.meetingDurationMinutes;
      if (data.dealValue !== undefined) updateData.deal_value = data.dealValue;
      if (data.planSold !== undefined) updateData.plan_sold = data.planSold;

      const { error } = await supabase
        .from('closer_evaluations')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-evaluations'] });
      toast.success('Avaliação atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar avaliação: ${error.message}`);
    },
  });
}

export function useDeleteCloserEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('closer_evaluations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-evaluations'] });
      toast.success('Avaliação removida com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao remover avaliação: ${error.message}`);
    },
  });
}
