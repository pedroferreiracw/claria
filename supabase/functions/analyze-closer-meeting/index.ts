import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLOSER_CRITERIA = `
CRITÉRIOS DE AVALIAÇÃO (30 critérios com pesos):

**ABERTURA E CONTEXTO:**
1. Autoridade (peso 6): O closer demonstra autoridade e confiança desde o início?
2. Passagem de Bastão (peso 6): A transição do SDR para o closer foi bem conduzida?
3. Alinhamento de Expectativa (peso 7): As expectativas da reunião foram alinhadas claramente?
4. Rapport (peso 9): O closer construiu conexão genuína com o lead?
5. Domínio de Mercado (peso 8): Demonstrou conhecimento profundo do mercado/segmento?

**INVESTIGAÇÃO SPIN:**
6. [SPIN] Situação (peso 7): Fez perguntas para entender o contexto atual do cliente?
7. [SPIN] Problema (peso 8): Identificou problemas e dores específicas?
8. [SPIN] Implicação (peso 9): Explorou as consequências dos problemas identificados?
9. [SPIN] Necessidade de Solução (peso 9): Fez o cliente verbalizar a necessidade de mudança?

**DEMONSTRAÇÃO:**
10. Overdelivery (peso 7): Entregou mais valor do que o esperado na apresentação?
11. Demonstração do Cronograma (peso 7): Apresentou timeline de implementação de forma clara?
12. Formato de Apresentação (peso 7): A estrutura e organização da apresentação foi adequada?
13. Domínio da Ferramenta (peso 8): Demonstrou expertise no uso da plataforma?
14. Demonstração de Produto (peso 8): A demonstração foi relevante e personalizada?

**FECHAMENTO E ENGAJAMENTO:**
15. Contorno de Objeção (peso 9): Contornou objeções de forma eficaz?
16. Foco no Cliente (peso 8): Manteve a conversa centrada nas necessidades do cliente?
17. Perguntas de Fechamento (peso 9): Fez perguntas que conduzem ao fechamento?
18. Engajamento do Lead (peso 8): Manteve o lead engajado e participativo?
19. Comunicação do Closer (peso 8): Comunicou-se de forma clara, objetiva e persuasiva?
20. Fechamento de Portas (peso 8): Fechou alternativas para conduzir à decisão?
21. Fechamento (peso 10): Conduziu ao fechamento de forma assertiva?
22. Next Step (peso 8): Definiu próximos passos claros?

**CRITÉRIOS EXTRAS:**
23. Checagem na Reunião (peso 7): Verificou entendimento ao longo da reunião?
24. Influência na Venda de Módulos (peso 7): Influenciou a compra de módulos adicionais?
25. Influência na Venda de Planos Maiores (peso 7): Conduziu para planos de maior valor?
26. Pagamento na Reunião (peso 10): Conseguiu o pagamento durante a reunião?
27. Comprometimento Emocional (peso 8): Gerou conexão emocional com a solução?
28. Domínio sobre o Concorrente (peso 8): Demonstrou conhecimento dos concorrentes?
29. Indicação (peso 7): Solicitou ou incentivou indicações?
30. Ensinar (peso 7): Educou o cliente sobre o mercado/produto?
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription } = await req.json();
    
    if (!transcription || transcription.trim().length < 100) {
      return new Response(
        JSON.stringify({ error: 'Transcrição muito curta para análise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const systemPrompt = `Você é um especialista em análise de reuniões de vendas (closers) do Cardápio Web, uma plataforma SaaS para restaurantes.

CONTEXTO:
- O closer realiza demonstrações por vídeo chamada com leads qualificados
- O objetivo principal é o FECHAMENTO DA VENDA (pagamento do plano)
- Diferente de SDRs, closers focam em demonstração, negociação e fechamento
- O processo inclui metodologia SPIN Selling adaptada para fechamento

${CLOSER_CRITERIA}

INSTRUÇÕES:
1. Analise a transcrição da reunião do closer
2. Avalie cada um dos 30 critérios de 0 a 100
3. Identifique objeções apresentadas e como foram contornadas
4. Determine o resultado: 'fechou', 'nao_fechou', ou 'follow_up'
5. Forneça feedback construtivo e acionável

REGRAS DE PONTUAÇÃO:
- 100: Execução perfeita, modelo a ser seguido
- 80-99: Excelente, poucas melhorias possíveis
- 60-79: Bom, mas com pontos de melhoria identificáveis
- 40-59: Regular, precisa de desenvolvimento
- 0-39: Fraco, precisa de treinamento significativo`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise esta reunião de closer:\n\n${transcription}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_closer_meeting',
            description: 'Analisa uma reunião de closer e retorna scores, objeções e feedback',
            parameters: {
              type: 'object',
              properties: {
                scores: {
                  type: 'object',
                  properties: {
                    autoridade: { type: 'number', minimum: 0, maximum: 100 },
                    passagemBastao: { type: 'number', minimum: 0, maximum: 100 },
                    alinhamentoExpectativa: { type: 'number', minimum: 0, maximum: 100 },
                    rapport: { type: 'number', minimum: 0, maximum: 100 },
                    dominioMercado: { type: 'number', minimum: 0, maximum: 100 },
                    spinSituation: { type: 'number', minimum: 0, maximum: 100 },
                    spinProblem: { type: 'number', minimum: 0, maximum: 100 },
                    spinImplication: { type: 'number', minimum: 0, maximum: 100 },
                    spinNeed: { type: 'number', minimum: 0, maximum: 100 },
                    overdelivery: { type: 'number', minimum: 0, maximum: 100 },
                    demonstracaoCronograma: { type: 'number', minimum: 0, maximum: 100 },
                    contornoObjecao: { type: 'number', minimum: 0, maximum: 100 },
                    formatoApresentacao: { type: 'number', minimum: 0, maximum: 100 },
                    focoCliente: { type: 'number', minimum: 0, maximum: 100 },
                    dominioFerramenta: { type: 'number', minimum: 0, maximum: 100 },
                    demonstracaoProduto: { type: 'number', minimum: 0, maximum: 100 },
                    perguntasFechamento: { type: 'number', minimum: 0, maximum: 100 },
                    engajamentoLead: { type: 'number', minimum: 0, maximum: 100 },
                    comunicacaoCloser: { type: 'number', minimum: 0, maximum: 100 },
                    fechamentoPortas: { type: 'number', minimum: 0, maximum: 100 },
                    fechamento: { type: 'number', minimum: 0, maximum: 100 },
                    nextStep: { type: 'number', minimum: 0, maximum: 100 },
                    checagemReuniao: { type: 'number', minimum: 0, maximum: 100 },
                    influenciaModulos: { type: 'number', minimum: 0, maximum: 100 },
                    influenciaPlanosMaiores: { type: 'number', minimum: 0, maximum: 100 },
                    pagamentoReuniao: { type: 'number', minimum: 0, maximum: 100 },
                    comprometimentoEmocional: { type: 'number', minimum: 0, maximum: 100 },
                    dominioConcorrente: { type: 'number', minimum: 0, maximum: 100 },
                    indicacao: { type: 'number', minimum: 0, maximum: 100 },
                    ensinar: { type: 'number', minimum: 0, maximum: 100 },
                  },
                  required: ['autoridade', 'passagemBastao', 'alinhamentoExpectativa', 'rapport', 'dominioMercado', 'spinSituation', 'spinProblem', 'spinImplication', 'spinNeed', 'overdelivery', 'demonstracaoCronograma', 'contornoObjecao', 'formatoApresentacao', 'focoCliente', 'dominioFerramenta', 'demonstracaoProduto', 'perguntasFechamento', 'engajamentoLead', 'comunicacaoCloser', 'fechamentoPortas', 'fechamento', 'nextStep', 'checagemReuniao', 'influenciaModulos', 'influenciaPlanosMaiores', 'pagamentoReuniao', 'comprometimentoEmocional', 'dominioConcorrente', 'indicacao', 'ensinar'],
                },
                objections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      closerResponse: { type: 'string' },
                      wasEffective: { type: 'boolean' },
                    },
                    required: ['description', 'closerResponse', 'wasEffective'],
                  },
                },
                result: {
                  type: 'string',
                  enum: ['fechou', 'nao_fechou', 'follow_up'],
                },
                feedback: {
                  type: 'object',
                  properties: {
                    pontosFortes: { type: 'array', items: { type: 'string' } },
                    pontosFracos: { type: 'array', items: { type: 'string' } },
                    recomendacoesSpin: { type: 'array', items: { type: 'string' } },
                    recomendacoesFechamento: { type: 'array', items: { type: 'string' } },
                    recomendacoesDemonstracao: { type: 'array', items: { type: 'string' } },
                    analiseObjecoes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          objection: { type: 'string' },
                          wasEffective: { type: 'boolean' },
                          melhorContorno: { type: 'string' },
                          respostaIdeal: { type: 'string' },
                        },
                        required: ['objection', 'wasEffective', 'melhorContorno', 'respostaIdeal'],
                      },
                    },
                  },
                  required: ['pontosFortes', 'pontosFracos', 'recomendacoesSpin', 'recomendacoesFechamento', 'recomendacoesDemonstracao', 'analiseObjecoes'],
                },
              },
              required: ['scores', 'objections', 'result', 'feedback'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_closer_meeting' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('Resposta da IA não contém análise válida');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-closer-meeting:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
