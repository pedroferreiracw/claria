import React, { createContext, useContext, ReactNode } from 'react';
import { SDR, Evaluation } from '@/types';
import { useSDRs, useAddSDR, useUpdateSDR, useDeleteSDR } from '@/hooks/useSDRs';
import { useEvaluations, useAddEvaluation, useUpdateEvaluation, useDeleteEvaluation } from '@/hooks/useEvaluations';

interface AppContextType {
  sdrs: SDR[];
  evaluations: Evaluation[];
  isLoading: boolean;
  addSDR: (sdr: Omit<SDR, 'id' | 'createdAt'>) => void;
  updateSDR: (id: string, data: Partial<SDR>) => void;
  deleteSDR: (id: string) => void;
  addEvaluation: (evaluation: Omit<Evaluation, 'id' | 'createdAt'>) => Promise<Evaluation>;
  updateEvaluation: (id: string, data: Partial<Evaluation>) => void;
  deleteEvaluation: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: sdrs = [], isLoading: loadingSDRs } = useSDRs();
  const { data: evaluations = [], isLoading: loadingEvaluations } = useEvaluations();
  
  const addSDRMutation = useAddSDR();
  const updateSDRMutation = useUpdateSDR();
  const deleteSDRMutation = useDeleteSDR();
  
  const addEvaluationMutation = useAddEvaluation();
  const updateEvaluationMutation = useUpdateEvaluation();
  const deleteEvaluationMutation = useDeleteEvaluation();

  const addSDR = (sdrData: Omit<SDR, 'id' | 'createdAt'>) => {
    addSDRMutation.mutate(sdrData);
  };

  const updateSDR = (id: string, data: Partial<SDR>) => {
    updateSDRMutation.mutate({ id, data });
  };

  const deleteSDR = (id: string) => {
    deleteSDRMutation.mutate(id);
  };

  const addEvaluation = (evaluationData: Omit<Evaluation, 'id' | 'createdAt'>) => {
    addEvaluationMutation.mutate(evaluationData);
  };

  const updateEvaluation = (id: string, data: Partial<Evaluation>) => {
    updateEvaluationMutation.mutate({ id, data });
  };

  const deleteEvaluation = (id: string) => {
    deleteEvaluationMutation.mutate(id);
  };

  return (
    <AppContext.Provider value={{
      sdrs,
      evaluations,
      isLoading: loadingSDRs || loadingEvaluations,
      addSDR,
      updateSDR,
      deleteSDR,
      addEvaluation,
      updateEvaluation,
      deleteEvaluation,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
