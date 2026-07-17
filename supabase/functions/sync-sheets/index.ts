import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Body {
  url: string;
  sheetName: string;
  mode: 'test' | 'sync';
}

function extractSpreadsheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function buildCsvUrl(spreadsheetId: string, sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

// Minimal RFC 4180 CSV parser
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

function norm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth + admin gate
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

    const csvUrl = buildCsvUrl(spreadsheetId, body.sheetName);
    const resp = await fetch(csvUrl, { redirect: 'follow' });
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
    // Google returns HTML error page when spreadsheet is not public
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

    const headers = rows[0].map(h => norm(h));
    const nameIdx = headers.findIndex(h => h === norm('Nome do Colaborador') || h === 'nome do colaborador');
    const journeyIdx = headers.findIndex(h => h === norm('Jornada do colaborador') || h === 'jornada do colaborador');
    const positionIdx = headers.findIndex(h => h === norm('Posição') || h === 'posicao' || h === 'posição');

    if (nameIdx === -1 || journeyIdx === -1 || positionIdx === -1) {
      return new Response(JSON.stringify({
        error: 'Colunas obrigatórias ausentes.',
        required: ['Nome do Colaborador', 'Jornada do colaborador', 'Posição'],
        found: rows[0],
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.mode === 'test') {
      const { data: existingForPreview } = await admin
        .from('sdrs').select('id, name, is_active');
      const byNamePrev = new Map<string, { is_active: boolean }>();
      for (const s of existingForPreview ?? []) byNamePrev.set(norm(s.name), { is_active: s.is_active });

      const preview = [];
      const plan = { create: 0, activate: 0, deactivate: 0, unchanged: 0, skipped: 0 };
      for (let i = 1; i < rows.length; i++) {
        const name = (rows[i][nameIdx] ?? '').trim();
        const journey = (rows[i][journeyIdx] ?? '').trim();
        const position = (rows[i][positionIdx] ?? '').trim();
        if (!name) { plan.skipped++; continue; }
        // Ignora completamente qualquer cargo diferente de SDR
        if (position.toLowerCase() !== 'sdr') { plan.skipped++; continue; }
        const shouldBeActive = journey.toLowerCase() === 'ativo';
        const found = byNamePrev.get(norm(name));
        let action: 'create' | 'activate' | 'deactivate' | 'unchanged';
        if (!found) {
          // Só cria se estiver ativo; caso contrário, ignora
          if (!shouldBeActive) { plan.skipped++; continue; }
          action = 'create'; plan.create++;
        }
        else if (found.is_active === shouldBeActive) { action = 'unchanged'; plan.unchanged++; }
        else if (shouldBeActive) { action = 'activate'; plan.activate++; }
        else { action = 'deactivate'; plan.deactivate++; }
        preview.push({ name, journey, action, willBeActive: shouldBeActive });
      }

      return new Response(JSON.stringify({
        ok: true,
        spreadsheetId,
        sheetName: body.sheetName,
        totalRows: rows.length - 1,
        plan,
        preview,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // SYNC
    const { data: existing } = await admin
      .from('sdrs').select('id, name, is_active');
    const byName = new Map<string, { id: string; is_active: boolean }>();
    for (const s of existing ?? []) byName.set(norm(s.name), { id: s.id, is_active: s.is_active });

    const created: string[] = [];
    const updated: string[] = [];
    const deactivated: string[] = [];
    const reactivated: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const name = (rows[i][nameIdx] ?? '').trim();
      const journey = (rows[i][journeyIdx] ?? '').trim();
      if (!name) continue;
      const shouldBeActive = journey.toLowerCase() === 'ativo';
      const key = norm(name);
      const found = byName.get(key);

      if (!found) {
        const { error } = await admin.from('sdrs').insert({
          name,
          squad: 'Serpentes',
          role: 'SDR',
          team_type: 'SDR',
          is_active: shouldBeActive,
        });
        if (!error) created.push(name);
      } else if (found.is_active !== shouldBeActive) {
        const { error } = await admin.from('sdrs')
          .update({ is_active: shouldBeActive, updated_at: new Date().toISOString() })
          .eq('id', found.id);
        if (!error) {
          if (shouldBeActive) reactivated.push(name);
          else deactivated.push(name);
          updated.push(name);
        }
      }
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
