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

Sua tarefa é analisar conversas de prospecção (ligação ou WhatsApp) e avaliar o desempenho do SDR.

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

Retorne SEMPRE a análise chamando a função analyze_prospection.`;

const functionDeclaration = {
  name: "analyze_prospection",
  description: "Retorna a análise estruturada da prospecção",
  parameters: {
    type: "object",
    properties: {
      questionsAsked: { type: "array", items: { type: "string" } },
      leadResponses: { type: "array", items: { type: "string" } },
      objections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            description: { type: "string" },
            speaker: { type: "string", description: "Quem fez a objeção (normalmente 'Cliente')" },
            clientQuote: { type: "string", description: "Trecho LITERAL da conversa onde o cliente fez a objeção" },
            sdrResponse: { type: "string", description: "Resposta LITERAL do SDR à objeção" },
            wasEffective: { type: "boolean" },
            aiExplanation: { type: "string", description: "Justificativa da IA para ter considerado a objeção contornada ou não" },
            objectionMessageId: { type: "string", description: "Identificador/índice da mensagem onde a objeção ocorreu (ex: 'msg-14' ou índice)" },
            responseMessageId: { type: "string", description: "Identificador/índice da mensagem da resposta do SDR" },
            objectionStart: { type: "number", description: "Offset inicial (caractere) da objeção no texto original, se aplicável" },
            objectionEnd: { type: "number" },
            responseStart: { type: "number" },
            responseEnd: { type: "number" },
          },
          required: ["id", "description", "clientQuote", "sdrResponse", "wasEffective", "aiExplanation"],
        },
      },
      result: { type: "string", enum: ["prosseguiu", "recusou", "perdeu_interesse"] },
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
        required: ["abertura", "rapport", "bant", "dores", "geracaoValor", "conducaoAgendamento", "gatilhoCompromisso", "contornoObjecoes", "comunicacaoOratoria"],
      },
      aiFeedback: {
        type: "object",
        properties: {
          pontosFortes: { type: "array", items: { type: "string" } },
          pontosFracos: { type: "array", items: { type: "string" } },
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
              },
              required: ["objection", "wasEffective", "melhorContorno", "respostaIdeal"],
            },
          },
        },
        required: ["pontosFortes", "pontosFracos", "recomendacoesBant", "recomendacoesProcesso", "recomendacoesComunicacao", "analiseObjecoes"],
      },
    },
    required: ["questionsAsked", "leadResponses", "objections", "result", "scores", "aiFeedback"],
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
      ? `Analise esta conversa de prospecção (${sanitizedProspectionType}) a partir do arquivo anexado${conversationText ? ` e do texto abaixo:\n\n---\n${conversationText}\n---` : '.'}\n\nExtraia o conteúdo da conversa do arquivo e forneça a avaliação completa chamando analyze_prospection.`
      : `Analise esta conversa de prospecção (${sanitizedProspectionType}) e forneça a avaliação completa chamando analyze_prospection:\n\n---\n${conversationText}\n---`;

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

    return new Response(JSON.stringify(fnCall.args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in analyze-prospection:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
