export type CloserEvaluationResult = 'fechou' | 'nao_fechou' | 'follow_up';

export interface CloserScores {
  autoridade: number;
  passagemBastao: number;
  alinhamentoExpectativa: number;
  rapport: number;
  dominioMercado: number;
  spinSituation: number;
  spinProblem: number;
  spinImplication: number;
  spinNeed: number;
  overdelivery: number;
  demonstracaoCronograma: number;
  contornoObjecao: number;
  formatoApresentacao: number;
  focoCliente: number;
  dominioFerramenta: number;
  demonstracaoProduto: number;
  perguntasFechamento: number;
  engajamentoLead: number;
  comunicacaoCloser: number;
  fechamentoPortas: number;
  fechamento: number;
  nextStep: number;
  checagemReuniao: number;
  influenciaModulos: number;
  influenciaPlanosMaiores: number;
  pagamentoReuniao: number;
  comprometimentoEmocional: number;
  dominioConcorrente: number;
  indicacao: number;
  ensinar: number;
}

export interface CloserAIFeedback {
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacoesSpin: string[];
  recomendacoesFechamento: string[];
  recomendacoesDemonstracao: string[];
  analiseObjecoes: {
    objection: string;
    wasEffective: boolean;
    melhorContorno: string;
    respostaIdeal: string;
  }[];
}

export interface CloserObjection {
  id: string;
  description: string;
  closerResponse: string;
  wasEffective: boolean;
}

export interface CloserEvaluation {
  id: string;
  closerId: string;
  date: Date;
  videoUrl?: string;
  transcription?: string;
  scores: CloserScores;
  finalScore: number;
  result: CloserEvaluationResult;
  objections: CloserObjection[];
  aiFeedback?: CloserAIFeedback;
  meetingDurationMinutes?: number;
  dealValue?: number;
  planSold?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CLOSER_SCORE_WEIGHTS: Record<keyof CloserScores, number> = {
  autoridade: 6,
  passagemBastao: 6,
  alinhamentoExpectativa: 7,
  rapport: 9,
  dominioMercado: 8,
  spinSituation: 7,
  spinProblem: 8,
  spinImplication: 9,
  spinNeed: 9,
  overdelivery: 7,
  demonstracaoCronograma: 7,
  contornoObjecao: 9,
  formatoApresentacao: 7,
  focoCliente: 8,
  dominioFerramenta: 8,
  demonstracaoProduto: 8,
  perguntasFechamento: 9,
  engajamentoLead: 8,
  comunicacaoCloser: 8,
  fechamentoPortas: 8,
  fechamento: 10,
  nextStep: 8,
  checagemReuniao: 7,
  influenciaModulos: 7,
  influenciaPlanosMaiores: 7,
  pagamentoReuniao: 10,
  comprometimentoEmocional: 8,
  dominioConcorrente: 8,
  indicacao: 7,
  ensinar: 7,
};

export const CLOSER_SCORE_LABELS: Record<keyof CloserScores, string> = {
  autoridade: 'Autoridade',
  passagemBastao: 'Passagem de Bastão',
  alinhamentoExpectativa: 'Alinhamento de Expectativa',
  rapport: 'Rapport',
  dominioMercado: 'Domínio de Mercado',
  spinSituation: '[SPIN] Situação',
  spinProblem: '[SPIN] Problema',
  spinImplication: '[SPIN] Implicação',
  spinNeed: '[SPIN] Necessidade de Solução',
  overdelivery: 'Overdelivery',
  demonstracaoCronograma: 'Demonstração do Cronograma',
  contornoObjecao: 'Contorno de Objeção',
  formatoApresentacao: 'Formato de Apresentação',
  focoCliente: 'Foco no Cliente',
  dominioFerramenta: 'Domínio da Ferramenta',
  demonstracaoProduto: 'Demonstração de Produto',
  perguntasFechamento: 'Perguntas de Fechamento',
  engajamentoLead: 'Engajamento do Lead',
  comunicacaoCloser: 'Comunicação do Closer',
  fechamentoPortas: 'Fechamento de Portas',
  fechamento: 'Fechamento',
  nextStep: 'Next Step',
  checagemReuniao: 'Checagem na Reunião',
  influenciaModulos: 'Influência na Venda de Módulos',
  influenciaPlanosMaiores: 'Influência na Venda de Planos Maiores',
  pagamentoReuniao: 'Pagamento na Reunião',
  comprometimentoEmocional: 'Comprometimento Emocional',
  dominioConcorrente: 'Domínio sobre o Concorrente',
  indicacao: 'Indicação',
  ensinar: 'Ensinar',
};

export const CLOSER_SCORE_CATEGORIES = {
  abertura: ['autoridade', 'passagemBastao', 'alinhamentoExpectativa', 'rapport', 'dominioMercado'] as (keyof CloserScores)[],
  spin: ['spinSituation', 'spinProblem', 'spinImplication', 'spinNeed'] as (keyof CloserScores)[],
  demonstracao: ['overdelivery', 'demonstracaoCronograma', 'formatoApresentacao', 'dominioFerramenta', 'demonstracaoProduto'] as (keyof CloserScores)[],
  fechamento: ['contornoObjecao', 'focoCliente', 'perguntasFechamento', 'engajamentoLead', 'comunicacaoCloser', 'fechamentoPortas', 'fechamento', 'nextStep'] as (keyof CloserScores)[],
  extras: ['checagemReuniao', 'influenciaModulos', 'influenciaPlanosMaiores', 'pagamentoReuniao', 'comprometimentoEmocional', 'dominioConcorrente', 'indicacao', 'ensinar'] as (keyof CloserScores)[],
};

export const CLOSER_CATEGORY_LABELS: Record<string, string> = {
  abertura: 'Abertura e Contexto',
  spin: 'Investigação SPIN',
  demonstracao: 'Demonstração',
  fechamento: 'Fechamento e Engajamento',
  extras: 'Critérios Extras',
};

export function calculateCloserFinalScore(scores: CloserScores): number {
  const totalWeight = Object.values(CLOSER_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
  const weightedSum = Object.entries(scores).reduce((sum, [key, value]) => {
    return sum + value * CLOSER_SCORE_WEIGHTS[key as keyof CloserScores];
  }, 0);
  
  return Math.round(weightedSum / totalWeight);
}

export function getCloserScoreColor(score: number): string {
  if (score === 100) return 'text-purple-500';
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

export function getCloserScoreBgColor(score: number): string {
  if (score === 100) return 'bg-purple-500/20';
  if (score >= 80) return 'bg-green-500/20';
  if (score >= 60) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
}
