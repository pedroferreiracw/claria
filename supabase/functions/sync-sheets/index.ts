import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Body {
  url: string;
  sheetName: string;
  mode: 'test' | 'sync';
  /** Se true, desativa qualquer SDR do banco que NÃO esteja como "Ativo" (Posição=SDR) na planilha. */
  reconcile?: boolean;
}

const VALID_SQUADS = ['Águia', 'Lobo', 'Sharks', 'Serpentes'] as const;
type SquadType = typeof VALID_SQUADS[number];

function extractSpreadsheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function buildCsvUrl(spreadsheetId: string, sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}

/** Chave canônica de nome: sem acentos, minúsculo, espaços internos colapsados. */
function nameKey(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function headerKey(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Mapeia o valor bruto de Squad da planilha para um enum válido. Retorna null se não bater. */
function resolveSquad(raw: string): SquadType | null {
  const k = nameKey(raw);
  if (!k) return null;
  for (const s of VALID_SQUADS) {
    if (nameKey(s) === k) return s;
  }
  // sinônimos comuns
  if (k === 'aguia' || k === 'águia') return 'Águia';
  if (k === 'lobos') return 'Lobo';
  if (k === 'shark' || k === 'tubarao' || k === 'tubarões') return 'Sharks';
  if (k === 'serpente' || k === 'cobras') return 'Serpentes';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.url || !body?.sheetName || !body?.mode) {
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios: url, sheetName, mode' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const spreadsheetId = extractSpreadsheetId(body.url);
    if (!spreadsheetId) {
      return new Response(JSON.stringify({ error: 'URL do Google Sheets inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch(buildCsvUrl(spreadsheetId, body.sheetName), { redirect: 'follow' });
    if (!resp.ok) {
      const text = await resp.text();
      let msg = `Não foi possível acessar a planilha (HTTP ${resp.status}).`;
      if (resp.status === 404) msg = `A aba "${body.sheetName}" não foi encontrada na planilha.`;
      if (resp.status === 401 || resp.status === 403) msg = 'A planilha não está compartilhada publicamente. Habilite "Qualquer pessoa com o link — Leitor".';
      return new Response(JSON.stringify({ error: msg, details: text.slice(0, 200) }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const csvText = await resp.text();
    if (csvText.trim().startsWith('<')) {
      return new Response(JSON.stringify({ error: 'A planilha não está pública. Compartilhe como "Qualquer pessoa com o link — Leitor".' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: 'Planilha vazia ou sem dados.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = rows[0].map(h => headerKey(h));
    const nameIdx = headers.findIndex(h => h === 'nome do colaborador');
    const journeyIdx = headers.findIndex(h => h === 'jornada do colaborador');
    const positionIdx = headers.findIndex(h => h === 'posicao');
    const squadIdx = headers.findIndex(h => h === 'squad');

    if (nameIdx === -1 || journeyIdx === -1 || positionIdx === -1) {
      return new Response(JSON.stringify({
        error: 'Colunas obrigatórias ausentes.',
        required: ['Nome do Colaborador', 'Jornada do colaborador', 'Posição'],
        found: rows[0],
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Carrega estado atual do banco e monta índice por chave canônica.
    // Se houver duplicidades pré-existentes, mantém a MAIS ANTIGA como canônica
    // e marca as demais para não gerarem falso "novo".
    const { data: existing } = await admin
      .from('sdrs').select('id, name, squad, is_active, created_at')
      .order('created_at', { ascending: true });

    const byKey = new Map<string, { id: string; name: string; squad: string; is_active: boolean }>();
    for (const s of existing ?? []) {
      const k = nameKey(s.name);
      if (!k) continue;
      if (!byKey.has(k)) byKey.set(k, { id: s.id, name: s.name, squad: s.squad, is_active: s.is_active });
    }

    // ===== PASSO 1 + 2: filtra Posição = SDR; separa ativos (candidatos a criar/atualizar)
    // dos inativos (só usados para desativar existentes) =====
    type SheetRow = { name: string; journey: string; squad: SquadType | null; squadRaw: string; isActive: boolean };
    const activeRows: SheetRow[] = [];
    const inactiveRows: SheetRow[] = [];
    let skipped = 0;

    // Dedup dentro da própria planilha
    const seenInSheet = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const name = (rows[i][nameIdx] ?? '').trim();
      const journey = (rows[i][journeyIdx] ?? '').trim();
      const position = (rows[i][positionIdx] ?? '').trim();
      const squadRaw = squadIdx >= 0 ? (rows[i][squadIdx] ?? '').trim() : '';

      if (!name) { skipped++; continue; }
      if (position.toLowerCase() !== 'sdr') { skipped++; continue; }

      const k = nameKey(name);
      if (seenInSheet.has(k)) { skipped++; continue; }
      seenInSheet.add(k);

      const isActive = journey.toLowerCase() === 'ativo';
      const squad = resolveSquad(squadRaw);
      const row: SheetRow = { name, journey, squad, squadRaw, isActive };
      if (isActive) activeRows.push(row);
      else inactiveRows.push(row);
    }

    // ===== Monta plano =====
    const plan = { create: 0, activate: 0, deactivate: 0, unchanged: 0, skipped };
    const preview: { name: string; journey: string; action: 'create' | 'activate' | 'deactivate' | 'unchanged'; willBeActive: boolean }[] = [];

    // Ativos: criar ou atualizar existente
    for (const r of activeRows) {
      const found = byKey.get(nameKey(r.name));
      let action: 'create' | 'activate' | 'unchanged';
      if (!found) { action = 'create'; plan.create++; }
      else {
        const squadChanges = r.squad && r.squad !== found.squad;
        const activityChanges = !found.is_active;
        if (activityChanges) { action = 'activate'; plan.activate++; }
        else if (squadChanges) { action = 'unchanged'; plan.unchanged++; /* update silencioso */ }
        else { action = 'unchanged'; plan.unchanged++; }
      }
      preview.push({ name: r.name, journey: r.journey, action, willBeActive: true });
    }

    // Inativos: apenas desativar quem já existir (nunca criar)
    for (const r of inactiveRows) {
      const found = byKey.get(nameKey(r.name));
      if (!found) { plan.skipped++; continue; }
      if (found.is_active) { plan.deactivate++; preview.push({ name: r.name, journey: r.journey, action: 'deactivate', willBeActive: false }); }
      else { plan.unchanged++; preview.push({ name: r.name, journey: r.journey, action: 'unchanged', willBeActive: false }); }
    }

    if (body.mode === 'test') {
      return new Response(JSON.stringify({
        ok: true,
        spreadsheetId,
        sheetName: body.sheetName,
        totalRows: rows.length - 1,
        plan,
        preview,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== SYNC =====
    const created: string[] = [];
    const updated: string[] = [];
    const deactivated: string[] = [];
    const reactivated: string[] = [];

    for (const r of activeRows) {
      const found = byKey.get(nameKey(r.name));
      const squadToUse: SquadType = r.squad ?? (found?.squad as SquadType | undefined) ?? 'Serpentes';

      if (!found) {
        const { error } = await admin.from('sdrs').insert({
          name: r.name,
          squad: squadToUse,
          role: 'SDR',
          team_type: 'SDR',
          is_active: true,
        });
        if (!error) created.push(r.name);
        else console.error('insert sdr failed:', r.name, error.message);
      } else {
        const patch: Record<string, unknown> = {};
        if (!found.is_active) patch.is_active = true;
        if (r.squad && r.squad !== found.squad) patch.squad = r.squad;
        if (Object.keys(patch).length > 0) {
          patch.updated_at = new Date().toISOString();
          const { error } = await admin.from('sdrs').update(patch).eq('id', found.id);
          if (!error) {
            if (patch.is_active === true) reactivated.push(r.name);
            updated.push(r.name);
          } else {
            console.error('update sdr failed:', r.name, error.message);
          }
        }
      }
    }

    for (const r of inactiveRows) {
      const found = byKey.get(nameKey(r.name));
      if (!found || !found.is_active) continue;
      const { error } = await admin.from('sdrs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', found.id);
      if (!error) { deactivated.push(r.name); updated.push(r.name); }
      else console.error('deactivate sdr failed:', r.name, error.message);
    }

    return new Response(JSON.stringify({
      ok: true,
      syncedAt: new Date().toISOString(),
      totalRows: rows.length - 1,
      created,
      updated,
      deactivated,
      reactivated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('sync-sheets error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
