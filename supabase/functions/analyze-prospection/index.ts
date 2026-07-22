import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveGeminiModel } from "../_shared/gemini-model.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CONVERSATION_LENGTH = 50000;
const ALLOWED_PROSPECTION_TYPES = ['WhatsApp', 'Ligação', 'Email', 'Reunião'];

const systemPrompt = `Você é um especialista em análise de prospecções comerciais da Cardápio Web, empresa de soluções digitais para restaurantes.

Sua tarefa é analisar conversas de prospecção (ligação ou WhatsApp) e avaliar o desempenho do SDR — sempre com EVIDÊNCIAS NAVEGÁVEIS.

CONTEXTO DA EMPRESA:
- Cardápio Web vende soluções digitais para restaurantes
- O objetivo do SDR é agendar reuniões de demonstração
- Metodologia principal: BANT (Budget, Authority, Need, Timeline)

CRITÉRIOS DE AVALIAÇÃO (0-100 cada):
1. Abertura
2. Rapport
3. Aplicação do BANT
4. Identificação de Dores
5. Geração de Valor
6. Condução para Agendamento
7. Gatilho de Compromisso
8. Contorno de Objeções
9. Comunicação e Oratória

PESOS:
- Peso maior (1.5x): BANT, Dores, Condução para Agendamento, Gatilho de Compromisso, Contorno de Objeções
- Peso normal (1.0x): Abertura, Rapport, Geração de Valor, Comunicação e Oratória

PROCESSO OBRIGATÓRIO (em ordem):

PASSO 1 — TIMELINE
Normalize a conversa em turnos cronológicos e retorne em "conversationTimeline":
- turnIndex (0, 1, 2, ...)
- speaker ("SDR" ou "Cliente" quando possível)
- text (fala LITERAL do turno)
- charStart / charEnd (offsets do turno no texto original, quando a entrada for texto)

PASSO 2 — MAPA DA JORNADA
Em "journeyMap", identifique os momentos em que ocorreram os eventos abaixo (não force eventos inexistentes; omita os que não ocorreram):
abertura, apresentacao, rapport, descoberta, levantamento_necessidades, apresentacao_solucao, objecoes, tratamento_objecoes, negociacao, fechamento, proximo_passo, compromisso_assumido, encerramento.

Para CADA evento retorne:
- stage (enum acima)
- position: "inicio" | "meio" | "fim" (posição relativa na conversa completa)
- turnRefs: índices dos turnos envolvidos
- quote: trecho LITERAL da conversa (copiado, sem parafrasear) que fundamenta a identificação
- charStart / charEnd (quando disponível)
- participants: ["SDR"], ["Cliente"] ou ["SDR","Cliente"]
- explanation: 1-3 frases justificando por que classificou como esta etapa

PASSO 3 — AVALIAÇÃO
Aplique os critérios com base na timeline e no mapa.

Para CADA objeção em "objections":
- description, speaker, clientQuote (LITERAL), sdrResponse (LITERAL), wasEffective, aiExplanation
- objectionMessageId / responseMessageId ou turnRefObjection / turnRefResponse
- objectionStart/End, responseStart/End (offsets no texto quando aplicável)
- stage e position (em que etapa da jornada a objeção surgiu)

Em "aiFeedback":
- pontosFortes[] e pontosFracos[]: cada item é um OBJETO com:
    { titulo, quote (trecho literal), stage, turnRef, charStart, charEnd, justificativa }
- analiseObjecoes[]: mantém objection/wasEffective/melhorContorno/respostaIdeal e adiciona:
    stage, position, clientQuote, sdrResponse, turnRefObjection, turnRefResponse,
    charStartObjection, charEndObjection, charStartResponse, charEndResponse,
    justificativaTecnica

PASSO 4 — PDI COMPACTO
Em "aiFeedback.pdi", gere um Plano de Desenvolvimento Individual EXECUTÁVEL, para um feedback rápido de 10-15 minutos.
Formato OBRIGATÓRIO (curto, direto, específico a ESTA prospecção):
- objective: UMA única competência prioritária a desenvolver (ex: "Aplicação do BANT"). Escolha a área mais crítica identificada.
- whatHappened: resumo em NO MÁXIMO 3 linhas do principal erro observado (não genérico — cite o que aconteceu).
- evidence: { quote (trecho LITERAL da conversa que originou o feedback), stage, turnRef, charStart, charEnd } — obrigatório usar dados da timeline/journeyMap.
- actions: NO MÁXIMO 3 ações práticas e específicas que o SDR deve executar nas próximas prospecções (frases curtas, imperativas).
- goal: UMA meta objetiva e mensurável (ex: "Aplicar BANT completo em pelo menos 8 das próximas 10 prospecções").
- successCriteria: indicador claro de evolução (ex: "Nota de Aplicação do BANT maior que 80").

Regras:
- Quotes SEMPRE literais. Nunca parafraseie o cliente ou o SDR.
- Se não houver evidência, NÃO invente. Omita o item.
- PDI deve ser curto e caber em uma única tela — sem textos longos.
- Retorne SEMPRE a análise chamando a função analyze_prospection.`;

const functionDeclaration = {
  name: "analyze_prospection",
  description: "Retorna a análise estruturada da prospecção com evidências navegáveis",
  parameters: {
    type: "object",
    properties: {
      questionsAsked: { type: "array", items: { type: "string" } },
      leadResponses: { type: "array", items: { type: "string" } },
      conversationTimeline: {
        type: "array",
        items: {
          type: "object",
          properties: {
            turnIndex: { type: "number" },
            speaker: { type: "string" },
            text: { type: "string" },
            charStart: { type: "number" },
            charEnd: { type: "number" },
          },
          required: ["turnIndex", "speaker", "text"],
        },
      },
      journeyMap: {
        type: "array",
        items: {
          type: "object",
          properties: {
            stage: {
              type: "string",
              enum: [
                "abertura","apresentacao","rapport","descoberta","levantamento_necessidades",
                "apresentacao_solucao","objecoes","tratamento_objecoes","negociacao",
                "fechamento","proximo_passo","compromisso_assumido","encerramento",
              ],
            },
            position: { type: "string", enum: ["inicio","meio","fim"] },
            turnRefs: { type: "array", items: { type: "number" } },
            quote: { type: "string" },
            charStart: { type: "number" },
            charEnd: { type: "number" },
            participants: { type: "array", items: { type: "string" } },
            explanation: { type: "string" },
          },
          required: ["stage","position","quote","explanation"],
        },
      },
      objections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            description: { type: "string" },
            speaker: { type: "string" },
            clientQuote: { type: "string" },
            sdrResponse: { type: "string" },
            wasEffective: { type: "boolean" },
            aiExplanation: { type: "string" },
            objectionMessageId: { type: "string" },
            responseMessageId: { type: "string" },
            objectionStart: { type: "number" },
            objectionEnd: { type: "number" },
            responseStart: { type: "number" },
            responseEnd: { type: "number" },
            stage: { type: "string" },
            position: { type: "string", enum: ["inicio","meio","fim"] },
            turnRefObjection: { type: "number" },
            turnRefResponse: { type: "number" },
          },
          required: ["id","description","clientQuote","sdrResponse","wasEffective","aiExplanation"],
        },
      },
      result: { type: "string", enum: ["prosseguiu","recusou","perdeu_interesse"] },
      scores: {
        type: "object",
        properties: {
          abertura: { type: "number" },
          rapport: { type: "number" },
          bant: { type: "number" },
          dores: { type: "number" },
          geracaoValor: { type: "number" },
          conducaoAgendamento: { type: "number" },
          gatilhoCompromisso: { type: "number" },
          contornoObjecoes: { type: "number" },
          comunicacaoOratoria: { type: "number" },
        },
        required: ["abertura","rapport","bant","dores","geracaoValor","conducaoAgendamento","gatilhoCompromisso","contornoObjecoes","comunicacaoOratoria"],
      },
      aiFeedback: {
        type: "object",
        properties: {
          pontosFortes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                quote: { type: "string" },
                stage: { type: "string" },
                turnRef: { type: "number" },
                charStart: { type: "number" },
                charEnd: { type: "number" },
                justificativa: { type: "string" },
              },
              required: ["titulo"],
            },
          },
          pontosFracos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                quote: { type: "string" },
                stage: { type: "string" },
                turnRef: { type: "number" },
                charStart: { type: "number" },
                charEnd: { type: "number" },
                justificativa: { type: "string" },
              },
              required: ["titulo"],
            },
          },
          recomendacoesBant: { type: "array", items: { type: "string" } },
          recomendacoesProcesso: { type: "array", items: { type: "string" } },
          recomendacoesComunicacao: { type: "array", items: { type: "string" } },
          analiseObjecoes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                objection: { type: "string" },
                wasEffective: { type: "boolean" },
                melhorContorno: { type: "string" },
                respostaIdeal: { type: "string" },
                stage: { type: "string" },
                position: { type: "string", enum: ["inicio","meio","fim"] },
                clientQuote: { type: "string" },
                sdrResponse: { type: "string" },
                turnRefObjection: { type: "number" },
                turnRefResponse: { type: "number" },
                charStartObjection: { type: "number" },
                charEndObjection: { type: "number" },
                charStartResponse: { type: "number" },
                charEndResponse: { type: "number" },
                justificativaTecnica: { type: "string" },
              },
              required: ["objection","wasEffective","melhorContorno","respostaIdeal"],
            },
          },
          pdi: {
            type: "object",
            properties: {
              objective: { type: "string" },
              whatHappened: { type: "string" },
              evidence: {
                type: "object",
                properties: {
                  quote: { type: "string" },
                  stage: { type: "string" },
                  turnRef: { type: "number" },
                  charStart: { type: "number" },
                  charEnd: { type: "number" },
                },
              },
              actions: { type: "array", items: { type: "string" } },
              goal: { type: "string" },
              successCriteria: { type: "string" },
            },
            required: ["objective", "whatHappened", "actions", "goal", "successCriteria"],
          },
        },
        required: ["pontosFortes","pontosFracos","recomendacoesBant","recomendacoesProcesso","recomendacoesComunicacao","analiseObjecoes","pdi"],
      },
    },
    required: ["questionsAsked","leadResponses","objections","result","scores","aiFeedback"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { conversationText, prospectionType, attachment } = await req.json();
    const hasAttachment = attachment && typeof attachment === 'object' && attachment.data && attachment.mimeType;

    if ((!conversationText || typeof conversationText !== 'string') && !hasAttachment) {
      return new Response(JSON.stringify({ error: "Texto da conversa ou arquivo é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (conversationText && conversationText.length > MAX_CONVERSATION_LENGTH) {
      return new Response(JSON.stringify({ error: `Texto da conversa muito longo (máximo ${MAX_CONVERSATION_LENGTH} caracteres)` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (hasAttachment) {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimes.includes(attachment.mimeType)) {
        return new Response(JSON.stringify({ error: "Formato de arquivo inválido. Use PDF, JPG, JPEG ou PNG." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const sanitizedProspectionType = ALLOWED_PROSPECTION_TYPES.includes(prospectionType) ? prospectionType : 'WhatsApp';

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const textPart = hasAttachment
      ? `Analise esta conversa de prospecção (${sanitizedProspectionType}) a partir do arquivo anexado${conversationText ? ` e do texto abaixo:\n\n---\n${conversationText}\n---` : '.'}\n\nSiga o processo: (1) construir conversationTimeline; (2) construir journeyMap; (3) avaliar. Chame analyze_prospection.`
      : `Analise esta conversa de prospecção (${sanitizedProspectionType}). Siga o processo: (1) conversationTimeline com offsets; (2) journeyMap; (3) avaliação. Chame analyze_prospection.\n\n---\n${conversationText}\n---`;

    const parts: unknown[] = [{ text: textPart }];
    if (hasAttachment) {
      parts.push({ inline_data: { mime_type: attachment.mimeType, data: attachment.data } });
    }

    const model = await resolveGeminiModel(GEMINI_API_KEY);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts }],
        tools: [{ functionDeclarations: [functionDeclaration] }],
        toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["analyze_prospection"] } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 403) {
        return new Response(JSON.stringify({ error: "Chave GEMINI_API_KEY inválida ou sem permissão." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 400) {
        return new Response(JSON.stringify({ error: `Requisição inválida para o Gemini: ${errText.slice(0, 300)}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const partsOut = data?.candidates?.[0]?.content?.parts || [];
    const fnCall = partsOut.find((p: { functionCall?: unknown }) => p.functionCall)?.functionCall;
    if (!fnCall?.args) {
      console.error("Resposta sem functionCall:", JSON.stringify(data).slice(0, 500));
      throw new Error("Resposta da IA não contém análise válida");
    }

    // Move timeline & journeyMap para dentro de aiFeedback para persistir sem migração
    const args = fnCall.args as Record<string, unknown>;
    if (args.aiFeedback && typeof args.aiFeedback === 'object') {
      const fb = args.aiFeedback as Record<string, unknown>;
      if (args.conversationTimeline && !fb.conversationTimeline) fb.conversationTimeline = args.conversationTimeline;
      if (args.journeyMap && !fb.journeyMap) fb.journeyMap = args.journeyMap;
    }

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in analyze-prospection:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
