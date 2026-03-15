import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KommoConfig {
  id: string;
  subdomain: string;
  access_token: string;
}

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
        JSON.stringify({ error: 'Kommo not configured or not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = configs[0] as KommoConfig;

    // Date filter: start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthUnix = Math.floor(startOfMonth.getTime() / 1000);

    // Fetch Kommo users once for SDR mapping
    const kommoUserMap = new Map<number, string>();
    try {
      const usersData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/users');
      const users = usersData?._embedded?.users || [];
      for (const u of users) {
        kommoUserMap.set(u.id, u.name);
      }
      console.log(`Mapped ${kommoUserMap.size} Kommo users`);
    } catch (e) {
      console.error('Could not fetch Kommo users:', e);
    }

    // Get local SDRs for matching by name
    const { data: sdrs } = await supabase.from('sdrs').select('id, name').eq('team_type', 'SDR');
    const sdrMap = new Map((sdrs || []).map((s: any) => [s.name.toLowerCase(), s.id]));

    let totalSynced = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching talks page ${page}...`);
      
      let talksData;
      try {
        talksData = await fetchKommoAPI(config.subdomain, config.access_token, '/api/v4/talks', {
          page: String(page),
          limit: '250',
          'filter[created_at][from]': String(startOfMonthUnix),
        });
      } catch (e) {
        console.error(`Error fetching page ${page}:`, e);
        break;
      }

      const talks = talksData?._embedded?.talks || [];
      if (talks.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Page ${page}: ${talks.length} talks`);

      for (const talk of talks) {
        const kommoId = String(talk.id);
        if (!talk.id) {
          console.error('Talk without id, skipping');
          continue;
        }

        const contactName = talk.contact?.name || talk._embedded?.contact?.name || 'Desconhecido';
        const contactPhone = talk.contact?.phone || null;
        
        // Match SDR by responsible user
        let sdrId = null;
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

        // Upsert conversation
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

        // Fetch messages via events API (incoming_chat_message + outgoing_chat_message)
        try {
          // Get the contact/entity linked to this talk
          const entityId = talk.entity_id;
          const entityType = talk.entity_type; // 'contacts' or 'leads'
          
          if (entityId && entityType) {
            // Fetch chat events for this entity
            const eventsData = await fetchKommoAPI(
              config.subdomain, config.access_token,
              '/api/v4/events',
              { 
                'filter[type][]': 'incoming_chat_message',
                'filter[entity][]': entityType === 'contacts' ? 'contact' : 'lead',
                'filter[entity_id][]': String(entityId),
                'filter[created_at][from]': String(startOfMonthUnix),
                limit: '100',
              }
            );

            // Also fetch outgoing
            const outEventsData = await fetchKommoAPI(
              config.subdomain, config.access_token,
              '/api/v4/events',
              {
                'filter[type][]': 'outgoing_chat_message',
                'filter[entity][]': entityType === 'contacts' ? 'contact' : 'lead', 
                'filter[entity_id][]': String(entityId),
                'filter[created_at][from]': String(startOfMonthUnix),
                limit: '100',
              }
            );

            const inEvents = eventsData?._embedded?.events || [];
            const outEvents = outEventsData?._embedded?.events || [];
            const allEvents = [...inEvents, ...outEvents].sort((a, b) => a.created_at - b.created_at);

            let prevSentAt: Date | null = null;
            let totalResponseTime = 0;
            let responseCount = 0;

            for (const evt of allEvents) {
              const sentAt = new Date(evt.created_at * 1000);
              const senderType = evt.type === 'incoming_chat_message' ? 'lead' : 'sdr';
              const kommoMessageId = `${kommoId}_evt_${evt.id}`;
              
              // Extract message text from event value_after
              let content = '[mensagem]';
              if (evt.value_after) {
                const va = evt.value_after;
                if (Array.isArray(va) && va.length > 0) {
                  content = va[0]?.message?.text || va[0]?.text || '[mensagem]';
                } else if (typeof va === 'object') {
                  content = va.message?.text || va.text || '[mensagem]';
                }
              }

              let responseTimeSec = null;
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
                  content,
                  sent_at: sentAt.toISOString(),
                  response_time_seconds: responseTimeSec,
                }, { onConflict: 'kommo_message_id' });
            }

            const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : null;
            await supabase
              .from('kommo_conversations')
              .update({
                messages_count: allEvents.length,
                avg_response_time_seconds: avgResponseTime,
              })
              .eq('id', convData.id);
          }
        } catch (msgError) {
          console.error(`Error fetching events for talk ${kommoId}:`, msgError);
        }

        totalSynced++;
      }

      if (talks.length < 250) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Update last sync time
    await supabase
      .from('kommo_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id);

    console.log(`Sync complete: ${totalSynced} conversations across ${page} pages`);

    return new Response(
      JSON.stringify({ success: true, synced: totalSynced, pages: page }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync Kommo error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
