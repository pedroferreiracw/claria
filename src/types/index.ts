export type Squad = 'Águia' | 'Lobo';

export type ProspectionType = 'Ligação' | 'WhatsApp';

export type ProspectionResult = 'prosseguiu' | 'recusou' | 'perdeu_interesse';

export interface SDR {
  id: string;
  name: string;
  squad: Squad;
  role: string;
  createdAt: Date;
  avatarUrl?: string;
}

export interface Objection {
  id: string;
  description: string;
  sdrResponse: string;
  wasEffective: boolean;
}

export interface Scores {
  abertura: number;
  rapport: number;
  bant: number;
  dores: number;
  geracaoValor: number;
  conducaoAgendamento: number;
  gatilhoCompromisso: number;
  contornoObjecoes: number;
  comunicacaoOratoria: number;
}

export interface AIFeedback {
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacoesBant: string[];
  recomendacoesProcesso: string[];
  recomendacoesComunicacao: string[];
  analiseObjecoes: {
    objection: string;
    wasEffective: boolean;
    melhorContorno: string;
    respostaIdeal: string;
  }[];
}

export interface Evaluation {
  id: string;
  sdrId: string;
  type: ProspectionType;
  date: Date;
  conversationText?: string;
  audioUrl?: string;
  questionsAsked: string[];
  leadResponses: string[];
  result: ProspectionResult;
  objections: Objection[];
  scores: Scores;
  finalScore: number;
  aiFeedback?: AIFeedback;
  createdAt: Date;
}

export interface DashboardStats {
  totalEvaluations: number;
  averageScore: number;
  topSDRs: { sdr: SDR; score: number }[];
  scoresByCategory: Record<keyof Scores, number>;
  commonObjections: { objection: string; count: number }[];
  weeklyProgress: { week: string; score: number }[];
  monthlyProgress: { month: string; score: number }[];
}

export function getScoreColor(score: number): string {
  if (score === 100) return 'score-purple';
  if (score >= 80) return 'score-green';
  if (score >= 60) return 'score-yellow';
  return 'score-red';
}

export function getScoreBgColor(score: number): string {
  if (score === 100) return 'bg-score-purple';
  if (score >= 80) return 'bg-score-green';
  if (score >= 60) return 'bg-score-yellow';
  return 'bg-score-red';
}

export function calculateFinalScore(scores: Scores): number {
  const weights = {
    abertura: 1,
    rapport: 1,
    bant: 1.5,
    dores: 1.5,
    geracaoValor: 1,
    conducaoAgendamento: 1.5,
    gatilhoCompromisso: 1.5,
    contornoObjecoes: 1.5,
    comunicacaoOratoria: 1,
  };
  
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightedSum = Object.entries(scores).reduce((sum, [key, value]) => {
    return sum + value * weights[key as keyof Scores];
  }, 0);
  
  return Math.round(weightedSum / totalWeight);
}
