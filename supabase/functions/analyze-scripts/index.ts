import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `Você é um especialista em análise de scripts de vendas e prospecção. Sua tarefa é analisar conversas de prospecção e identificar padrões de sucesso e áreas de melhoria.

Analise as conversas fornecidas e retorne um JSON com:
1. patterns: Array de padrões de sucesso identificados (frases, abordagens, técnicas que funcionam bem)
2. improvements: Array de áreas que podem ser melhoradas
3. recommendations: Array de recomendações práticas para o time
4. best_phrases: Array das melhores frases/abordagens encontradas
5. common_objections: Array de objeções mais comuns e como foram tratadas
6. score_analysis: Análise das pontuações por fase

Seja específico e prático nas recomendações.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sdr_id, period_days = 30 } = await req.json();

    console.log('Analyzing scripts for SDR:', sdr_id, 'Period:', period_days, 'days');

    // Fetch recent evaluations
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period_days);

    let query = supabase
      .from('evaluations')
      .select('conversation_text, scores, final_score, result, type')
      .gte('created_at', startDate.toISOString())
      .not('conversation_text', 'is', null);

    if (sdr_id) {
      query = query.eq('sdr_id', sdr_id);
    }

    const { data: evaluations, error: evalError } = await query.limit(50);

    if (evalError) {
      console.error('Error fetching evaluations:', evalError);
      throw new Error('Erro ao buscar avaliações');
    }

    if (!evaluations || evaluations.length === 0) {
      return new Response(
        JSON.stringify({ 
          patterns: [],
          improvements: ['Não há avaliações suficientes para análise'],
          recommendations: ['Registre mais avaliações para obter insights'],
          best_phrases: [],
          common_objections: [],
          score_analysis: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare conversations for analysis
    const conversationsText = evaluations.map((e, i) => {
      const scores = typeof e.scores === 'object' ? JSON.stringify(e.scores) : e.scores;
      return `
--- Conversa ${i + 1} ---
Tipo: ${e.type}
Resultado: ${e.result}
Nota Final: ${e.final_score}
Scores: ${scores}
Texto:
${e.conversation_text}
`;
    }).join('\n');

    const userPrompt = `Analise as seguintes ${evaluations.length} conversas de prospecção e identifique padrões de sucesso, áreas de melhoria e recomendações práticas:

${conversationsText}

Retorne sua análise em formato JSON válido.`;

    console.log('Sending to OpenAI for analysis...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`Erro da API OpenAI: ${response.status}`);
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Analysis error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
