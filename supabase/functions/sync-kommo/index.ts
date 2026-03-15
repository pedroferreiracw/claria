import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TALKS = 100;

async function fetchKommoAPI(subdomain: string, token: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`https://${subdomain}.kommo.com${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kommo (${response.status}): ${errorText.substring(0, 200)}`);
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthUnix = Math.floor(startOfMonth.getTime() / 1000);

    // Phase 1: Sync talks (conversations metadata only)
    let totalSynced = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore && totalSynced < MAX_TALKS) {
      let talksData: any;
      try {
        talksData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/talks', {
          page: String(page),
          limit: '250',
          'filter[created_at][from]': String(startOfMonthUnix),
        });
      } catch (e: any) {
        console.error('Talks fetch error page ' + page + ': ' + e.message);
        break;
      }

      const talks = talksData?._embedded?.talks || [];
      if (talks.length === 0) { hasMore = false; break; }

      console.log('Page ' + page + ': ' + talks.length + ' talks');

      for (const talk of talks) {
        if (!talk.talk_id || totalSynced >= MAX_TALKS) continue;

        const kommoId = String(talk.talk_id);
        const contactId = talk.contact_id;
        const entityId = talk.entity_id;
        const isClosed = talk.status === 'closed';

        await supabase
          .from('kommo_conversations')
          .upsert({
            kommo_id: kommoId,
            lead_name: 'Lead #' + (entityId || contactId || kommoId),
            status: isClosed ? 'closed' : 'active',
            started_at: talk.created_at ? new Date(talk.created_at * 1000).toISOString() : null,
            finished_at: isClosed ? new Date((talk.updated_at || talk.created_at) * 1000).toISOString() : null,
            synced_at: new Date().toISOString(),
          }, { onConflict: 'kommo_id' });

        totalSynced++;
      }

      if (talks.length < 250) { hasMore = false; } else { page++; }
    }

    console.log('Phase 1 done: ' + totalSynced + ' talks synced');

    // Phase 2: Fetch contact names for conversations that have generic names
    const { data: convs } = await supabase
      .from('kommo_conversations')
      .select('id, kommo_id, lead_name')
      .like('lead_name', 'Lead #%')
      .limit(50);

    let namesUpdated = 0;
    for (const conv of (convs || [])) {
      // Try to find the talk to get contact_id
      try {
        const talkData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/talks/' + conv.kommo_id);
        const contactId = talkData?.contact_id;
        if (contactId) {
          const contactData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/contacts/' + contactId);
          if (contactData?.name) {
            let phone: string | null = null;
            const phoneField = contactData?.custom_fields_values?.find((f: any) => f.field_code === 'PHONE');
            if (phoneField?.values?.[0]?.value) phone = phoneField.values[0].value;

            await supabase
              .from('kommo_conversations')
              .update({ lead_name: contactData.name, lead_phone: phone })
              .eq('id', conv.id);
            namesUpdated++;
          }
        }
      } catch (_e) {
        // Skip this contact
      }
    }

    console.log('Phase 2: ' + namesUpdated + ' contact names updated');

    // Phase 3: Fetch events (chat messages) globally, not per talk
    // Get all incoming+outgoing chat events for the month
    let messagesInserted = 0;
    try {
      for (const evtType of ['incoming_chat_message', 'outgoing_chat_message']) {
        let evtPage = 1;
        let evtHasMore = true;
        while (evtHasMore && evtPage <= 3) {
          const eventsData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/events', {
            'filter[type]': evtType,
            'filter[created_at][from]': String(startOfMonthUnix),
            page: String(evtPage),
            limit: '100',
          });

          const events = eventsData?._embedded?.events || [];
          if (events.length === 0) { evtHasMore = false; break; }

          if (evtPage === 1) {
            console.log('Events ' + evtType + ' sample: ' + JSON.stringify(events[0]).substring(0, 500));
          }

          for (const evt of events) {
            const entityId = evt.entity_id;
            if (!entityId) continue;

            // Find conversation by entity_id (stored in lead_name as Lead #entityId or by kommo_id)
            // We need to match - use a direct query
            const { data: matchConv } = await supabase
              .from('kommo_conversations')
              .select('id')
              .or('lead_name.eq.Lead #' + entityId + ',kommo_id.eq.' + entityId)
              .limit(1)
              .maybeSingle();

            if (!matchConv) continue;

            const sentAt = new Date(evt.created_at * 1000);
            const senderType = evtType === 'incoming_chat_message' ? 'lead' : 'sdr';
            const msgId = 'evt_' + evt.id;

            let content = '[mensagem]';
            if (evt.value_after) {
              const va = evt.value_after;
              if (Array.isArray(va) && va.length > 0) {
                content = va[0]?.message?.text || va[0]?.text || '[mensagem]';
              } else if (typeof va === 'object') {
                content = (va as any).message?.text || (va as any).text || '[mensagem]';
              }
            }

            await supabase
              .from('kommo_messages')
              .upsert({
                kommo_message_id: msgId,
                conversation_id: matchConv.id,
                sender_type: senderType,
                content: content,
                sent_at: sentAt.toISOString(),
              }, { onConflict: 'kommo_message_id' });

            messagesInserted++;
          }

          if (events.length < 100) { evtHasMore = false; } else { evtPage++; }
        }
      }
    } catch (e: any) {
      console.error('Events fetch error: ' + e.message);
    }

    console.log('Phase 3: ' + messagesInserted + ' messages inserted');

    await supabase
      .from('kommo_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id);

    return new Response(
      JSON.stringify({ success: true, synced: totalSynced, namesUpdated, messagesInserted }),
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
