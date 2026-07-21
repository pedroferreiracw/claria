// Resolve dinamicamente o melhor modelo Gemini disponível para a GEMINI_API_KEY.
// Consulta ListModels, filtra estáveis+multimodais e escolhe por prioridade.

interface GeminiModel {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

let cachedModel: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

// Exclui não-produção / domínio específico
const EXCLUDE_REGEX = /(preview|experimental|-exp|tts|image|robotics|computer-use|deep-research|antigravity|lyria|gemma|nano-banana|-latest)/i;

// Prioridade por família (maior = melhor). Preferimos "flash" (custo-benefício) sobre lite/pro.
function scoreModel(id: string): number {
  let score = 0;
  const genMatch = id.match(/gemini-(\d+)\.?(\d+)?/);
  if (genMatch) {
    const major = parseInt(genMatch[1] || '0', 10);
    const minor = parseInt(genMatch[2] || '0', 10);
    score += major * 1000 + minor * 100;
  }
  if (/flash-lite/.test(id)) score += 10;
  else if (/flash/.test(id)) score += 50; // melhor custo-benefício
  else if (/pro/.test(id)) score += 30;
  return score;
}

export async function resolveGeminiModel(apiKey: string): Promise<string> {
  const now = Date.now();
  if (cachedModel && now < cacheExpiresAt) return cachedModel;

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[gemini-model] ListModels falhou (${res.status}). Usando fallback gemini-2.5-flash.`);
    return 'gemini-2.5-flash';
  }

  const data: { models?: GeminiModel[] } = await res.json();
  const all = data.models ?? [];

  const eligible = all.filter((m) => {
    const id = m.name.replace(/^models\//, '');
    const methods = m.supportedGenerationMethods ?? [];
    if (!methods.includes('generateContent')) return false;
    if (!/^gemini-/i.test(id)) return false;
    if (EXCLUDE_REGEX.test(id)) return false;
    return true;
  });

  console.log('[gemini-model] Modelos elegíveis para produção:');
  for (const m of eligible) {
    const id = m.name.replace(/^models\//, '');
    console.log(`  - ${id} | methods=${(m.supportedGenerationMethods ?? []).join(',')} | score=${scoreModel(id)}`);
  }

  if (eligible.length === 0) {
    console.warn('[gemini-model] Nenhum modelo elegível. Fallback gemini-2.5-flash.');
    return 'gemini-2.5-flash';
  }

  eligible.sort((a, b) => {
    const idA = a.name.replace(/^models\//, '');
    const idB = b.name.replace(/^models\//, '');
    return scoreModel(idB) - scoreModel(idA);
  });

  const selected = eligible[0].name.replace(/^models\//, '');
  console.log(`[gemini-model] Selecionado: ${selected}`);

  cachedModel = selected;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return selected;
}
