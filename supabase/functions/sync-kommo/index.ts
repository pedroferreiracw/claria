import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PAGES = 5; // Process max 5 pages per execution to avoid timeout
const PAGE_SIZE = 50;

async function fetchKommoAPI(subdomain: string, token: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`https://${subdomain}.kommo.com${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kommo API (${response.status}): ${errorText}`);
  }
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: configs } = await supabase
      .from('kommo_config')
      .select('id, subdomain, access_token')
      .eq('is_connected', true)
      .limit(1);

    if (!configs?.length) {
      return new Response(
        JSON.stringify({ error: 'Kommo not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = configs[0];

    // Parse optional page offset from body
    let startPage = 1;
    try {
      const body = await req.json();
      if (body?.startPage) startPage = body.startPage;
    } catch (_e) { /* no body */ }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthUnix = Math.floor(startOfMonth.getTime() / 1000);

    // Get SDRs for mapping
    const { data: sdrs } = await supabase.from('sdrs').select('id, name').eq('team_type', 'SDR');
    const sdrMap = new Map((sdrs || []).map((s: any) => [s.name.toLowerCase(), s.id]));

    let totalSynced = 0;
    let page = startPage;
    let pagesProcessed = 0;
    let hasMore = true;

    while (hasMore && pagesProcessed < MAX_PAGES) {
      console.log('Fetching talks page ' + page);

      let talksData: any;
      try {
        talksData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/talks', {
          page: String(page),
          limit: String(PAGE_SIZE),
          'filter[created_at][from]': String(startOfMonthUnix),
        });
      } catch (_e) {
        console.error('Error fetching page ' + page);
        break;
      }

      const talks = talksData?._embedded?.talks || [];
      if (talks.length === 0) {
        hasMore = false;
        break;
      }

      console.log('Page ' + page + ': ' + talks.length + ' talks');

      for (const talk of talks) {
        if (!talk.talk_id) continue;
        const kommoId = String(talk.talk_id);

        // Use contact_id and lead entity for naming
        const contactId = talk.contact_id;
        const entityId = talk.entity_id;
        const entityType = talk.entity_type;
        const leadName = 'Lead #' + (entityId || contactId || kommoId);

        const isClosed = talk.status === 'closed';

        const { data: convData } = await supabase
          .from('kommo_conversations')
          .upsert({
            kommo_id: kommoId,
            lead_name: leadName,
            status: isClosed ? 'closed' : 'active',
            started_at: talk.created_at ? new Date(talk.created_at * 1000).toISOString() : null,
            finished_at: isClosed && talk.updated_at ? new Date(talk.updated_at * 1000).toISOString() : null,
            synced_at: new Date().toISOString(),
          }, { onConflict: 'kommo_id' })
          .select('id, sdr_id')
          .single();

        if (!convData) continue;

        // Fetch messages via events API for this entity
        if (entityId && entityType) {
          try {
            const entityFilter = entityType === 'contacts' ? 'contact' : 'lead';

            const eventsData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/events', {
              'filter[type]': 'incoming_chat_message,outgoing_chat_message',
              'filter[entity][]': entityFilter,
              'filter[entity_id][]': String(entityId),
              'filter[created_at][from]': String(startOfMonthUnix),
              limit: '100',
            });

            const events = eventsData?._embedded?.events || [];
            events.sort((a: any, b: any) => a.created_at - b.created_at);

            let prevSentAt: Date | null = null;
            let totalResponseTime = 0;
            let responseCount = 0;
            let detectedSdrName: string | null = null;

            for (const evt of events) {
              const sentAt = new Date(evt.created_at * 1000);
              const senderType = evt.type === 'incoming_chat_message' ? 'lead' : 'sdr';
              const msgId = kommoId + '_evt_' + evt.id;

              // Extract message text
              let content = '[mensagem]';
              if (evt.value_after) {
                const va = evt.value_after;
                if (Array.isArray(va) && va.length > 0) {
                  content = va[0]?.message?.text || va[0]?.text || '[mensagem]';
                } else if (typeof va === 'object') {
                  content = (va as any).message?.text || (va as any).text || '[mensagem]';
                }
              }

              // Try to get SDR name from outgoing event
              if (senderType === 'sdr' && evt.created_by) {
                // created_by is a user ID in events
                detectedSdrName = null; // We'd need user map, skip for now
              }

              let responseTimeSec: number | null = null;
              if (senderType === 'sdr' && prevSentAt) {
                responseTimeSec = Math.round((sentAt.getTime() - prevSentAt.getTime()) / 1000);
                if (responseTimeSec > 0 && responseTimeSec < 86400) {
                  totalResponseTime += responseTimeSec;
                  responseCount++;
                }
              }
              prevSentAt = sentAt;

              await supabase
                .from('kommo_messages')
                .upsert({
                  kommo_message_id: msgId,
                  conversation_id: convData.id,
                  sender_type: senderType,
                  content: content,
                  sent_at: sentAt.toISOString(),
                  response_time_seconds: responseTimeSec,
                }, { onConflict: 'kommo_message_id' });
            }

            const avgTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : null;
            await supabase
              .from('kommo_conversations')
              .update({ messages_count: events.length, avg_response_time_seconds: avgTime })
              .eq('id', convData.id);

          } catch (_msgErr) {
            // Events fetch failed for this talk, continue
          }
        }

        totalSynced++;
      }

      pagesProcessed++;
      if (talks.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }

    await supabase
      .from('kommo_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id);

    const nextPage = hasMore ? page : null;
    console.log('Sync done: ' + totalSynced + ' convs, pages ' + startPage + '-' + (page) + ', hasMore=' + hasMore);

    return new Response(
      JSON.stringify({ success: true, synced: totalSynced, nextPage: nextPage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
