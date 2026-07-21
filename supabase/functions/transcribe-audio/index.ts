import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveGeminiModel } from "../_shared/gemini-model.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;


const ALLOWED_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/aac',
];

// Gemini accepts a smaller set of audio mime types; normalize.
function normalizeMime(mt: string): string {
  const map: Record<string, string> = {
    'audio/mp3': 'audio/mpeg',
    'audio/wave': 'audio/wav',
    'audio/x-wav': 'audio/wav',
    'audio/x-m4a': 'audio/mp4',
    'audio/m4a': 'audio/mp4',
  };
  return map[mt] || mt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada');

    const { audio, mimeType } = await req.json();

    if (!audio || typeof audio !== 'string') {
      return new Response(JSON.stringify({ error: 'Dados de áudio não fornecidos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return new Response(JSON.stringify({ error: 'Formato de áudio inválido. Formatos aceitos: MP3, WAV, M4A, WebM, OGG, FLAC, AAC' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rough size check based on base64 length
    const approxBytes = Math.floor((audio.length * 3) / 4);
    if (approxBytes > MAX_AUDIO_SIZE) {
      return new Response(JSON.stringify({ error: 'Arquivo de áudio muito grande (máximo 25MB)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiMime = normalizeMime(mimeType);

    const model = await resolveGeminiModel(GEMINI_API_KEY);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: 'Transcreva este áudio integralmente em português do Brasil. Retorne APENAS o texto transcrito, sem comentários, cabeçalhos, marcações de tempo ou identificação de falantes. Preserve pontuação natural.' },
            { inline_data: { mime_type: geminiMime, data: audio } },
          ],
        }],
        generationConfig: { temperature: 0 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini transcription error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 403) {
        return new Response(JSON.stringify({ error: 'Chave GEMINI_API_KEY inválida ou sem permissão.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: `Erro do Gemini (${response.status}): ${errText.slice(0, 300)}` }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: { text?: string }) => p.text || '').join('').trim();

    if (!text) {
      console.error('Transcrição vazia:', JSON.stringify(data).slice(0, 500));
      throw new Error('Não foi possível transcrever o áudio');
    }

    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Transcription error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
