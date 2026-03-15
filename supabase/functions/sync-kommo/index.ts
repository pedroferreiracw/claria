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

    // Date filter: start of current month (March 2026)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthUnix = Math.floor(startOfMonth.getTime() / 1000);

    // Fetch Kommo users once for SDR mapping
    let kommoUserMap = new Map<number, string>();
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

      for (const talk of talks) {
        const kommoId = String(talk.id);
        const contactName = talk.contact?.name || talk._embedded?.contact?.name || 'Desconhecido';
        const contactPhone = talk.contact?.phone || null;
        
        // Match SDR by responsible user
        let sdrId = null;
        const responsibleUserId = talk.created_by || talk.responsible_user_id;
        const responsibleName = responsibleUserId 
          ? kommoUserMap.get(responsibleUserId) 
          : (talk.created_by_name || talk._embedded?.user?.name);
        
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

        // Fetch messages for this talk
        try {
          const messagesData = await fetchKommoAPI(
            config.subdomain, config.access_token,
            `/api/v4/talks/${kommoId}/messages`,
            { limit: '100' }
          );

          const messages = messagesData?._embedded?.messages || [];
          let prevSentAt: Date | null = null;
          let totalResponseTime = 0;
          let responseCount = 0;

          for (const msg of messages) {
            const sentAt = new Date(msg.created_at * 1000);
            const senderType = msg.is_incoming ? 'lead' : 'sdr';
            const kommoMessageId = `${kommoId}_${msg.id || msg.created_at}`;
            
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
                sender_name: msg.author?.name || (senderType === 'lead' ? contactName : responsibleName),
                content: msg.text || msg.media?.url || '[mídia]',
                sent_at: sentAt.toISOString(),
                response_time_seconds: responseTimeSec,
              }, { onConflict: 'kommo_message_id' });
          }

          const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : null;
          await supabase
            .from('kommo_conversations')
            .update({
              messages_count: messages.length,
              avg_response_time_seconds: avgResponseTime,
            })
            .eq('id', convData.id);

        } catch (msgError) {
          console.error(`Error fetching messages for talk ${kommoId}:`, msgError);
        }

        totalSynced++;
      }

      // Check if there are more pages
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
