import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_LEAD_PAGES = 3;
const MAX_MSG_TALKS = 10;
const USERS_CACHE_HOURS = 24;

async function fetchKommo(subdomain: string, token: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`https://${subdomain}.kommo.com${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = (await res.text()).substring(0, 300);
    throw new Error(`Kommo ${res.status}: ${body}`);
  }
  const text = await res.text();
  if (!text || text.trim() === '') return { _embedded: {} };
  return JSON.parse(text);
}

function fetchKommoWithArrayFilters(
  subdomain: string, token: string, endpoint: string,
  params: Record<string, string>, arrayFilters: Record<string, (string | number)[]>
) {
  const url = new URL(`https://${subdomain}.kommo.com${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  Object.entries(arrayFilters).forEach(([key, values]) => {
    values.forEach(v => url.searchParams.append(`${key}[]`, String(v)));
  });
  return fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    .then(async res => {
      if (!res.ok) throw new Error(`Kommo ${res.status}: ${(await res.text()).substring(0, 300)}`);
      const text = await res.text();
      if (!text || text.trim() === '') return { _embedded: {} };
      return JSON.parse(text);
    });
}

function resp(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: configs } = await supabase
      .from('kommo_config')
      .select('id, subdomain, access_token, scope_id')
      .eq('is_connected', true).limit(1);
    if (!configs?.length) return resp({ error: 'Kommo not configured' }, 400);
    const config = configs[0];

    // ══════════════════════════════════════════════════════════
    // PHASE A: Discover pre-sales users (cached)
    // ══════════════════════════════════════════════════════════
    const { data: usersCacheSetting } = await supabase
      .from('app_settings').select('setting_value')
      .eq('setting_key', 'kommo_presales_users').maybeSingle();

    let presalesUserIds: number[] = [];
    let kommoUserToSdr: Record<string, string> = {};
    let kommoUserToName: Record<string, string> = {};
    let needsRefresh = true;

    if (usersCacheSetting?.setting_value) {
      const cached = usersCacheSetting.setting_value as any;
      const age = cached.refreshedAt ? Date.now() - new Date(cached.refreshedAt).getTime() : Infinity;
      if (age < USERS_CACHE_HOURS * 3600 * 1000 && cached.userIds?.length > 0) {
        presalesUserIds = cached.userIds;
        kommoUserToSdr = cached.userToSdr || {};
        kommoUserToName = cached.nameMap || {};
        needsRefresh = false;
      }
    }

    if (needsRefresh) {
      console.log('Refreshing Kommo users cache...');
      const usersData = await fetchKommo(config.subdomain, config.access_token, '/api/v4/users', { limit: '250' });
      const kommoUsers = usersData?._embedded?.users || [];
      const { data: localSdrs } = await supabase.from('sdrs').select('id, name').eq('team_type', 'SDR');
      const sdrList = localSdrs || [];
      const groupMatchCount = new Map<number, number>();
      const groupUsers = new Map<number, any[]>();

      for (const ku of kommoUsers) {
        const gid = ku.rights?.group_id;
        if (!gid) continue;
        if (!groupUsers.has(gid)) groupUsers.set(gid, []);
        groupUsers.get(gid)!.push(ku);
        const kuFirst = (ku.name || '').toLowerCase().split(' ')[0];
        for (const sdr of sdrList) {
          const sdrFirst = sdr.name.toLowerCase().split(' ')[0];
          if ((ku.name || '').toLowerCase() === sdr.name.toLowerCase() || (kuFirst.length >= 3 && kuFirst === sdrFirst)) {
            groupMatchCount.set(gid, (groupMatchCount.get(gid) || 0) + 1);
            break;
          }
        }
      }

      let bestGroupId = 0, bestCount = 0;
      for (const [gid, count] of groupMatchCount) { if (count > bestCount) { bestGroupId = gid; bestCount = count; } }

      const presalesGroup = groupUsers.get(bestGroupId) || [];
      console.log(`Pre-sales group ${bestGroupId}: ${presalesGroup.length} users`);

      for (const ku of presalesGroup) {
        const kuNameLower = (ku.name || '').toLowerCase();
        const kuFirst = kuNameLower.split(' ')[0];
        let matchedSdrId: string | null = null;
        for (const sdr of sdrList) {
          const sdrNameLower = sdr.name.toLowerCase();
          const sdrFirst = sdrNameLower.split(' ')[0];
          if (kuNameLower === sdrNameLower || (kuFirst.length >= 3 && kuFirst === sdrFirst) ||
              kuNameLower.includes(sdrNameLower) || sdrNameLower.includes(kuNameLower)) {
            matchedSdrId = sdr.id; break;
          }
        }
        if (!matchedSdrId) {
          const { data: newSdr } = await supabase.from('sdrs').insert({ name: ku.name, role: 'SDR', squad: 'Águia', team_type: 'SDR' }).select('id').single();
          if (newSdr) { matchedSdrId = newSdr.id; sdrList.push({ id: newSdr.id, name: ku.name }); }
        }
        presalesUserIds.push(ku.id);
        if (matchedSdrId) kommoUserToSdr[String(ku.id)] = matchedSdrId;
        kommoUserToName[String(ku.id)] = ku.name;
      }

      await supabase.from('app_settings').upsert({
        setting_key: 'kommo_presales_users',
        setting_value: { userIds: presalesUserIds, userToSdr: kommoUserToSdr, nameMap: kommoUserToName, groupId: bestGroupId, refreshedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });
    }

    if (presalesUserIds.length === 0) return resp({ error: 'No pre-sales users found' }, 400);

    const { data: syncStateSetting } = await supabase.from('app_settings').select('setting_value').eq('setting_key', 'kommo_sync_state').maybeSingle();
    let state = (syncStateSetting?.setting_value as any) || {};
    let leadPage = state.leadPage || 1;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fromUnix = Math.floor(startOfMonth.getTime() / 1000);

    let totalSynced = 0;
    let totalMessages = 0;

    // ══════════════════════════════════════════════════════════
    // STEP 1: Sync leads + find associated talks
    // ══════════════════════════════════════════════════════════
    let hasMore = true;
    let pages = 0;

    while (hasMore && pages < MAX_LEAD_PAGES) {
      try {
        const data = await fetchKommoWithArrayFilters(
          config.subdomain, config.access_token, '/api/v4/leads',
          { page: String(leadPage), limit: '250', with: 'contacts', 'filter[created_at][from]': String(fromUnix) },
          { 'filter[responsible_user_id]': presalesUserIds }
        );
        const leads = data?._embedded?.leads || [];
        if (!leads.length) { hasMore = false; break; }
        console.log(`Leads page ${leadPage}: ${leads.length} leads`);

        const upserts = [];
        for (const lead of leads) {
          const uid = lead.responsible_user_id;
          const sdrId = kommoUserToSdr[String(uid)] || null;
          if (!sdrId) continue;
          const contacts = lead._embedded?.contacts || [];
          const contactId = contacts[0]?.id || null;
          upserts.push({
            kommo_id: String(lead.id),
            sdr_id: sdrId,
            responsible_user_id: uid,
            kommo_contact_id: contactId ? String(contactId) : null,
            lead_name: contacts[0]?.name || lead.name || `Lead #${lead.id}`,
            status: lead.status_id === 142 || lead.status_id === 143 ? 'closed' : 'active',
            started_at: lead.created_at ? new Date(lead.created_at * 1000).toISOString() : null,
            finished_at: lead.closed_at ? new Date(lead.closed_at * 1000).toISOString() : null,
            synced_at: new Date().toISOString(),
          });
        }
        if (upserts.length > 0) {
          await supabase.from('kommo_conversations').upsert(upserts, { onConflict: 'kommo_id' });
          totalSynced += upserts.length;
        }
        hasMore = leads.length >= 250;
        leadPage++;
        pages++;
      } catch (e: any) {
        console.error('Leads error:', e.message);
        hasMore = false;
      }
    }
    if (!hasMore) leadPage = 1;
    console.log(`Leads synced: ${totalSynced}`);

    // ══════════════════════════════════════════════════════════
    // STEP 2: For each lead, find its talk_id via events, then
    // fetch talk detail to get the chat_id for amojo
    // ══════════════════════════════════════════════════════════
    const { data: convsNeedMsgs } = await supabase
      .from('kommo_conversations')
      .select('id, kommo_id, sdr_id, responsible_user_id')
      .not('sdr_id', 'is', null)
      .or('messages_count.eq.0,messages_count.is.null')
      .order('started_at', { ascending: true })
      .limit(MAX_MSG_TALKS);

    console.log(`Conversations needing messages: ${(convsNeedMsgs || []).length}`);

    for (const conv of (convsNeedMsgs || [])) {
      try {
        // Step 2a: Get the talk detail for this lead
        // First, try to find the talk via the talks list filtered by this entity
        const talksData = await fetchKommo(
          config.subdomain, config.access_token, '/api/v4/talks',
          { 'filter[entity_id]': conv.kommo_id, 'filter[entity_type]': 'leads', limit: '1' }
        );

        const talks = talksData?._embedded?.talks || [];
        
        if (talks.length > 0) {
          const talk = talks[0];
          
          // Log the full talk structure for the first one
          if (totalMessages === 0) {
            console.log('Talk structure:', JSON.stringify(talk).substring(0, 1000));
          }

          // The talk may have a chat_id in _embedded or directly
          const chatId = talk.chat_id || talk._embedded?.chat?.id || talk.id;
          
          // Step 2b: Try fetching messages from the talk's messages endpoint
          // Kommo has /api/v4/talks/{id} which may include message data
          try {
            const talkDetail = await fetchKommo(
              config.subdomain, config.access_token, `/api/v4/talks/${talk.id}`,
              { with: 'messages' }
            );
            
            if (totalMessages === 0) {
              console.log('Talk detail:', JSON.stringify(talkDetail).substring(0, 1000));
            }
          } catch (e: any) {
            console.log(`Talk detail error: ${e.message.substring(0, 200)}`);
          }

          // Step 2c: Try the amojo chat history API
          if (config.scope_id) {
            try {
              // Try with talk.id as chat_id
              const chatHistory = await fetchAmojo(config.scope_id, config.access_token, String(chatId));
              console.log('Amojo response:', JSON.stringify(chatHistory).substring(0, 1000));
              
              // Parse messages from amojo response
              const amojoMsgs = chatHistory?.messages || chatHistory?._embedded?.messages || [];
              if (amojoMsgs.length > 0) {
                console.log('Got amojo messages:', amojoMsgs.length);
              }
            } catch (e: any) {
              console.log(`Amojo error (chatId=${chatId}): ${e.message.substring(0, 200)}`);
              
              // Try with contact_id
              if (conv.kommo_contact_id) {
                try {
                  const chatHistory2 = await fetchAmojo(config.scope_id, config.access_token, conv.kommo_contact_id);
                  console.log('Amojo (contact) response:', JSON.stringify(chatHistory2).substring(0, 500));
                } catch (e2: any) {
                  console.log(`Amojo contact error: ${e2.message.substring(0, 200)}`);
                }
              }
            }
          }
        } else {
          console.log(`No talk found for lead ${conv.kommo_id}`);
        }

        // Mark as processed even if no messages to avoid re-processing
        // Set messages_count to -1 to indicate "checked, no messages"
        await supabase.from('kommo_conversations').update({ messages_count: -1 }).eq('id', conv.id);
      } catch (e: any) {
        console.error(`Error processing lead ${conv.kommo_id}: ${e.message}`);
        await supabase.from('kommo_conversations').update({ messages_count: -1 }).eq('id', conv.id);
      }
    }

    // Save state
    await supabase.from('app_settings').upsert({
      setting_key: 'kommo_sync_state',
      setting_value: { leadPage },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'setting_key' });
    await supabase.from('kommo_config').update({ last_sync_at: new Date().toISOString() }).eq('id', config.id);

    console.log(`Done: leads=${totalSynced}, msgs=${totalMessages}, users=${presalesUserIds.length}`);
    return resp({ success: true, leads_synced: totalSynced, messages_synced: totalMessages, presales_users: presalesUserIds.length });
  } catch (error: any) {
    console.error('Sync error:', error);
    return resp({ error: error.message }, 500);
  }
});

async function fetchAmojo(scopeId: string, token: string, chatId: string) {
  const url = `https://amojo.kommo.com/v2/origin/custom/${scopeId}/chats/${chatId}/history`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = (await res.text()).substring(0, 300);
    throw new Error(`Amojo ${res.status}: ${body}`);
  }
  const text = await res.text();
  if (!text || text.trim() === '') return {};
  return JSON.parse(text);
}
