import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as encodeBase64 } from 'https://deno.land/std@0.208.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_LEAD_PAGES = 3;
const MAX_MSG_CONVS = 10;
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

// ══════════════════════════════════════════════════════════
// HMAC-SHA1 signing for Amojo Chat API
// ══════════════════════════════════════════════════════════
async function hmacSha1(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchAmojoChatHistory(
  scopeId: string, secretKey: string, chatId: string, offset = 0
): Promise<any> {
  const path = `/v2/origin/custom/${scopeId}/chats/${chatId}/history`;
  const url = `https://amojo.kommo.com${path}?offset=${offset}&limit=50`;
  const method = 'GET';
  const contentType = '';
  const dateStr = new Date().toUTCString();
  // Signature: method\n\ncontent-type\ndate\npath
  const signStr = [method, '', contentType, dateStr, path].join('\n');
  const signature = await hmacSha1(secretKey, signStr);

  const res = await fetch(url, {
    method,
    headers: {
      'Date': dateStr,
      'Content-Type': 'application/json',
      'X-Signature': signature,
    },
  });
  const text = await res.text();
  return { status: res.status, body: text.substring(0, 2000) };
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
          console.log(`Auto-fetched scope_id: ${amojoId}`);
        }
      } catch (e: any) {
        console.error('Error fetching amojo_id:', e.message);
      }
    }

    // ══════════════════════════════════════════════════════════
    // DIAGNOSE MODE: Test all APIs to find message content
    // ══════════════════════════════════════════════════════════
    if (mode === 'diagnose') {
      console.log('=== DIAGNOSE MODE ===');
      console.log(`scope_id: ${config.scope_id}, has_secret: ${!!config.secret_key}`);
      const results: Record<string, any> = {};

      // Find a lead with known chat events
      const evUrl = new URL(`https://${config.subdomain}.kommo.com/api/v4/events`);
      evUrl.searchParams.append('filter[type][]', 'incoming_chat_message');
      evUrl.searchParams.set('limit', '5');
      const evRes = await fetch(evUrl.toString(), { headers: { Authorization: `Bearer ${config.access_token}` } });
      const evData = JSON.parse(await evRes.text());
      const sampleEvents = evData?._embedded?.events || [];
      
      if (sampleEvents.length === 0) {
        return resp({ error: 'No chat events found at all', results });
      }

      const sampleEvent = sampleEvents[0];
      const sampleLeadId = sampleEvent.entity_id;
      const sampleTalkId = sampleEvent.value_after?.[0]?.message?.talk_id;
      const sampleMsgId = sampleEvent.value_after?.[0]?.message?.id;
      const sampleContactId = sampleEvent._embedded?.entity?.linked_talk_contact_id;
      
      console.log(`Sample: leadId=${sampleLeadId}, talkId=${sampleTalkId}, msgId=${sampleMsgId}, contactId=${sampleContactId}`);
      results.sample = { leadId: sampleLeadId, talkId: sampleTalkId, msgId: sampleMsgId, contactId: sampleContactId };

      // TEST 1: Notes API
      try {
        const notesData = await fetchKommo(config.subdomain, config.access_token, `/api/v4/leads/${sampleLeadId}/notes`, { limit: '10' });
        const notes = notesData?._embedded?.notes || [];
        results.notes = { count: notes.length, sample: notes.slice(0, 2).map((n: any) => ({ type: n.note_type, params: n.params })) };
        console.log(`TEST 1 Notes: ${notes.length} notes found`);
        if (notes.length > 0) console.log('Note sample:', JSON.stringify(notes[0]).substring(0, 500));
      } catch (e: any) {
        results.notes = { error: e.message };
        console.log(`TEST 1 Notes error: ${e.message}`);
      }

      // TEST 2: Talks API - list talks
      try {
        const talksData = await fetchKommo(config.subdomain, config.access_token, '/api/v4/talks', { limit: '5' });
        const talks = talksData?._embedded?.talks || [];
        results.talks_list = { count: talks.length, sample: talks.slice(0, 2).map((t: any) => ({ id: t.id, chat_id: t.chat_id, is_read: t.is_read })) };
        console.log(`TEST 2 Talks list: ${talks.length} talks`);
        if (talks.length > 0) console.log('Talk sample:', JSON.stringify(talks[0]).substring(0, 800));
      } catch (e: any) {
        results.talks_list = { error: e.message };
        console.log(`TEST 2 Talks error: ${e.message}`);
      }

      // TEST 3: Talk by ID if we have talk_id
      if (sampleTalkId) {
        try {
          const talkData = await fetchKommo(config.subdomain, config.access_token, `/api/v4/talks/${sampleTalkId}`, {});
          results.talk_detail = { data: JSON.stringify(talkData).substring(0, 800) };
          console.log(`TEST 3 Talk ${sampleTalkId}:`, JSON.stringify(talkData).substring(0, 800));
        } catch (e: any) {
          results.talk_detail = { error: e.message };
          console.log(`TEST 3 Talk detail error: ${e.message}`);
        }
      }

      // TEST 4: Contacts chat messages (/api/v4/contacts/{id}/chats)
      if (sampleContactId) {
        try {
          const url = `https://${config.subdomain}.kommo.com/api/v4/contacts/${sampleContactId}/chats`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${config.access_token}` } });
          const text = await res.text();
          results.contact_chats = { status: res.status, body: text.substring(0, 800) };
          console.log(`TEST 4 Contact chats (${res.status}):`, text.substring(0, 800));
        } catch (e: any) {
          results.contact_chats = { error: e.message };
          console.log(`TEST 4 Contact chats error: ${e.message}`);
        }
      }

      // TEST 5: Amojo Chat History API with HMAC signing
      if (config.scope_id && config.secret_key && sampleTalkId) {
        // Try with talk_id as chat_id
        try {
          const amojoResult = await fetchAmojoChatHistory(config.scope_id, config.secret_key, String(sampleTalkId));
          results.amojo_talk_id = amojoResult;
          console.log(`TEST 5a Amojo (talk_id=${sampleTalkId}): status=${amojoResult.status}, body=${amojoResult.body}`);
        } catch (e: any) {
          results.amojo_talk_id = { error: e.message };
          console.log(`TEST 5a Amojo error: ${e.message}`);
        }
      }

      // TEST 6: Try /api/v4/chats endpoint
      try {
        const url = `https://${config.subdomain}.kommo.com/api/v4/chats?limit=5`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${config.access_token}` } });
        const text = await res.text();
        results.chats_endpoint = { status: res.status, body: text.substring(0, 800) };
        console.log(`TEST 6 /chats (${res.status}):`, text.substring(0, 800));
      } catch (e: any) {
        results.chats_endpoint = { error: e.message };
        console.log(`TEST 6 /chats error: ${e.message}`);
      }

      // TEST 7: GET /api/v4/talks/{talk_id}/messages (undocumented but sometimes works)
      if (sampleTalkId) {
        try {
          const url = `https://${config.subdomain}.kommo.com/api/v4/talks/${sampleTalkId}/messages?limit=10`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${config.access_token}` } });
          const text = await res.text();
          results.talk_messages = { status: res.status, body: text.substring(0, 1500) };
          console.log(`TEST 7 Talk messages (${res.status}):`, text.substring(0, 1500));
        } catch (e: any) {
          results.talk_messages = { error: e.message };
          console.log(`TEST 7 Talk messages error: ${e.message}`);
        }
      }

      // TEST 8: Amojo with scope_id + different chat_id formats
      if (config.scope_id && config.secret_key && sampleMsgId) {
        // Try with the message UUID as chat reference
        try {
          const amojoResult = await fetchAmojoChatHistory(config.scope_id, config.secret_key, sampleMsgId);
          results.amojo_msg_id = amojoResult;
          console.log(`TEST 8 Amojo (msgId): status=${amojoResult.status}, body=${amojoResult.body}`);
        } catch (e: any) {
          results.amojo_msg_id = { error: e.message };
          console.log(`TEST 8 Amojo msg error: ${e.message}`);
        }
      }

      // TEST 9: Amojo list chats
      if (config.scope_id && config.secret_key) {
        try {
          const path = `/v2/origin/custom/${config.scope_id}/chats`;
          const url = `https://amojo.kommo.com${path}?limit=5`;
          const dateStr = new Date().toUTCString();
          const signStr = ['GET', '', '', dateStr, path].join('\n');
          const signature = await hmacSha1(config.secret_key, signStr);
          const res = await fetch(url, {
            headers: { 'Date': dateStr, 'Content-Type': 'application/json', 'X-Signature': signature },
          });
          const text = await res.text();
          results.amojo_list_chats = { status: res.status, body: text.substring(0, 1500) };
          console.log(`TEST 9 Amojo list chats (${res.status}):`, text.substring(0, 1500));
        } catch (e: any) {
          results.amojo_list_chats = { error: e.message };
          console.log(`TEST 9 Amojo list error: ${e.message}`);
        }
      }

      // TEST 10: Events API - try getting ALL events for the lead (not just chat type)
      try {
        const url = new URL(`https://${config.subdomain}.kommo.com/api/v4/events`);
        url.searchParams.set('filter[entity]', 'lead');
        url.searchParams.set('filter[entity_id]', String(sampleLeadId));
        url.searchParams.set('limit', '50');
        const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${config.access_token}` } });
        const text = await res.text();
        const data = JSON.parse(text);
        const events = data?._embedded?.events || [];
        const types = events.map((e: any) => e.type);
        results.all_events = { count: events.length, types: [...new Set(types)] };
        console.log(`TEST 10 All events for lead ${sampleLeadId}: ${events.length} events, types: ${[...new Set(types)].join(', ')}`);
        // Check if any event has actual text in value_after
        for (const evt of events) {
          const va = evt.value_after || [];
          for (const v of va) {
            if (v.message?.text || v.text || v.note?.text) {
              console.log(`Found text in event ${evt.id} (${evt.type}): ${JSON.stringify(v).substring(0, 500)}`);
              results.event_with_text = { eventId: evt.id, type: evt.type, value: JSON.stringify(v).substring(0, 500) };
              break;
            }
          }
        }
      } catch (e: any) {
        results.all_events = { error: e.message };
        console.log(`TEST 10 All events error: ${e.message}`);
      }

      console.log('=== DIAGNOSE COMPLETE ===');
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

    // PHASE C: Fetch messages
    const { data: convsNeedMsgs } = await supabase
      .from('kommo_conversations')
      .select('id, kommo_id, sdr_id, kommo_contact_id, responsible_user_id, lead_name')
      .not('sdr_id', 'is', null)
      .or('messages_count.eq.0,messages_count.is.null')
      .order('started_at', { ascending: false })
      .limit(MAX_MSG_CONVS);

    console.log(`Conversations needing messages: ${(convsNeedMsgs || []).length}`);

    for (const conv of (convsNeedMsgs || [])) {
      try {
        // Strategy 1: Try Notes API for chat transcripts
        const notesData = await fetchKommo(config.subdomain, config.access_token, `/api/v4/leads/${conv.kommo_id}/notes`, { limit: '250' });
        const notes = notesData?._embedded?.notes || [];
        
        // Filter notes that contain chat/message content
        const chatNotes = notes.filter((n: any) => {
          const t = n.note_type;
          // Types: common, call_in, call_out, sms_in, sms_out, message_cashier, 
          // service_message, extended_service_message, geolocation, file, attachment, amomail_message
          return ['sms_in', 'sms_out', 'service_message', 'extended_service_message', 'amomail_message', 'common'].includes(t);
        });

        // Also check ALL notes for any with text content
        const allNotesWithText = notes.filter((n: any) => {
          const params = n.params || {};
          return params.text || params.service || params.html || n.text;
        });

        const sdrName = kommoUserToName[String(conv.responsible_user_id)] || 'SDR';

        if (allNotesWithText.length > 0) {
          console.log(`Lead ${conv.kommo_id}: ${allNotesWithText.length} notes with text (types: ${allNotesWithText.map((n: any) => n.note_type).join(', ')})`);
          
          const msgUpserts = [];
          for (const note of allNotesWithText) {
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
            await supabase.from('kommo_conversations').update({ messages_count: msgUpserts.length }).eq('id', conv.id);
            totalMessages += msgUpserts.length;
            console.log(`✅ ${msgUpserts.length} note-msgs for lead ${conv.kommo_id}`);
            continue;
          }
        }

        // Strategy 2: Events API - extract message text from events
        const eventsUrl = new URL(`https://${config.subdomain}.kommo.com/api/v4/events`);
        eventsUrl.searchParams.set('filter[entity]', 'lead');
        eventsUrl.searchParams.set('filter[entity_id]', conv.kommo_id);
        eventsUrl.searchParams.append('filter[type][]', 'incoming_chat_message');
        eventsUrl.searchParams.append('filter[type][]', 'outgoing_chat_message');
        eventsUrl.searchParams.set('limit', '100');

        const eventsRes = await fetch(eventsUrl.toString(), {
          headers: { Authorization: `Bearer ${config.access_token}` },
        });

        if (eventsRes.ok) {
          const eventsText = await eventsRes.text();
          if (eventsText && eventsText.trim() !== '') {
            const eventsData = JSON.parse(eventsText);
            const events = eventsData?._embedded?.events || [];
            
            if (events.length > 0) {
              // Extract talk_id from first event for Amojo attempt
              const talkId = events[0].value_after?.[0]?.message?.talk_id;
              
              // Strategy 3: Amojo Chat History with talk_id
              if (config.scope_id && config.secret_key && talkId) {
                try {
                  const amojoResult = await fetchAmojoChatHistory(config.scope_id, config.secret_key, String(talkId));
                  if (amojoResult.status === 200) {
                    const amojoData = JSON.parse(amojoResult.body);
                    const messages = amojoData?.messages || amojoData?.items || amojoData || [];
                    
                    if (Array.isArray(messages) && messages.length > 0) {
                      const msgUpserts = [];
                      for (const msg of messages) {
                        const text = msg.text || msg.message || msg.body || '';
                        if (!text.trim()) continue;
                        
                        const isOutgoing = msg.is_outgoing || msg.direction === 'out' || msg.author_id != null;
                        msgUpserts.push({
                          conversation_id: conv.id,
                          kommo_message_id: `amojo_${msg.id || msg.timestamp || Date.now()}`,
                          sender_type: isOutgoing ? 'sdr' : 'lead',
                          sender_name: isOutgoing ? sdrName : (conv.lead_name || 'Lead'),
                          content: text,
                          sent_at: msg.created_at ? new Date(msg.created_at * 1000).toISOString() : new Date().toISOString(),
                          response_time_seconds: null,
                        });
                      }
                      
                      if (msgUpserts.length > 0) {
                        await supabase.from('kommo_messages').upsert(msgUpserts, { onConflict: 'kommo_message_id' });
                        await supabase.from('kommo_conversations').update({ messages_count: msgUpserts.length }).eq('id', conv.id);
                        totalMessages += msgUpserts.length;
                        console.log(`✅ ${msgUpserts.length} amojo-msgs for lead ${conv.kommo_id}`);
                        continue;
                      }
                    }
                  }
                  console.log(`Amojo for talk ${talkId}: status=${amojoResult.status}`);
                } catch (e: any) {
                  console.log(`Amojo error for talk ${talkId}: ${e.message.substring(0, 200)}`);
                }
              }
            }
          }
        }

        // No messages found with any strategy
        console.log(`No messages found for lead ${conv.kommo_id}`);
        await supabase.from('kommo_conversations').update({ messages_count: -1 }).eq('id', conv.id);
      } catch (e: any) {
        console.error(`Error lead ${conv.kommo_id}: ${e.message.substring(0, 200)}`);
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
