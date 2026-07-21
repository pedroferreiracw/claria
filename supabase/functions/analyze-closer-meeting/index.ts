import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_MODEL = 'gemini-2.5-flash';

const CLOSER_CRITERIA = `
CRITÉRIOS DE AVALIAÇÃO (30 critérios com pesos):

**ABERTURA E CONTEXTO:**
1. Autoridade (peso 6)
2. Passagem de Bastão (peso 6)
3. Alinhamento de Expectativa (peso 7)
4. Rapport (peso 9)
5. Domínio de Mercado (peso 8)

**INVESTIGAÇÃO SPIN:**
6. [SPIN] Situação (peso 7)
7. [SPIN] Problema (peso 8)
8. [SPIN] Implicação (peso 9)
9. [SPIN] Necessidade de Solução (peso 9)

**DEMONSTRAÇÃO:**
10. Overdelivery (peso 7)
11. Demonstração do Cronograma (peso 7)
12. Formato de Apresentação (peso 7)
13. Domínio da Ferramenta (peso 8)
14. Demonstração de Produto (peso 8)

**FECHAMENTO E ENGAJAMENTO:**
15. Contorno de Objeção (peso 9)
16. Foco no Cliente (peso 8)
17. Perguntas de Fechamento (peso 9)
18. Engajamento do Lead (peso 8)
19. Comunicação do Closer (peso 8)
20. Fechamento de Portas (peso 8)
21. Fechamento (peso 10)
22. Next Step (peso 8)

**CRITÉRIOS EXTRAS:**
23. Checagem na Reunião (peso 7)
24. Influência na Venda de Módulos (peso 7)
25. Influência na Venda de Planos Maiores (peso 7)
26. Pagamento na Reunião (peso 10)
27. Comprometimento Emocional (peso 8)
28. Domínio sobre o Concorrente (peso 8)
29. Indicação (peso 7)
30. Ensinar (peso 7)
`;

const scoreKeys = [
  'autoridade','passagemBastao','alinhamentoExpectativa','rapport','dominioMercado',
  'spinSituation','spinProblem','spinImplication','spinNeed',
  'overdelivery','demonstracaoCronograma','contornoObjecao','formatoApresentacao','focoCliente',
  'dominioFerramenta','demonstracaoProduto','perguntasFechamento','engajamentoLead','comunicacaoCloser',
  'fechamentoPortas','fechamento','nextStep','checagemReuniao','influenciaModulos',
  'influenciaPlanosMaiores','pagamentoReuniao','comprometimentoEmocional','dominioConcorrente','indicacao','ensinar',
];

const scoreProps: Record<string, { type: string }> = {};
for (const k of scoreKeys) scoreProps[k] = { type: 'number' };

const functionDeclaration = {
  name: 'analyze_closer_meeting',
  description: 'Analisa uma reunião de closer',
  parameters: {
    type: 'object',
    properties: {
      scores: { type: 'object', properties: scoreProps, required: scoreKeys },
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
      result: { type: 'string', enum: ['fechou', 'nao_fechou', 'follow_up'] },
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
        required: ['pontosFortes','pontosFracos','recomendacoesSpin','recomendacoesFechamento','recomendacoesDemonstracao','analiseObjecoes'],
      },
    },
    required: ['scores', 'objections', 'result', 'feedback'],
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { transcription } = await req.json();
    if (!transcription || transcription.trim().length < 100) {
      return new Response(JSON.stringify({ error: 'Transcrição muito curta para análise' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada');

    const systemPrompt = `Você é um especialista em análise de reuniões de closers (vendas) do Cardápio Web, plataforma SaaS para restaurantes.

${CLOSER_CRITERIA}

INSTRUÇÕES:
1. Avalie cada um dos 30 critérios de 0 a 100.
2. Identifique objeções e como foram contornadas.
3. Determine resultado: 'fechou', 'nao_fechou' ou 'follow_up'.
4. Forneça feedback construtivo.
Retorne SEMPRE via analyze_closer_meeting.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: `Analise esta reunião de closer:\n\n${transcription}` }] }],
        tools: [{ functionDeclarations: [functionDeclaration] }],
        toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['analyze_closer_meeting'] } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini error:', response.status, errText);
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Limite de requisições excedido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 403) return new Response(JSON.stringify({ error: 'Chave GEMINI_API_KEY inválida.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: `Erro Gemini (${response.status}): ${errText.slice(0, 300)}` }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const fnCall = parts.find((p: { functionCall?: unknown }) => p.functionCall)?.functionCall;
    if (!fnCall?.args) {
      console.error('Sem functionCall:', JSON.stringify(data).slice(0, 500));
      throw new Error('Resposta da IA não contém análise válida');
    }

    return new Response(JSON.stringify(fnCall.args), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in analyze-closer-meeting:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
