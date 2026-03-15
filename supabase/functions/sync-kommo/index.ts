import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchKommoAPI(subdomain: string, token: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`https://${subdomain}.kommo.com${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kommo API error (${response.status}): ${errorText}`);
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

    const { data: configs, error: configError } = await supabase
      .from('kommo_config')
      .select('id, subdomain, access_token')
      .eq('is_connected', true)
      .limit(1);

    if (configError || !configs?.length) {
      return new Response(
        JSON.stringify({ error: 'Kommo not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = configs[0];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthUnix = Math.floor(startOfMonth.getTime() / 1000);

    // Fetch Kommo users for SDR mapping
    const kommoUserMap = new Map<number, string>();
    try {
      const usersData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/users');
      for (const u of (usersData?._embedded?.users || [])) {
        kommoUserMap.set(u.id, u.name);
      }
      console.log('Mapped ' + kommoUserMap.size + ' Kommo users');
    } catch (_e) {
      console.error('Could not fetch Kommo users');
    }

    const { data: sdrs } = await supabase.from('sdrs').select('id, name').eq('team_type', 'SDR');
    const sdrMap = new Map((sdrs || []).map((s: any) => [s.name.toLowerCase(), s.id]));

    let totalSynced = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log('Fetching talks page ' + page);

      let talksData: any;
      try {
        talksData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/talks', {
          page: String(page),
          limit: '250',
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

      // Debug: log first talk structure
      if (page === 1 && talks.length > 0) {
        console.log('Talk keys: ' + JSON.stringify(Object.keys(talks[0])));
        console.log('Talk sample: ' + JSON.stringify(talks[0]).substring(0, 800));
      }
      console.log('Page ' + page + ': ' + talks.length + ' talks');

      for (const talk of talks) {
        const rawId = talk.id || talk.talk_id || talk._id;
        if (!rawId) {
          if (page === 1 && totalSynced === 0) {
            console.error('Talk without id, keys: ' + JSON.stringify(Object.keys(talk)));
          }
          continue;
        }
        const kommoId = String(rawId);
        const contactName = talk.contact?.name || talk._embedded?.contact?.name || 'Desconhecido';
        const contactPhone = talk.contact?.phone || null;

        let sdrId: string | null = null;
        const responsibleUserId = talk.created_by || talk.responsible_user_id;
        let responsibleName: string | null = null;
        if (responsibleUserId && kommoUserMap.has(responsibleUserId)) {
          responsibleName = kommoUserMap.get(responsibleUserId)!;
        } else if (talk.created_by_name) {
          responsibleName = talk.created_by_name;
        }
        if (responsibleName) {
          sdrId = sdrMap.get(responsibleName.toLowerCase()) || null;
        }

        const { data: convData } = await supabase
          .from('kommo_conversations')
          .upsert({
            kommo_id: kommoId,
            sdr_id: sdrId,
            lead_name: contactName,
            lead_phone: contactPhone,
            status: talk.is_closed ? 'closed' : 'active',
            started_at: talk.created_at ? new Date(talk.created_at * 1000).toISOString() : null,
            finished_at: talk.closed_at ? new Date(talk.closed_at * 1000).toISOString() : null,
            synced_at: new Date().toISOString(),
          }, { onConflict: 'kommo_id' })
          .select('id')
          .single();

        if (!convData) continue;

        // Fetch messages via events API
        try {
          const entityId = talk.entity_id;
          const entityType = talk.entity_type;

          if (entityId && entityType) {
            const entityFilter = entityType === 'contacts' ? 'contact' : 'lead';

            const [inData, outData] = await Promise.all([
              fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/events', {
                'filter[type][]': 'incoming_chat_message',
                'filter[entity][]': entityFilter,
                'filter[entity_id][]': String(entityId),
                'filter[created_at][from]': String(startOfMonthUnix),
                limit: '100',
              }),
              fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/events', {
                'filter[type][]': 'outgoing_chat_message',
                'filter[entity][]': entityFilter,
                'filter[entity_id][]': String(entityId),
                'filter[created_at][from]': String(startOfMonthUnix),
                limit: '100',
              }),
            ]);

            const allEvents = [
              ...(inData?._embedded?.events || []),
              ...(outData?._embedded?.events || []),
            ].sort((a: any, b: any) => a.created_at - b.created_at);

            let prevSentAt: Date | null = null;
            let totalResponseTime = 0;
            let responseCount = 0;

            for (const evt of allEvents) {
              const sentAt = new Date(evt.created_at * 1000);
              const senderType = evt.type === 'incoming_chat_message' ? 'lead' : 'sdr';
              const kommoMessageId = kommoId + '_evt_' + evt.id;

              let content = '[mensagem]';
              if (evt.value_after) {
                const va = evt.value_after;
                if (Array.isArray(va) && va.length > 0) {
                  content = va[0]?.message?.text || va[0]?.text || '[mensagem]';
                } else if (typeof va === 'object') {
                  content = (va as any).message?.text || (va as any).text || '[mensagem]';
                }
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
                  kommo_message_id: kommoMessageId,
                  conversation_id: convData.id,
                  sender_type: senderType,
                  sender_name: senderType === 'lead' ? contactName : responsibleName,
                  content: content,
                  sent_at: sentAt.toISOString(),
                  response_time_seconds: responseTimeSec,
                }, { onConflict: 'kommo_message_id' });
            }

            const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : null;
            await supabase
              .from('kommo_conversations')
              .update({ messages_count: allEvents.length, avg_response_time_seconds: avgResponseTime })
              .eq('id', convData.id);
          }
        } catch (_msgErr) {
          console.error('Error fetching events for talk ' + kommoId);
        }

        totalSynced++;
      }

      if (talks.length < 250) {
        hasMore = false;
      } else {
        page++;
      }
    }

    await supabase
      .from('kommo_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id);

    console.log('Sync complete: ' + totalSynced + ' conversations, ' + page + ' pages');

    return new Response(
      JSON.stringify({ success: true, synced: totalSynced, pages: page }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Sync Kommo error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
