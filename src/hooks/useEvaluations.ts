import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Evaluation, ProspectionType, ProspectionResult, Scores, Objection, AIFeedback } from '@/types';
import { toast } from 'sonner';

interface EvaluationRow {
  id: string;
  sdr_id: string;
  type: string;
  date: string;
  conversation_text: string | null;
  audio_url: string | null;
  questions_asked: string[];
  lead_responses: string[];
  result: string;
  scores: Scores;
  final_score: number;
  objections: Objection[];
  ai_feedback: AIFeedback | null;
  created_at: string;
  updated_at: string;
}

const mapRowToEvaluation = (row: EvaluationRow): Evaluation => ({
  id: row.id,
  sdrId: row.sdr_id,
  type: row.type as ProspectionType,
  date: new Date(row.date),
  conversationText: row.conversation_text ?? undefined,
  audioUrl: row.audio_url ?? undefined,
  questionsAsked: row.questions_asked || [],
  leadResponses: row.lead_responses || [],
  result: row.result as ProspectionResult,
  scores: row.scores,
  finalScore: row.final_score,
  objections: row.objections || [],
  aiFeedback: row.ai_feedback ?? undefined,
  createdAt: new Date(row.created_at),
});

export function useEvaluations() {
  return useQuery({
    queryKey: ['evaluations'],
    queryFn: async (): Promise<Evaluation[]> => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row) => mapRowToEvaluation(row as unknown as EvaluationRow));
    },
  });
}

export function useAddEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evaluation: Omit<Evaluation, 'id' | 'createdAt'>) => {
      const insertData = {
        sdr_id: evaluation.sdrId,
        type: evaluation.type,
        date: evaluation.date.toISOString().split('T')[0],
        conversation_text: evaluation.conversationText,
        audio_url: evaluation.audioUrl,
        questions_asked: evaluation.questionsAsked,
        lead_responses: evaluation.leadResponses,
        result: evaluation.result,
        scores: evaluation.scores as unknown as Record<string, unknown>,
        final_score: evaluation.finalScore,
        objections: evaluation.objections as unknown as Record<string, unknown>[],
        ai_feedback: evaluation.aiFeedback as unknown as Record<string, unknown>,
      };

      const { data, error } = await supabase
        .from('evaluations')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return mapRowToEvaluation(data as unknown as EvaluationRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Avaliação registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar avaliação: ' + error.message);
    },
  });
}

export function useUpdateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Evaluation> }) => {
      const updateData: Record<string, unknown> = {};
      if (data.sdrId) updateData.sdr_id = data.sdrId;
      if (data.type) updateData.type = data.type;
      if (data.date) updateData.date = data.date.toISOString().split('T')[0];
      if (data.conversationText !== undefined) updateData.conversation_text = data.conversationText;
      if (data.audioUrl !== undefined) updateData.audio_url = data.audioUrl;
      if (data.questionsAsked) updateData.questions_asked = data.questionsAsked;
      if (data.leadResponses) updateData.lead_responses = data.leadResponses;
      if (data.result) updateData.result = data.result;
      if (data.scores) updateData.scores = data.scores;
      if (data.finalScore !== undefined) updateData.final_score = data.finalScore;
      if (data.objections) updateData.objections = data.objections;
      if (data.aiFeedback !== undefined) updateData.ai_feedback = data.aiFeedback;

      const { error } = await supabase
        .from('evaluations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Avaliação atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar avaliação: ' + error.message);
    },
  });
}

export function useDeleteEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evaluations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      toast.success('Avaliação removida com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover avaliação: ' + error.message);
    },
  });
}
