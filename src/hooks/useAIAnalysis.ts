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
    prospectionType: 'Ligação' | 'WhatsApp'
  ): Promise<AIAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('analyze-prospection', {
        body: { conversationText, prospectionType }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
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
