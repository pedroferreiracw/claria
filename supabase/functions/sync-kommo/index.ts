import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_LEAD_PAGES = 3;
const MAX_MSG_CONVS = 10;
const USERS_CACHE_HOURS = 24;
const EMPTY_MD5 = 'd41d8cd98f00b204e9800998ecf8427e'; // MD5 of empty string

// ══════════════════════════════════════════════════════════
// CRM API helpers (Bearer token)
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// HMAC-SHA1 signing for Amojo Chat API (corrected per docs)
// ══════════════════════════════════════════════════════════
async function hmacSha1(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetch chat history from Amojo API with correct canonical HMAC-SHA1 signing.
 * 
 * Signature format per docs:
 *   checkString = METHOD + "\n" + Content-MD5 + "\n" + Content-Type + "\n" + Date + "\n" + path
 *   X-Signature = HMAC-SHA1(channel_secret, checkString)
 * 
 * For GET requests: Content-MD5 = md5("") = d41d8cd98f00b204e9800998ecf8427e
 */
async function fetchAmojoChatHistory(
  scopeId: string, secretKey: string, chatId: string, offset = 0
): Promise<{ status: number; body: string; headers?: Record<string, string> }> {
  const path = `/v2/origin/custom/${scopeId}/chats/${chatId}/history`;
  const queryString = `?offset=${offset}&limit=50`;
  const url = `https://amojo.kommo.com${path}${queryString}`;
  const method = 'GET';
  const contentType = 'application/json';
  const dateStr = new Date().toUTCString();
  
  // Canonical signature string per Kommo docs
  const signStr = [method, EMPTY_MD5, contentType, dateStr, path].join('\n');
  const signature = await hmacSha1(secretKey, signStr);

  const res = await fetch(url, {
    method,
    headers: {
      'Date': dateStr,
      'Content-Type': contentType,
      'Content-MD5': EMPTY_MD5,
      'X-Signature': signature,
    },
  });
  const text = await res.text();
  return { status: res.status, body: text.substring(0, 5000) };
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
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'sync'; // 'sync' | 'diagnose'

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: configs } = await supabase
      .from('kommo_config')
      .select('id, subdomain, access_token, scope_id, secret_key')
      .eq('is_connected', true).limit(1);
    if (!configs?.length) return resp({ error: 'Kommo not configured' }, 400);
    const config = configs[0];

    // Auto-fetch scope_id (amojo_id) if not set
    if (!config.scope_id) {
      try {
        const accountData = await fetchKommo(config.subdomain, config.access_token, '/api/v4/account', { with: 'amojo_id' });
        const amojoId = accountData?.amojo_id;
        if (amojoId) {
          config.scope_id = amojoId;
          await supabase.from('kommo_config').update({ scope_id: amojoId }).eq('id', config.id);
          console.log(`Auto-fetched scope_id (amojo_id): ${amojoId}`);
        }
      } catch (e: any) {
        console.error('Error fetching amojo_id:', e.message);
      }
    }

    // ══════════════════════════════════════════════════════════
    // DIAGNOSE MODE: Deterministic per-endpoint validation
    // ══════════════════════════════════════════════════════════
    if (mode === 'diagnose') {
      console.log('=== DIAGNOSE MODE ===');
      console.log(`Config: subdomain=${config.subdomain}, scope_id=${config.scope_id}, has_secret=${!!config.secret_key}`);
      const results: Record<string, any> = {};

      // Step 1: Get a talk to find a contact with chat
      try {
        const talksData = await fetchKommo(config.subdomain, config.access_token, '/api/v4/talks', { limit: '5', with: 'contacts' });
        const talks = talksData?._embedded?.talks || [];
        results.talks = { count: talks.length, samples: talks.slice(0, 3).map((t: any) => ({
          id: t.id, chat_id: t.chat_id, is_read: t.is_read, contact_id: t.contact_id,
          origin: t.origin, entity_type: t.entity_type, entity_id: t.entity_id,
        }))};
        console.log(`Step 1 - Talks: ${talks.length} found`);
        if (talks.length > 0) console.log('Talk[0]:', JSON.stringify(talks[0]).substring(0, 1000));
      } catch (e: any) {
        results.talks = { error: e.message };
        console.log(`Step 1 error: ${e.message}`);
      }

      // Step 2: Get contact chats via official endpoint
      const sampleTalk = results.talks?.samples?.[0];
      if (sampleTalk?.contact_id) {
        try {
          const contactChatsUrl = `https://${config.subdomain}.kommo.com/api/v4/contacts/chats?contact_id=${sampleTalk.contact_id}`;
          const res = await fetch(contactChatsUrl, { headers: { Authorization: `Bearer ${config.access_token}` } });
          const text = await res.text();
          results.contact_chats = { status: res.status, body: text.substring(0, 2000) };
          console.log(`Step 2 - Contact chats (${res.status}):`, text.substring(0, 2000));
        } catch (e: any) {
          results.contact_chats = { error: e.message };
          console.log(`Step 2 error: ${e.message}`);
        }
      }

      // Step 3: Test Amojo history with correct HMAC (using chat_id from talk)
      const chatIdToTest = sampleTalk?.chat_id;
      if (config.scope_id && config.secret_key && chatIdToTest) {
        try {
          const amojoResult = await fetchAmojoChatHistory(config.scope_id, config.secret_key, chatIdToTest);
          results.amojo_with_chat_id = { status: amojoResult.status, body: amojoResult.body.substring(0, 2000) };
          console.log(`Step 3a - Amojo chat_id=${chatIdToTest} (${amojoResult.status}):`, amojoResult.body.substring(0, 2000));
          
          // Classify error
          if (amojoResult.status === 200) {
            results.amojo_status = 'SUCCESS';
          } else if (amojoResult.status === 401) {
            results.amojo_status = 'INVALID_SIGNATURE';
          } else if (amojoResult.status === 403) {
            results.amojo_status = 'FORBIDDEN_CHANNEL';
          } else if (amojoResult.status === 404) {
            results.amojo_status = 'NO_CHAT_MAPPING';
          } else {
            results.amojo_status = `HTTP_${amojoResult.status}`;
          }
        } catch (e: any) {
          results.amojo_with_chat_id = { error: e.message };
          results.amojo_status = 'EXCEPTION';
        }

        // Step 3b: Also try with talk.id (numeric)
        if (sampleTalk?.id) {
          try {
            const amojoResult2 = await fetchAmojoChatHistory(config.scope_id, config.secret_key, String(sampleTalk.id));
            results.amojo_with_talk_id = { status: amojoResult2.status, body: amojoResult2.body.substring(0, 1000) };
            console.log(`Step 3b - Amojo talk_id=${sampleTalk.id} (${amojoResult2.status}):`, amojoResult2.body.substring(0, 1000));
          } catch (e: any) {
            results.amojo_with_talk_id = { error: e.message };
          }
        }
      } else {
        results.amojo_status = !config.scope_id ? 'NO_SCOPE_ID' : !config.secret_key ? 'NO_SECRET_KEY' : 'NO_CHAT_ID';
      }

      // Step 4: Notes API for comparison
      if (sampleTalk?.entity_id) {
        try {
          const notesData = await fetchKommo(config.subdomain, config.access_token, `/api/v4/leads/${sampleTalk.entity_id}/notes`, { limit: '10' });
          const notes = notesData?._embedded?.notes || [];
          results.notes = {
            count: notes.length,
            types: notes.map((n: any) => n.note_type),
            samples: notes.slice(0, 3).map((n: any) => ({
              type: n.note_type, id: n.id,
              text: (n.params?.text || n.params?.service || '').substring(0, 200),
            })),
          };
          console.log(`Step 4 - Notes: ${notes.length}, types: ${notes.map((n: any) => n.note_type).join(', ')}`);
        } catch (e: any) {
          results.notes = { error: e.message };
        }
      }

      // Step 5: Events for sample lead
      if (sampleTalk?.entity_id) {
        try {
          const evUrl = new URL(`https://${config.subdomain}.kommo.com/api/v4/events`);
          evUrl.searchParams.set('filter[entity]', 'lead');
          evUrl.searchParams.set('filter[entity_id]', String(sampleTalk.entity_id));
          evUrl.searchParams.set('limit', '20');
          const res = await fetch(evUrl.toString(), { headers: { Authorization: `Bearer ${config.access_token}` } });
          const text = await res.text();
          if (text.trim()) {
            const data = JSON.parse(text);
            const events = data?._embedded?.events || [];
            const types = events.map((e: any) => e.type);
            results.events = { count: events.length, types: [...new Set(types)] };
            console.log(`Step 5 - Events: ${events.length}, types: ${[...new Set(types)].join(', ')}`);
          }
        } catch (e: any) {
          results.events = { error: e.message };
        }
      }

      console.log('=== DIAGNOSE COMPLETE ===');
      console.log('Summary:', JSON.stringify({ amojo_status: results.amojo_status, talks: results.talks?.count, notes_count: results.notes?.count }));
      return resp({ success: true, results });
    }

    // ══════════════════════════════════════════════════════════
    // NORMAL SYNC MODE
    // ══════════════════════════════════════════════════════════

    // PHASE A: Discover pre-sales users (cached)
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

    // PHASE B: Sync leads
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

    // PHASE C: Fetch messages for conversations that need them
    const { data: convsNeedMsgs } = await supabase
      .from('kommo_conversations')
      .select('id, kommo_id, sdr_id, kommo_contact_id, responsible_user_id, lead_name')
      .not('sdr_id', 'is', null)
      .or('messages_count.eq.0,messages_count.is.null')
      .order('started_at', { ascending: false })
      .limit(MAX_MSG_CONVS);

    console.log(`Conversations needing messages: ${(convsNeedMsgs || []).length}`);

    for (const conv of (convsNeedMsgs || [])) {
      const sdrName = kommoUserToName[String(conv.responsible_user_id)] || 'SDR';
      const now = new Date().toISOString();

      try {
        // ─── Strategy 1: Get chat_id via /api/v4/contacts/chats ───
        let chatId: string | null = null;
        
        if (conv.kommo_contact_id) {
          try {
            const contactChatsUrl = `https://${config.subdomain}.kommo.com/api/v4/contacts/chats?contact_id=${conv.kommo_contact_id}`;
            const ccRes = await fetch(contactChatsUrl, { headers: { Authorization: `Bearer ${config.access_token}` } });
            if (ccRes.ok) {
              const ccText = await ccRes.text();
              if (ccText.trim()) {
                const ccData = JSON.parse(ccText);
                // Response contains chat items with chat_id
                const items = ccData?._embedded?.chats || ccData?.items || [];
                if (Array.isArray(items) && items.length > 0) {
                  chatId = items[0].chat_id || items[0].id || null;
                  console.log(`Contact ${conv.kommo_contact_id}: chat_id=${chatId}`);
                }
                // If response itself has messages, use them directly
                if (items.length > 0 && items[0].last_message?.text) {
                  console.log(`Contact chats has last_message for ${conv.kommo_id}`);
                }
              }
            } else {
              console.log(`Contact chats ${conv.kommo_contact_id}: ${ccRes.status}`);
            }
          } catch (e: any) {
            console.log(`Contact chats error: ${e.message.substring(0, 100)}`);
          }
        }

        // ─── Strategy 2: Amojo Chat History with correct HMAC ───
        if (chatId && config.scope_id && config.secret_key) {
          try {
            const amojoResult = await fetchAmojoChatHistory(config.scope_id, config.secret_key, chatId);
            
            if (amojoResult.status === 200) {
              const amojoData = JSON.parse(amojoResult.body);
              const messages = amojoData?.messages || amojoData?.items || [];
              
              if (Array.isArray(messages) && messages.length > 0) {
                const msgUpserts = [];
                for (const msg of messages) {
                  const text = msg.text || msg.message || msg.body || '';
                  if (!text.trim()) continue;
                  
                  const isOutgoing = msg.is_outgoing || msg.direction === 'out' || 
                                     (msg.author && msg.author.type === 'user');
                  msgUpserts.push({
                    conversation_id: conv.id,
                    kommo_message_id: `amojo_${msg.id || msg.timestamp || Date.now()}_${Math.random().toString(36).substring(7)}`,
                    sender_type: isOutgoing ? 'sdr' : 'lead',
                    sender_name: isOutgoing ? sdrName : (conv.lead_name || 'Lead'),
                    content: text,
                    sent_at: msg.created_at ? new Date(msg.created_at * 1000).toISOString() : new Date().toISOString(),
                    response_time_seconds: null,
                  });
                }
                
                if (msgUpserts.length > 0) {
                  await supabase.from('kommo_messages').upsert(msgUpserts, { onConflict: 'kommo_message_id' });
                  await supabase.from('kommo_conversations').update({
                    messages_count: msgUpserts.length,
                    chat_id: chatId,
                    message_source: 'amojo',
                    fetch_status: 'success',
                    fetch_error: null,
                    last_fetch_attempt_at: now,
                  }).eq('id', conv.id);
                  totalMessages += msgUpserts.length;
                  console.log(`✅ Amojo: ${msgUpserts.length} msgs for lead ${conv.kommo_id}`);
                  continue;
                }
              }
            }
            
            // Log the Amojo error status for diagnostics
            const errorType = amojoResult.status === 401 ? 'invalid_signature' :
                             amojoResult.status === 403 ? 'forbidden_channel' :
                             amojoResult.status === 404 ? 'no_chat_mapping' :
                             `http_${amojoResult.status}`;
            console.log(`Amojo ${chatId}: ${errorType} (${amojoResult.status})`);
            
            await supabase.from('kommo_conversations').update({
              chat_id: chatId,
              fetch_status: errorType,
              fetch_error: amojoResult.body.substring(0, 500),
              last_fetch_attempt_at: now,
            }).eq('id', conv.id);
          } catch (e: any) {
            console.log(`Amojo error: ${e.message.substring(0, 200)}`);
          }
        }

        // ─── Strategy 3: Notes API for chat transcripts ───
        try {
          const notesData = await fetchKommo(config.subdomain, config.access_token, `/api/v4/leads/${conv.kommo_id}/notes`, { limit: '250' });
          const notes = notesData?._embedded?.notes || [];
          
          const notesWithText = notes.filter((n: any) => {
            const params = n.params || {};
            return params.text || params.service || params.html || n.text;
          });

          if (notesWithText.length > 0) {
            const msgUpserts = [];
            for (const note of notesWithText) {
              const params = note.params || {};
              const text = params.text || params.service || params.html || '';
              if (!text.trim()) continue;

              const isOutgoing = ['sms_out', 'call_out'].includes(note.note_type) ||
                                (note.created_by !== 0 && presalesUserIds.includes(note.created_by));
              
              msgUpserts.push({
                conversation_id: conv.id,
                kommo_message_id: `note_${note.id}`,
                sender_type: isOutgoing ? 'sdr' : 'lead',
                sender_name: isOutgoing ? sdrName : (conv.lead_name || 'Lead'),
                content: text,
                sent_at: new Date(note.created_at * 1000).toISOString(),
                response_time_seconds: null,
              });
            }

            if (msgUpserts.length > 0) {
              await supabase.from('kommo_messages').upsert(msgUpserts, { onConflict: 'kommo_message_id' });
              await supabase.from('kommo_conversations').update({
                messages_count: msgUpserts.length,
                message_source: 'notes',
                fetch_status: 'success',
                fetch_error: null,
                last_fetch_attempt_at: now,
              }).eq('id', conv.id);
              totalMessages += msgUpserts.length;
              console.log(`✅ Notes: ${msgUpserts.length} msgs for lead ${conv.kommo_id}`);
              continue;
            }
          }
        } catch (e: any) {
          console.log(`Notes error for ${conv.kommo_id}: ${e.message.substring(0, 100)}`);
        }

        // No messages found
        console.log(`No messages found for lead ${conv.kommo_id}`);
        await supabase.from('kommo_conversations').update({
          messages_count: -1,
          fetch_status: 'no_messages',
          last_fetch_attempt_at: now,
        }).eq('id', conv.id);
      } catch (e: any) {
        console.error(`Error lead ${conv.kommo_id}: ${e.message.substring(0, 200)}`);
        await supabase.from('kommo_conversations').update({
          messages_count: -1,
          fetch_status: 'error',
          fetch_error: e.message.substring(0, 500),
          last_fetch_attempt_at: now,
        }).eq('id', conv.id);
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
