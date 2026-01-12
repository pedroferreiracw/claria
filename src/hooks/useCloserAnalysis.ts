import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CloserScores, CloserAIFeedback, CloserObjection } from '@/types/closer';

interface CloserAnalysisResult {
  scores: CloserScores;
  objections: CloserObjection[];
  result: 'fechou' | 'nao_fechou' | 'follow_up';
  feedback: CloserAIFeedback;
}

export function useCloserAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CloserAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeCloserMeeting = async (transcription: string): Promise<CloserAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-closer-meeting', {
        body: { transcription },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Add IDs to objections
      const objectionsWithIds = (data.objections || []).map((obj: any, index: number) => ({
        ...obj,
        id: `obj-${index}-${Date.now()}`,
      }));

      const result: CloserAnalysisResult = {
        scores: data.scores,
        objections: objectionsWithIds,
        result: data.result,
        feedback: data.feedback,
      };

      setAnalysisResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao analisar reunião';
      setError(errorMessage);
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
    analyzeCloserMeeting,
    resetAnalysis,
  };
}
