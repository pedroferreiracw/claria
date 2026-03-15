import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TALK_PAGES = 3;
const MAX_MSG_TALKS = 15;
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
      return res.json();
    });
}

async function fetchAmojo(scopeId: string, token: string, chatId: string) {
  const url = `https://amojo.kommo.com/v2/origin/custom/${scopeId}/chats/${chatId}/history`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = (await res.text()).substring(0, 300);
    throw new Error(`Amojo ${res.status}: ${body}`);
  }
  return res.json();
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
        const kuNameLower = (ku.name || '').toLowerCase();
        for (const sdr of sdrList) {
          const sdrFirst = sdr.name.toLowerCase().split(' ')[0];
          const kuFirst = kuNameLower.split(' ')[0];
          if (kuNameLower === sdr.name.toLowerCase() || (kuFirst.length >= 3 && kuFirst === sdrFirst)) {
            groupMatchCount.set(gid, (groupMatchCount.get(gid) || 0) + 1);
            break;
          }
        }
      }

      let bestGroupId = 0, bestCount = 0;
      for (const [gid, count] of groupMatchCount) {
        if (count > bestCount) { bestGroupId = gid; bestCount = count; }
      }

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
            matchedSdrId = sdr.id;
            break;
          }
        }

        if (!matchedSdrId) {
          const { data: newSdr } = await supabase.from('sdrs').insert({
            name: ku.name, role: 'SDR', squad: 'Águia', team_type: 'SDR',
          }).select('id').single();
          if (newSdr) { matchedSdrId = newSdr.id; sdrList.push({ id: newSdr.id, name: ku.name }); }
        }

        presalesUserIds.push(ku.id);
        if (matchedSdrId) kommoUserToSdr[String(ku.id)] = matchedSdrId;
        kommoUserToName[String(ku.id)] = ku.name;
      }

      await supabase.from('app_settings').upsert({
        setting_key: 'kommo_presales_users',
        setting_value: {
          userIds: presalesUserIds, userToSdr: kommoUserToSdr,
          nameMap: kommoUserToName, groupId: bestGroupId,
          refreshedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });
    }

    if (presalesUserIds.length === 0) return resp({ error: 'No pre-sales users found' }, 400);

    // ══════════════════════════════════════════════════════════
    // Read sync state
    // ══════════════════════════════════════════════════════════
    const { data: syncStateSetting } = await supabase
      .from('app_settings').select('setting_value')
      .eq('setting_key', 'kommo_sync_state').maybeSingle();

    let state = (syncStateSetting?.setting_value as any) || {};
    let talkPage = state.talkPage || 1;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fromUnix = Math.floor(startOfMonth.getTime() / 1000);

    let totalSynced = 0;
    let totalMessages = 0;

    // ══════════════════════════════════════════════════════════
    // STEP 1: Sync leads via Leads API (filtered by responsible_user_id)
    // This is more reliable than Talks API for SDR filtering
    // ══════════════════════════════════════════════════════════
    let hasMore = true;
    let pages = 0;

    while (hasMore && pages < MAX_TALK_PAGES) {
      try {
        const data = await fetchKommoWithArrayFilters(
          config.subdomain, config.access_token, '/api/v4/leads',
          {
            page: String(talkPage),
            limit: '250',
            with: 'contacts',
            'filter[created_at][from]': String(fromUnix),
          },
          { 'filter[responsible_user_id]': presalesUserIds }
        );

        const leads = data?._embedded?.leads || [];
        if (!leads.length) { hasMore = false; break; }

        // Log first lead structure for debugging
        if (pages === 0 && talkPage === 1 && leads.length > 0) {
          console.log('Sample lead:', JSON.stringify(leads[0]).substring(0, 800));
        }

        console.log(`Leads page ${talkPage}: ${leads.length} leads`);

        const upserts = [];
        for (const lead of leads) {
          const uid = lead.responsible_user_id;
          const sdrId = kommoUserToSdr[String(uid)] || null;
          if (!sdrId) continue; // Skip leads not assigned to known SDRs

          // Get contact info from embedded contacts
          const contacts = lead._embedded?.contacts || [];
          const contactId = contacts[0]?.id || null;
          const contactName = contacts[0]?.name || lead.name || `Lead #${lead.id}`;

          upserts.push({
            kommo_id: String(lead.id),
            sdr_id: sdrId,
            responsible_user_id: uid,
            kommo_contact_id: contactId ? String(contactId) : null,
            lead_name: contactName,
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
        talkPage++;
        pages++;
      } catch (e: any) {
        console.error('Leads fetch error:', e.message);
        hasMore = false;
      }
    }

    if (!hasMore) {
      talkPage = 1; // Reset for next cycle
    }

    console.log(`Leads synced: ${totalSynced}`);

    // ══════════════════════════════════════════════════════════
    // STEP 2: Fetch messages via Lead Notes API
    // Notes of type "service_message" contain actual chat text
    // Process conversations that have 0 messages first
    // ══════════════════════════════════════════════════════════
    const { data: convsNeedMsgs } = await supabase
      .from('kommo_conversations')
      .select('id, kommo_id, sdr_id')
      .not('sdr_id', 'is', null)
      .or('messages_count.eq.0,messages_count.is.null')
      .order('started_at', { ascending: false })
      .limit(MAX_MSG_TALKS);

    console.log(`Conversations needing messages: ${(convsNeedMsgs || []).length}`);

    for (const conv of (convsNeedMsgs || [])) {
      try {
        // Fetch notes for this lead
        const notesData = await fetchKommo(
          config.subdomain, config.access_token,
          `/api/v4/leads/${conv.kommo_id}/notes`,
          { limit: '100', order: 'asc' }
        );

        const notes = notesData?._embedded?.notes || [];

        // Log first note structure for debugging
        if (totalMessages === 0 && notes.length > 0) {
          console.log('Sample note:', JSON.stringify(notes[0]).substring(0, 500));
          // Log different note types
          const types = [...new Set(notes.map((n: any) => n.note_type))];
          console.log('Note types found:', types.join(', '));
        }

        const msgs: any[] = [];
        for (const note of notes) {
          // service_message = chat messages, common = manual notes
          // We want service_message, sms_in, sms_out, incoming_chat_message types
          const noteType = note.note_type;
          let text = '';
          let senderType = 'lead';

          if (noteType === 'service_message') {
            // Service messages contain chat message text in params.text or params.service
            text = note.params?.text || note.params?.service || '';
            // Determine direction from the service field
            if (note.params?.service?.includes('outgoing') || note.created_by > 0) {
              senderType = 'sdr';
            }
          } else if (noteType === 'common') {
            text = note.params?.text || '';
            senderType = note.created_by > 0 ? 'sdr' : 'lead';
          } else if (noteType === 'sms_in' || noteType === 'call_in' || noteType === 'incoming_chat_message') {
            text = note.params?.text || note.params?.uniq || '';
            senderType = 'lead';
          } else if (noteType === 'sms_out' || noteType === 'call_out' || noteType === 'outgoing_chat_message') {
            text = note.params?.text || note.params?.uniq || '';
            senderType = 'sdr';
          }

          if (!text || text.length < 1) continue;

          const createdBy = note.created_by || 0;
          msgs.push({
            kommo_message_id: String(note.id),
            conversation_id: conv.id,
            sender_type: senderType,
            sender_name: senderType === 'sdr' ? (kommoUserToName[String(createdBy)] || 'SDR') : 'Lead',
            content: text.substring(0, 5000),
            sent_at: note.created_at ? new Date(note.created_at * 1000).toISOString() : new Date().toISOString(),
          });
        }

        if (msgs.length > 0) {
          const { error } = await supabase
            .from('kommo_messages')
            .upsert(msgs, { onConflict: 'kommo_message_id' });
          if (error) console.error('Message upsert error:', error);
          totalMessages += msgs.length;

          // Update message count and response time
          const updates: any = { messages_count: msgs.length };
          
          // Calculate avg response time
          if (msgs.length > 1) {
            let totalTime = 0, responseN = 0;
            for (let i = 1; i < msgs.length; i++) {
              if (msgs[i].sender_type === 'sdr' && msgs[i - 1].sender_type === 'lead') {
                const diff = (new Date(msgs[i].sent_at).getTime() - new Date(msgs[i - 1].sent_at).getTime()) / 1000;
                if (diff > 0 && diff < 86400) { totalTime += diff; responseN++; }
              }
            }
            if (responseN > 0) updates.avg_response_time_seconds = Math.round(totalTime / responseN);
          }

          await supabase.from('kommo_conversations').update(updates).eq('id', conv.id);
        }

        console.log(`  Lead ${conv.kommo_id}: ${notes.length} notes → ${msgs.length} messages`);
      } catch (e: any) {
        console.error(`Notes error for lead ${conv.kommo_id}: ${e.message}`);
      }
    }

    // Save state
    await supabase.from('app_settings').upsert({
      setting_key: 'kommo_sync_state',
      setting_value: { talkPage },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'setting_key' });

    await supabase.from('kommo_config').update({ last_sync_at: new Date().toISOString() }).eq('id', config.id);

    console.log(`Done: leads=${totalSynced}, msgs=${totalMessages}, users=${presalesUserIds.length}`);

    return resp({
      success: true,
      leads_synced: totalSynced,
      messages_synced: totalMessages,
      presales_users: presalesUserIds.length,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return resp({ error: error.message }, 500);
  }
});
