import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TALK_PAGES = 5;
const MAX_EVENT_PAGES = 10;
const USERS_CACHE_HOURS = 24;

async function fetchKommo(subdomain: string, token: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`https://${subdomain}.kommo.com${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = (await res.text()).substring(0, 300);
    throw new Error(`Kommo ${res.status}: ${body}`);
  }
  return res.json();
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

    // Get Kommo config
    const { data: configs } = await supabase
      .from('kommo_config')
      .select('id, subdomain, access_token, scope_id')
      .eq('is_connected', true).limit(1);
    if (!configs?.length) return resp({ error: 'Kommo not configured' }, 400);
    const config = configs[0];

    // ══════════════════════════════════════════════════════════
    // PHASE A: Discover pre-sales users by group_id (cached)
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
      console.log(`Fetched ${kommoUsers.length} Kommo users`);

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
          const sdrNameLower = sdr.name.toLowerCase();
          const kuFirst = kuNameLower.split(' ')[0];
          const sdrFirst = sdrNameLower.split(' ')[0];
          if (kuNameLower === sdrNameLower || (kuFirst.length >= 3 && kuFirst === sdrFirst)) {
            groupMatchCount.set(gid, (groupMatchCount.get(gid) || 0) + 1);
            break;
          }
        }
      }

      let bestGroupId = 0;
      let bestCount = 0;
      for (const [gid, count] of groupMatchCount) {
        if (count > bestCount) { bestGroupId = gid; bestCount = count; }
      }

      console.log(`Pre-sales group detected: ${bestGroupId} (${bestCount} SDR matches)`);

      const presalesGroup = groupUsers.get(bestGroupId) || [];
      console.log(`Pre-sales group has ${presalesGroup.length} users: ${presalesGroup.map((u: any) => u.name).join(', ')}`);

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
          if (newSdr) {
            matchedSdrId = newSdr.id;
            sdrList.push({ id: newSdr.id, name: ku.name });
          }
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

      console.log(`Cached ${presalesUserIds.length} pre-sales user IDs`);
    }

    if (presalesUserIds.length === 0) {
      return resp({ error: 'No pre-sales users found' }, 400);
    }

    // ══════════════════════════════════════════════════════════
    // Read sync state
    // ══════════════════════════════════════════════════════════
    const { data: syncStateSetting } = await supabase
      .from('app_settings').select('setting_value')
      .eq('setting_key', 'kommo_sync_state').maybeSingle();

    let state = (syncStateSetting?.setting_value as any) || {};
    let talkPage = state.talkPage || 1;
    let eventPage = state.eventPage || 1;
    let talksComplete = state.talksComplete || false;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fromUnix = Math.floor(startOfMonth.getTime() / 1000);

    let totalSynced = 0;
    let totalMessages = 0;

    // ══════════════════════════════════════════════════════════
    // STEP 1: Sync talks (limited pages per run, continues across runs)
    // ══════════════════════════════════════════════════════════
    if (!talksComplete) {
      let hasMore = true;
      let pages = 0;

      while (hasMore && pages < MAX_TALK_PAGES) {
        const data = await fetchKommoWithArrayFilters(
          config.subdomain, config.access_token, '/api/v4/talks',
          { page: String(talkPage), limit: '250', 'filter[created_at][from]': String(fromUnix) },
          { 'filter[responsible_user_id]': presalesUserIds }
        );

        const talks = data?._embedded?.talks || [];
        if (!talks.length) { hasMore = false; break; }

        console.log(`Talks page ${talkPage}: ${talks.length} talks`);

        const upserts = talks.filter((t: any) => t.id || t.talk_id).map((t: any) => {
          const talkId = String(t.id || t.talk_id);
          const uid = t.responsible_user_id;
          const sdrId = kommoUserToSdr[String(uid)] || null;
          const contactId = t.contact_id || t.entity_id || null;

          return {
            kommo_id: talkId,
            sdr_id: sdrId,
            responsible_user_id: uid,
            kommo_contact_id: contactId ? String(contactId) : null,
            lead_name: t.contact?.name || `Conversa #${talkId}`,
            status: t.is_closed ? 'closed' : 'active',
            started_at: t.created_at ? new Date(t.created_at * 1000).toISOString() : null,
            finished_at: t.is_closed && t.closed_at ? new Date(t.closed_at * 1000).toISOString() : null,
            synced_at: new Date().toISOString(),
          };
        });

        if (upserts.length > 0) {
          await supabase.from('kommo_conversations').upsert(upserts, { onConflict: 'kommo_id' });
          totalSynced += upserts.length;
        }

        hasMore = talks.length >= 250;
        talkPage++;
        pages++;
      }

      if (!hasMore) {
        talksComplete = true;
        talkPage = 1;
        console.log('All talks synced!');
      } else {
        console.log(`Talks progress: page ${talkPage} next run`);
      }
    }

    // ══════════════════════════════════════════════════════════
    // STEP 2: ALWAYS sync messages via Events API (runs every invocation)
    // ══════════════════════════════════════════════════════════
    // Build contact_id → conversation mapping
    const { data: convs } = await supabase
      .from('kommo_conversations')
      .select('id, kommo_contact_id, sdr_id')
      .not('kommo_contact_id', 'is', null)
      .limit(5000);

    const contactMap = new Map<string, { id: string; sdr_id: string | null }>();
    for (const c of (convs || [])) {
      if (c.kommo_contact_id) contactMap.set(c.kommo_contact_id, { id: c.id, sdr_id: c.sdr_id });
    }
    console.log(`Contact→Conv map: ${contactMap.size} entries`);

    if (contactMap.size > 0) {
      let hasMore = true;
      let pages = 0;

      while (hasMore && pages < MAX_EVENT_PAGES) {
        try {
          const data = await fetchKommo(
            config.subdomain, config.access_token, '/api/v4/events',
            {
              page: String(eventPage),
              limit: '100',
              'filter[type]': 'incoming_chat_message,outgoing_chat_message',
              'filter[created_at][from]': String(fromUnix),
            }
          );

          const events = data?._embedded?.events || [];
          if (!events.length) { hasMore = false; break; }

          // Log first event for debugging
          if (pages === 0) {
            console.log('Sample event:', JSON.stringify(events[0]).substring(0, 600));
          }

          console.log(`Events page ${eventPage}: ${events.length} events`);

          const msgs: any[] = [];
          let matched = 0, unmatched = 0;

          for (const evt of events) {
            const contactId = String(evt.entity_id || '');
            const conv = contactMap.get(contactId);
            if (!conv) { unmatched++; continue; }
            matched++;

            // Extract message text from various Kommo event structures
            let text = '';
            const va = evt.value_after;
            if (Array.isArray(va)) {
              for (const item of va) {
                if (item?.message?.text) { text = item.message.text; break; }
                if (item?.text) { text = item.text; break; }
                if (typeof item === 'string') { text = item; break; }
              }
            } else if (va?.message?.text) {
              text = va.message.text;
            } else if (va?.text) {
              text = va.text;
            } else if (typeof va === 'string') {
              text = va;
            }

            if (!text || text.length < 1) continue;

            const isOut = evt.type === 'outgoing_chat_message';
            msgs.push({
              kommo_message_id: String(evt.id),
              conversation_id: conv.id,
              sender_type: isOut ? 'sdr' : 'lead',
              sender_name: isOut ? (kommoUserToName[String(evt.created_by)] || 'SDR') : 'Lead',
              content: text.substring(0, 5000),
              sent_at: evt.created_at ? new Date(evt.created_at * 1000).toISOString() : new Date().toISOString(),
            });
          }

          console.log(`  Events: ${matched} matched, ${unmatched} unmatched, ${msgs.length} with text`);

          if (msgs.length > 0) {
            const { error } = await supabase
              .from('kommo_messages')
              .upsert(msgs, { onConflict: 'kommo_message_id' });
            if (error) console.error('Message upsert error:', error);
            totalMessages += msgs.length;
          }

          hasMore = events.length >= 100;
          eventPage++;
          pages++;
        } catch (e: any) {
          console.error('Events error:', e.message);
          hasMore = false;
        }
      }

      if (!hasMore) {
        eventPage = 1;
        console.log('Events cycle complete, will restart next run');
      }
    } else {
      console.log('No conversations with contact IDs yet, skipping events');
    }

    // ══════════════════════════════════════════════════════════
    // STEP 3: Quick enrichment (message counts + response times)
    // ══════════════════════════════════════════════════════════
    if (totalMessages > 0) {
      // Update message counts for conversations that got new messages
      const { data: convsToUpdate } = await supabase
        .from('kommo_conversations')
        .select('id')
        .or('messages_count.eq.0,messages_count.is.null')
        .limit(50);

      for (const conv of (convsToUpdate || [])) {
        const { count } = await supabase
          .from('kommo_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        if ((count || 0) > 0) {
          const updates: any = { messages_count: count };

          // Calculate avg response time
          const { data: msgs } = await supabase
            .from('kommo_messages')
            .select('sender_type, sent_at')
            .eq('conversation_id', conv.id)
            .order('sent_at', { ascending: true })
            .limit(100);

          if (msgs && msgs.length > 1) {
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
      }
    }

    // ══════════════════════════════════════════════════════════
    // STEP 4: Enrich contact names (batch of 20 per run)
    // ══════════════════════════════════════════════════════════
    const { data: unnamed } = await supabase
      .from('kommo_conversations')
      .select('id, kommo_contact_id')
      .like('lead_name', 'Conversa #%')
      .not('kommo_contact_id', 'is', null)
      .limit(20);

    let enriched = 0;
    for (const conv of (unnamed || [])) {
      try {
        const contact = await fetchKommo(config.subdomain, config.access_token, `/api/v4/contacts/${conv.kommo_contact_id}`);
        if (contact?.name) {
          const updates: any = { lead_name: contact.name };
          const pf = contact.custom_fields_values?.find((f: any) => f.field_code === 'PHONE');
          if (pf?.values?.[0]?.value) updates.lead_phone = pf.values[0].value;
          const ef = contact.custom_fields_values?.find((f: any) => f.field_code === 'EMAIL');
          if (ef?.values?.[0]?.value) updates.lead_email = ef.values[0].value;
          await supabase.from('kommo_conversations').update(updates).eq('id', conv.id);
          enriched++;
        }
      } catch (_) { /* skip */ }
    }

    // Save state
    await supabase.from('app_settings').upsert({
      setting_key: 'kommo_sync_state',
      setting_value: { talkPage, eventPage, talksComplete },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'setting_key' });

    await supabase.from('kommo_config').update({ last_sync_at: new Date().toISOString() }).eq('id', config.id);

    console.log(`Done: talks=${totalSynced}, msgs=${totalMessages}, enriched=${enriched}, users=${presalesUserIds.length}`);

    return resp({
      success: true,
      talks_synced: totalSynced,
      messages_synced: totalMessages,
      contacts_enriched: enriched,
      presales_users: presalesUserIds.length,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return resp({ error: error.message }, 500);
  }
});
