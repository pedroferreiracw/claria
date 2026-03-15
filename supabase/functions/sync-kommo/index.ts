import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchKommo(subdomain: string, token: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`https://${subdomain}.kommo.com${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Kommo ${res.status}: ${(await res.text()).substring(0, 200)}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: configs } = await supabase.from('kommo_config').select('id, subdomain, access_token').eq('is_connected', true).limit(1);
    if (!configs?.length) return new Response(JSON.stringify({ error: 'Not configured' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const config = configs[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fromUnix = Math.floor(startOfMonth.getTime() / 1000);

    // Sync all talks - metadata only, fast
    let total = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const data = await fetchKommo(config.subdomain, config.access_token, '/api/v4/talks', {
        page: String(page), limit: '250',
        'filter[created_at][from]': String(fromUnix),
      });
      const talks = data?._embedded?.talks || [];
      if (!talks.length) break;

      console.log('Page ' + page + ': ' + talks.length + ' talks');

      const upserts = talks.filter((t: any) => t.talk_id).map((t: any) => ({
        kommo_id: String(t.talk_id),
        lead_name: 'Conversa #' + t.talk_id,
        status: t.status === 'closed' ? 'closed' : 'active',
        started_at: t.created_at ? new Date(t.created_at * 1000).toISOString() : null,
        finished_at: t.status === 'closed' ? new Date((t.updated_at || t.created_at) * 1000).toISOString() : null,
        synced_at: new Date().toISOString(),
      }));

      if (upserts.length > 0) {
        await supabase.from('kommo_conversations').upsert(upserts, { onConflict: 'kommo_id' });
        total += upserts.length;
      }

      hasMore = talks.length >= 250;
      page++;
    }

    // Now enrich: fetch contact names for up to 20 conversations without real names
    const { data: unnamed } = await supabase
      .from('kommo_conversations')
      .select('id, kommo_id')
      .like('lead_name', 'Conversa #%')
      .limit(20);

    let enriched = 0;
    for (const conv of (unnamed || [])) {
      try {
        const talkData = await fetchKommo(config.subdomain, config.access_token, '/api/v4/talks/' + conv.kommo_id);
        if (talkData?.contact_id) {
          const contact = await fetchKommo(config.subdomain, config.access_token, '/api/v4/contacts/' + talkData.contact_id);
          if (contact?.name) {
            let phone: string | null = null;
            const pf = contact?.custom_fields_values?.find((f: any) => f.field_code === 'PHONE');
            if (pf?.values?.[0]?.value) phone = pf.values[0].value;
            await supabase.from('kommo_conversations').update({ lead_name: contact.name, lead_phone: phone }).eq('id', conv.id);
            enriched++;
          }
        }
      } catch (_e) { /* skip */ }
    }

    await supabase.from('kommo_config').update({ last_sync_at: new Date().toISOString() }).eq('id', config.id);

    console.log('Done: ' + total + ' talks, ' + enriched + ' enriched');
    return new Response(
      JSON.stringify({ success: true, synced: total, enriched }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
