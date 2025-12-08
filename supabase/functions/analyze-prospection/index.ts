import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Você é um especialista em análise de prospecções comerciais da Cardápio Web, empresa de soluções digitais para restaurantes.

Sua tarefa é analisar conversas de prospecção (ligação ou WhatsApp) e avaliar o desempenho do SDR.

CONTEXTO DA EMPRESA:
- Cardápio Web vende soluções digitais para restaurantes
- O objetivo do SDR é agendar reuniões de demonstração
- Metodologias utilizadas: SPIN Selling e BANT

CRITÉRIOS DE AVALIAÇÃO (0-100 cada):
1. Abertura: Como o SDR iniciou a conversa, captou atenção e se apresentou
2. Rapport: Construção de conexão e relacionamento com o lead
3. Investigação SPIN: Uso de perguntas de Situação, Problema, Implicação e Necessidade de solução
4. Investigação BANT: Qualificação de Budget, Authority, Need e Timeline
5. Identificação de Dores: Capacidade de descobrir as dores reais do cliente
6. Geração de Valor: Apresentação de benefícios e valor da solução
7. Condução para Agendamento: Habilidade de conduzir para o próximo passo (reunião)
8. Contorno de Objeções: Eficácia ao lidar com objeções do lead

REGRAS DE PONTUAÇÃO:
- 0-59: Precisa melhorar significativamente
- 60-79: Atende parcialmente, pode melhorar
- 80-99: Bom desempenho
- 100: Excelente, execução perfeita

Analise a conversa e forneça:
1. Perguntas identificadas que o SDR fez
2. Respostas principais do lead
3. Objeções levantadas (com a resposta do SDR e se foi efetiva)
4. Resultado detectado (prosseguiu para reunião, recusou, ou perdeu interesse)
5. Notas para cada um dos 8 critérios
6. Feedback detalhado com pontos fortes, pontos fracos e recomendações`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationText, prospectionType } = await req.json();

    if (!conversationText) {
      return new Response(
        JSON.stringify({ error: "Texto da conversa é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `Analise esta conversa de prospecção (${prospectionType || "WhatsApp"}) e forneça a avaliação completa:

---
${conversationText}
---

Use a ferramenta analyze_prospection para retornar a análise estruturada.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_prospection",
              description: "Retorna a análise estruturada da prospecção",
              parameters: {
                type: "object",
                properties: {
                  questionsAsked: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de perguntas que o SDR fez durante a conversa"
                  },
                  leadResponses: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista das principais respostas do lead"
                  },
                  objections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        description: { type: "string", description: "A objeção levantada pelo lead" },
                        sdrResponse: { type: "string", description: "Como o SDR respondeu à objeção" },
                        wasEffective: { type: "boolean", description: "Se a resposta foi efetiva em contornar a objeção" }
                      },
                      required: ["id", "description", "sdrResponse", "wasEffective"]
                    },
                    description: "Lista de objeções identificadas na conversa"
                  },
                  result: {
                    type: "string",
                    enum: ["prosseguiu", "recusou", "perdeu_interesse"],
                    description: "Resultado final da prospecção: prosseguiu (agendou reunião), recusou, ou perdeu_interesse"
                  },
                  scores: {
                    type: "object",
                    properties: {
                      abertura: { type: "number", description: "Nota 0-100 para abertura da conversa" },
                      rapport: { type: "number", description: "Nota 0-100 para construção de rapport" },
                      spin: { type: "number", description: "Nota 0-100 para investigação SPIN" },
                      bant: { type: "number", description: "Nota 0-100 para qualificação BANT" },
                      dores: { type: "number", description: "Nota 0-100 para identificação de dores" },
                      geracaoValor: { type: "number", description: "Nota 0-100 para geração de valor" },
                      conducaoAgendamento: { type: "number", description: "Nota 0-100 para condução ao agendamento" },
                      contornoObjecoes: { type: "number", description: "Nota 0-100 para contorno de objeções" }
                    },
                    required: ["abertura", "rapport", "spin", "bant", "dores", "geracaoValor", "conducaoAgendamento", "contornoObjecoes"]
                  },
                  aiFeedback: {
                    type: "object",
                    properties: {
                      pontosFortes: {
                        type: "array",
                        items: { type: "string" },
                        description: "Lista de pontos fortes identificados no desempenho do SDR"
                      },
                      pontosFracos: {
                        type: "array",
                        items: { type: "string" },
                        description: "Lista de pontos fracos a serem melhorados"
                      },
                      recomendacoesSpin: {
                        type: "array",
                        items: { type: "string" },
                        description: "Recomendações específicas para melhorar aplicação do SPIN Selling"
                      },
                      recomendacoesBant: {
                        type: "array",
                        items: { type: "string" },
                        description: "Recomendações específicas para melhorar qualificação BANT"
                      },
                      recomendacoesProcesso: {
                        type: "array",
                        items: { type: "string" },
                        description: "Recomendações gerais para o processo de vendas da Cardápio Web"
                      },
                      analiseObjecoes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            objection: { type: "string" },
                            wasEffective: { type: "boolean" },
                            melhorContorno: { type: "string", description: "Sugestão de como contornar melhor" },
                            respostaIdeal: { type: "string", description: "Resposta ideal para esta objeção" }
                          },
                          required: ["objection", "wasEffective", "melhorContorno", "respostaIdeal"]
                        },
                        description: "Análise detalhada de cada objeção com sugestões de melhoria"
                      }
                    },
                    required: ["pontosFortes", "pontosFracos", "recomendacoesSpin", "recomendacoesBant", "recomendacoesProcesso", "analiseObjecoes"]
                  }
                },
                required: ["questionsAsked", "leadResponses", "objections", "result", "scores", "aiFeedback"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_prospection" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "analyze_prospection") {
      throw new Error("Invalid AI response structure");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-prospection:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
