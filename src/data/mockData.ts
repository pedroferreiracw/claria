import { SDR, Evaluation, calculateFinalScore, Scores } from '@/types';

export const mockSDRs: SDR[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    squad: 'Águia',
    role: 'SDR Pleno',
    createdAt: new Date('2024-01-15'),
    avatarUrl: undefined,
  },
  {
    id: '2',
    name: 'Ana Santos',
    squad: 'Lobo',
    role: 'SDR Sênior',
    createdAt: new Date('2024-02-01'),
    avatarUrl: undefined,
  },
  {
    id: '3',
    name: 'Pedro Oliveira',
    squad: 'Águia',
    role: 'SDR Júnior',
    createdAt: new Date('2024-03-10'),
    avatarUrl: undefined,
  },
  {
    id: '4',
    name: 'Mariana Costa',
    squad: 'Lobo',
    role: 'SDR Pleno',
    createdAt: new Date('2024-01-20'),
    avatarUrl: undefined,
  },
  {
    id: '5',
    name: 'Lucas Fernandes',
    squad: 'Águia',
    role: 'SDR Sênior',
    createdAt: new Date('2023-11-05'),
    avatarUrl: undefined,
  },
];

const generateScores = (min: number, max: number): Scores => ({
  abertura: Math.floor(Math.random() * (max - min) + min),
  rapport: Math.floor(Math.random() * (max - min) + min),
  spin: Math.floor(Math.random() * (max - min) + min),
  bant: Math.floor(Math.random() * (max - min) + min),
  dores: Math.floor(Math.random() * (max - min) + min),
  geracaoValor: Math.floor(Math.random() * (max - min) + min),
  conducaoAgendamento: Math.floor(Math.random() * (max - min) + min),
  contornoObjecoes: Math.floor(Math.random() * (max - min) + min),
});

export const mockEvaluations: Evaluation[] = [
  {
    id: '1',
    sdrId: '1',
    type: 'Ligação',
    date: new Date('2024-12-01'),
    conversationText: 'Conversa sobre necessidades do cliente...',
    questionsAsked: ['Qual o principal desafio da empresa?', 'Como vocês gerenciam o cardápio hoje?'],
    leadResponses: ['Demora na atualização', 'Excel e papel'],
    result: 'prosseguiu',
    objections: [
      {
        id: '1',
        description: 'Já temos um sistema',
        sdrResponse: 'Entendo, mas nosso sistema integra com diversos PDVs',
        wasEffective: true,
      },
    ],
    scores: generateScores(75, 95),
    finalScore: 0,
    createdAt: new Date('2024-12-01'),
  },
  {
    id: '2',
    sdrId: '2',
    type: 'WhatsApp',
    date: new Date('2024-12-02'),
    conversationText: 'Contato via WhatsApp sobre soluções...',
    questionsAsked: ['Quantos itens tem no cardápio?', 'Qual o faturamento mensal?'],
    leadResponses: ['Mais de 100 itens', 'Em torno de 50k'],
    result: 'prosseguiu',
    objections: [],
    scores: generateScores(80, 100),
    finalScore: 0,
    createdAt: new Date('2024-12-02'),
  },
  {
    id: '3',
    sdrId: '3',
    type: 'Ligação',
    date: new Date('2024-12-03'),
    conversationText: 'Ligação fria para restaurante...',
    questionsAsked: ['Você é o responsável pela gestão?'],
    leadResponses: ['Não, precisa falar com o gerente'],
    result: 'perdeu_interesse',
    objections: [
      {
        id: '2',
        description: 'Não tenho tempo agora',
        sdrResponse: 'Posso ligar em outro momento?',
        wasEffective: false,
      },
    ],
    scores: generateScores(40, 65),
    finalScore: 0,
    createdAt: new Date('2024-12-03'),
  },
  {
    id: '4',
    sdrId: '4',
    type: 'WhatsApp',
    date: new Date('2024-12-04'),
    conversationText: 'Prospecção ativa via WhatsApp...',
    questionsAsked: ['Como está a operação do restaurante?', 'Quantos clientes atendem por dia?'],
    leadResponses: ['Operação está crescendo', 'Cerca de 200 clientes'],
    result: 'prosseguiu',
    objections: [
      {
        id: '3',
        description: 'Está caro',
        sdrResponse: 'Vamos calcular o ROI juntos na reunião',
        wasEffective: true,
      },
    ],
    scores: generateScores(70, 90),
    finalScore: 0,
    createdAt: new Date('2024-12-04'),
  },
  {
    id: '5',
    sdrId: '5',
    type: 'Ligação',
    date: new Date('2024-12-05'),
    conversationText: 'Ligação de follow-up...',
    questionsAsked: ['Conseguiu analisar nossa proposta?', 'Quais pontos ficaram em dúvida?'],
    leadResponses: ['Sim, analisei', 'Preciso entender melhor a integração'],
    result: 'prosseguiu',
    objections: [],
    scores: generateScores(85, 100),
    finalScore: 0,
    createdAt: new Date('2024-12-05'),
  },
];

// Calculate final scores
mockEvaluations.forEach(evaluation => {
  evaluation.finalScore = calculateFinalScore(evaluation.scores);
});

export const getSDRById = (id: string): SDR | undefined => {
  return mockSDRs.find(sdr => sdr.id === id);
};

export const getEvaluationsBySDR = (sdrId: string): Evaluation[] => {
  return mockEvaluations.filter(e => e.sdrId === sdrId);
};

export const getAverageScoreBySDR = (sdrId: string): number => {
  const evaluations = getEvaluationsBySDR(sdrId);
  if (evaluations.length === 0) return 0;
  return Math.round(evaluations.reduce((sum, e) => sum + e.finalScore, 0) / evaluations.length);
};
