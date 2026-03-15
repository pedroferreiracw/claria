import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 5;
const DELAY_BETWEEN_ANALYSES_MS = 2000;
const MIN_MESSAGES = 5;

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
- 100: Excelente, execução perfeita`;

const toolDefinition = {
  type: "function",
  function: {
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
              sdrResponse: { type: "string" },
              wasEffective: { type: "boolean" }
            },
            required: ["id", "description", "sdrResponse", "wasEffective"]
          }
        },
        result: { type: "string", enum: ["prosseguiu", "recusou", "perdeu_interesse"] },
        scores: {
          type: "object",
          properties: {
            abertura: { type: "number" },
            rapport: { type: "number" },
            spin: { type: "number" },
            bant: { type: "number" },
            dores: { type: "number" },
            geracaoValor: { type: "number" },
            conducaoAgendamento: { type: "number" },
            contornoObjecoes: { type: "number" }
          },
          required: ["abertura", "rapport", "spin", "bant", "dores", "geracaoValor", "conducaoAgendamento", "contornoObjecoes"]
        },
        aiFeedback: {
          type: "object",
          properties: {
            pontosFortes: { type: "array", items: { type: "string" } },
            pontosFracos: { type: "array", items: { type: "string" } },
            recomendacoesSpin: { type: "array", items: { type: "string" } },
            recomendacoesBant: { type: "array", items: { type: "string" } },
            recomendacoesProcesso: { type: "array", items: { type: "string" } },
            analiseObjecoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  objection: { type: "string" },
                  wasEffective: { type: "boolean" },
                  melhorContorno: { type: "string" },
                  respostaIdeal: { type: "string" }
                },
                required: ["objection", "wasEffective", "melhorContorno", "respostaIdeal"]
              }
            }
          },
          required: ["pontosFortes", "pontosFracos", "recomendacoesSpin", "recomendacoesBant", "recomendacoesProcesso", "analiseObjecoes"]
        }
      },
      required: ["questionsAsked", "leadResponses", "objections", "result", "scores", "aiFeedback"]
    }
  }
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Find unanalyzed conversations with enough messages
    const { data: conversations, error: convError } = await supabase
      .from('kommo_conversations')
      .select('id, kommo_id, sdr_id, lead_name, messages_count')
      .is('ai_analysis_id', null)
      .gte('messages_count', MIN_MESSAGES)
      .order('synced_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (convError) throw convError;
    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ success: true, analyzed: 0, message: 'No conversations to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${conversations.length} conversations to analyze`);
    let analyzed = 0;

    for (const conv of conversations) {
      try {
        // Fetch messages
        const { data: messages } = await supabase
          .from('kommo_messages')
          .select('sender_type, sender_name, content, sent_at')
          .eq('conversation_id', conv.id)
          .order('sent_at', { ascending: true });

        if (!messages || messages.length < MIN_MESSAGES) continue;

        const conversationText = messages
          .map(m => `${m.sender_type === 'sdr' ? 'SDR' : 'Lead'} (${m.sender_name || ''}): ${m.content}`)
          .join('\n');

        // Call AI
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Analise esta conversa de prospecção (WhatsApp):\n\n---\n${conversationText}\n---\n\nUse a ferramenta analyze_prospection para retornar a análise estruturada.` },
            ],
            tools: [toolDefinition],
            tool_choice: { type: "function", function: { name: "analyze_prospection" } }
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for conv ${conv.id}: ${aiResponse.status}`);
          if (aiResponse.status === 429) {
            console.log('Rate limited, stopping batch');
            break;
          }
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          console.error(`No tool call in AI response for conv ${conv.id}`);
          continue;
        }

        const analysis = JSON.parse(toolCall.function.arguments);
        const scores = analysis.scores;
        const scoreValues = Object.values(scores) as number[];
        const finalScore = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);

        // Save to kommo_analyses
        const { data: analysisData, error: analysisError } = await supabase
          .from('kommo_analyses')
          .upsert({
            conversation_id: conv.id,
            sdr_id: conv.sdr_id,
            scores: analysis.scores,
            ai_feedback: analysis.aiFeedback,
            objections: analysis.objections,
            result: analysis.result,
            final_score: finalScore,
            analyzed_at: new Date().toISOString(),
          }, { onConflict: 'conversation_id' })
          .select('id')
          .single();

        if (analysisError) {
          console.error(`Error saving analysis for conv ${conv.id}:`, analysisError);
          continue;
        }

        // Create evaluation record linked to SDR (if SDR is known)
        let evaluationId = null;
        if (conv.sdr_id) {
          const { data: evalData } = await supabase
            .from('evaluations')
            .insert({
              sdr_id: conv.sdr_id,
              type: 'WhatsApp',
              result: analysis.result,
              scores: analysis.scores,
              final_score: finalScore,
              objections: analysis.objections,
              questions_asked: analysis.questionsAsked || [],
              lead_responses: analysis.leadResponses || [],
              ai_feedback: analysis.aiFeedback,
              conversation_text: conversationText.substring(0, 10000),
            })
            .select('id')
            .single();

          if (evalData) {
            evaluationId = evalData.id;
            await supabase
              .from('kommo_analyses')
              .update({ evaluation_id: evaluationId })
              .eq('id', analysisData.id);
          }
        }

        // Update conversation with analysis link
        await supabase
          .from('kommo_conversations')
          .update({ ai_analysis_id: analysisData.id })
          .eq('id', conv.id);

        analyzed++;
        console.log(`Analyzed conversation ${conv.id} (${conv.lead_name}): score ${finalScore}`);

        // Delay between analyses
        if (analyzed < conversations.length) {
          await delay(DELAY_BETWEEN_ANALYSES_MS);
        }

      } catch (convError) {
        console.error(`Error analyzing conv ${conv.id}:`, convError);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ success: true, analyzed, total: conversations.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-analyze error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
