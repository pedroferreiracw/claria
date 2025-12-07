import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SDR, Evaluation } from '@/types';
import { mockSDRs, mockEvaluations } from '@/data/mockData';

interface AppContextType {
  sdrs: SDR[];
  evaluations: Evaluation[];
  addSDR: (sdr: Omit<SDR, 'id' | 'createdAt'>) => void;
  updateSDR: (id: string, data: Partial<SDR>) => void;
  deleteSDR: (id: string) => void;
  addEvaluation: (evaluation: Omit<Evaluation, 'id' | 'createdAt'>) => void;
  updateEvaluation: (id: string, data: Partial<Evaluation>) => void;
  deleteEvaluation: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sdrs, setSDRs] = useState<SDR[]>(mockSDRs);
  const [evaluations, setEvaluations] = useState<Evaluation[]>(mockEvaluations);

  const addSDR = (sdrData: Omit<SDR, 'id' | 'createdAt'>) => {
    const newSDR: SDR = {
      ...sdrData,
      id: String(Date.now()),
      createdAt: new Date(),
    };
    setSDRs(prev => [...prev, newSDR]);
  };

  const updateSDR = (id: string, data: Partial<SDR>) => {
    setSDRs(prev => prev.map(sdr => sdr.id === id ? { ...sdr, ...data } : sdr));
  };

  const deleteSDR = (id: string) => {
    setSDRs(prev => prev.filter(sdr => sdr.id !== id));
  };

  const addEvaluation = (evaluationData: Omit<Evaluation, 'id' | 'createdAt'>) => {
    const newEvaluation: Evaluation = {
      ...evaluationData,
      id: String(Date.now()),
      createdAt: new Date(),
    };
    setEvaluations(prev => [...prev, newEvaluation]);
  };

  const updateEvaluation = (id: string, data: Partial<Evaluation>) => {
    setEvaluations(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deleteEvaluation = (id: string) => {
    setEvaluations(prev => prev.filter(e => e.id !== id));
  };

  return (
    <AppContext.Provider value={{
      sdrs,
      evaluations,
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
