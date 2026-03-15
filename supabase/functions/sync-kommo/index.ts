import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KommoConfig {
  id: string;
  subdomain: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string | null;
  scope_id: string | null;
}

async function refreshTokenIfNeeded(config: KommoConfig, supabase: any): Promise<string> {
  const now = new Date();
  const expiresAt = config.token_expires_at ? new Date(config.token_expires_at) : null;
  
  // If token is still valid (with 5 min buffer), return it
  if (expiresAt && expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return config.access_token;
  }

  console.log('Refreshing Kommo access token...');
  
  const clientId = Deno.env.get('KOMMO_CLIENT_ID');
  const clientSecret = Deno.env.get('KOMMO_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('KOMMO_CLIENT_ID and KOMMO_CLIENT_SECRET must be configured');
  }

  const response = await fetch(`https://${config.subdomain}.kommo.com/oauth2/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: config.refresh_token,
      redirect_uri: `https://${config.subdomain}.kommo.com`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  const tokens = await response.json();
  
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  
  await supabase
    .from('kommo_config')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', config.id);

  return tokens.access_token;
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

    // Get Kommo config
    const { data: configs, error: configError } = await supabase
      .from('kommo_config')
      .select('*')
      .eq('is_connected', true)
      .limit(1);

    if (configError || !configs?.length) {
      return new Response(
        JSON.stringify({ error: 'Kommo not configured or not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = configs[0] as KommoConfig;
    const accessToken = await refreshTokenIfNeeded(config, supabase);

    // Parse request body for optional filters
    let filters: { page?: number; limit?: number } = {};
    if (req.method === 'POST') {
      try { filters = await req.json(); } catch { /* empty body is fine */ }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;

    // Fetch talks/conversations from Kommo
    const talksData = await fetchKommoAPI(config.subdomain, accessToken, '/api/v4/talks', {
      page: String(page),
      limit: String(limit),
      'filter[is_read]': 'both',
    });

    const talks = talksData?._embedded?.talks || [];
    
    // Get local SDRs for matching
    const { data: sdrs } = await supabase.from('sdrs').select('id, name').eq('team_type', 'SDR');
    const sdrMap = new Map((sdrs || []).map((s: any) => [s.name.toLowerCase(), s.id]));

    let synced = 0;

    for (const talk of talks) {
      const kommoId = String(talk.id);
      const contactName = talk.contact?.name || talk._embedded?.contact?.name || 'Desconhecido';
      const contactPhone = talk.contact?.phone || null;
      
      // Try to match SDR by responsible user name
      let sdrId = null;
      const responsibleName = talk.created_by_name || talk._embedded?.user?.name;
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
          config.subdomain, accessToken,
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
          
          // Calculate response time (SDR response to lead message)
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
              conversation_id: convData.id,
              sender_type: senderType,
              sender_name: msg.author?.name || (senderType === 'lead' ? contactName : responsibleName),
              content: msg.text || msg.media?.url || '[mídia]',
              sent_at: sentAt.toISOString(),
              response_time_seconds: responseTimeSec,
            }, { 
              onConflict: 'conversation_id',
              ignoreDuplicates: true 
            });
        }

        // Update conversation metrics
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

      synced++;
    }

    // Update last sync time
    await supabase
      .from('kommo_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id);

    return new Response(
      JSON.stringify({ success: true, synced, total: talks.length }),
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
