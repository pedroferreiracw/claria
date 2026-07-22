export type Squad = 'Águia' | 'Lobo' | 'Sharks' | 'Serpentes';

export type ProspectionType = 'Ligação' | 'WhatsApp';

export type ProspectionResult = 'prosseguiu' | 'recusou' | 'perdeu_interesse';

export interface SDR {
  id: string;
  name: string;
  squad: Squad;
  role: string;
  createdAt: Date;
  avatarUrl?: string;
  isActive?: boolean;
}

export type JourneyStage =
  | 'abertura'
  | 'apresentacao'
  | 'rapport'
  | 'descoberta'
  | 'levantamento_necessidades'
  | 'apresentacao_solucao'
  | 'objecoes'
  | 'tratamento_objecoes'
  | 'negociacao'
  | 'fechamento'
  | 'proximo_passo'
  | 'compromisso_assumido'
  | 'encerramento';

export type JourneyPosition = 'inicio' | 'meio' | 'fim';

export interface ConversationTurn {
  turnIndex: number;
  speaker: string;
  text: string;
  charStart?: number;
  charEnd?: number;
}

export interface JourneyEvent {
  stage: JourneyStage;
  position: JourneyPosition;
  turnRefs?: number[];
  quote: string;
  charStart?: number;
  charEnd?: number;
  participants?: string[];
  explanation: string;
}

export interface FeedbackItemObject {
  titulo: string;
  quote?: string;
  stage?: JourneyStage;
  turnRef?: number;
  charStart?: number;
  charEnd?: number;
  justificativa?: string;
}

/** Compat: avaliações antigas salvam string; novas salvam objeto. */
export type FeedbackItem = string | FeedbackItemObject;

export interface Objection {
  id: string;
  description: string;
  sdrResponse: string;
  wasEffective: boolean;
  speaker?: string;
  clientQuote?: string;
  aiExplanation?: string;
  objectionMessageId?: string;
  responseMessageId?: string;
  objectionStart?: number;
  objectionEnd?: number;
  responseStart?: number;
  responseEnd?: number;
  stage?: JourneyStage;
  position?: JourneyPosition;
  turnRefObjection?: number;
  turnRefResponse?: number;
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

export interface ObjectionAnalysis {
  objection: string;
  wasEffective: boolean;
  melhorContorno: string;
  respostaIdeal: string;
  stage?: JourneyStage;
  position?: JourneyPosition;
  clientQuote?: string;
  sdrResponse?: string;
  turnRefObjection?: number;
  turnRefResponse?: number;
  charStartObjection?: number;
  charEndObjection?: number;
  charStartResponse?: number;
  charEndResponse?: number;
  justificativaTecnica?: string;
}

export interface PDIEvidence {
  quote?: string;
  stage?: JourneyStage;
  turnRef?: number;
  charStart?: number;
  charEnd?: number;
}

export interface PDISuggestion {
  objective: string;
  whatHappened: string;
  evidence?: PDIEvidence;
  actions: string[];
  goal: string;
  successCriteria: string;
}

export interface AIFeedback {
  pontosFortes: FeedbackItem[];
  pontosFracos: FeedbackItem[];
  recomendacoesBant: string[];
  recomendacoesProcesso: string[];
  recomendacoesComunicacao: string[];
  analiseObjecoes: ObjectionAnalysis[];
  conversationTimeline?: ConversationTurn[];
  journeyMap?: JourneyEvent[];
  pdi?: PDISuggestion;
}

export function feedbackTitle(item: FeedbackItem): string {
  return typeof item === 'string' ? item : item.titulo;
}
export function feedbackEvidence(item: FeedbackItem): FeedbackItemObject | null {
  return typeof item === 'string' ? null : item;
}

export const journeyStageLabels: Record<JourneyStage, string> = {
  abertura: 'Abertura',
  apresentacao: 'Apresentação',
  rapport: 'Rapport',
  descoberta: 'Descoberta',
  levantamento_necessidades: 'Levantamento de Necessidades',
  apresentacao_solucao: 'Apresentação da Solução',
  objecoes: 'Objeções',
  tratamento_objecoes: 'Tratamento de Objeções',
  negociacao: 'Negociação',
  fechamento: 'Fechamento',
  proximo_passo: 'Próximo Passo',
  compromisso_assumido: 'Compromisso Assumido',
  encerramento: 'Encerramento',
};

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
