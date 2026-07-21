import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Scores, Objection, AIFeedback, ProspectionResult } from '@/types';
import { toast } from 'sonner';

export interface AIAnalysisResult {
  questionsAsked: string[];
  leadResponses: string[];
  objections: Objection[];
  result: ProspectionResult;
  scores: Scores;
  aiFeedback: AIFeedback;
}

export function useAIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeProspection = async (
    conversationText: string,
    prospectionType: 'Ligação' | 'WhatsApp',
    attachment?: { data: string; mimeType: string; filename: string }
  ): Promise<AIAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('analyze-prospection', {
        body: { conversationText, prospectionType, attachment }
      });

      if (functionError) {
        // Tenta extrair a mensagem real do body (Supabase Functions client não expõe body em erros não-2xx)
        let detailedMessage = functionError.message;
        try {
          const ctx = (functionError as unknown as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) detailedMessage = body.error;
          }
        } catch { /* ignore parse errors */ }
        throw new Error(detailedMessage);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysisResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao analisar prospecção';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setError(null);
  };

  return {
    isAnalyzing,
    analysisResult,
    error,
    analyzeProspection,
    resetAnalysis,
  };
}
