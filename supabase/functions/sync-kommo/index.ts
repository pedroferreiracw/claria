import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TALK_PAGES = 10;
const MAX_EVENT_PAGES = 5;
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

// Fetch Kommo with array filter params (e.g. filter[responsible_user_id][]=1&filter[responsible_user_id][]=2)
async function fetchKommoWithArrayFilters(
  subdomain: string, token: string, endpoint: string, 
  params: Record<string, string>, arrayFilters: Record<string, (string | number)[]>
) {
  const url = new URL(`https://${subdomain}.kommo.com${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  Object.entries(arrayFilters).forEach(([key, values]) => {
    values.forEach(v => url.searchParams.append(`${key}[]`, String(v)));
  });
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = (await res.text()).substring(0, 300);
    throw new Error(`Kommo ${res.status}: ${body}`);
  }
  return res.json();
}

function response(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Get Kommo config ──
    const { data: configs } = await supabase
      .from('kommo_config')
      .select('id, subdomain, access_token, scope_id')
      .eq('is_connected', true)
      .limit(1);
    if (!configs?.length) return response({ error: 'Kommo not configured' }, 400);
    const config = configs[0];

    // ── PHASE A: Discover pre-sales users (cached) ──
    const { data: usersCacheSetting } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'kommo_presales_users')
      .maybeSingle();

    let presalesUserIds: number[] = [];
    let kommoUserToSdr: Record<string, string> = {}; // kommo_user_id -> sdr_id
    let kommoUserToName: Record<string, string> = {}; // kommo_user_id -> name
    let needsUserRefresh = true;

    if (usersCacheSetting?.setting_value) {
      const cached = usersCacheSetting.setting_value as any;
      if (cached.refreshedAt) {
        const age = Date.now() - new Date(cached.refreshedAt).getTime();
        if (age < USERS_CACHE_HOURS * 3600 * 1000) {
          presalesUserIds = cached.userIds || [];
          kommoUserToSdr = cached.userToSdr || {};
          kommoUserToName = cached.nameMap || {};
          needsUserRefresh = false;
        }
      }
    }

    if (needsUserRefresh) {
      console.log('Refreshing Kommo users cache...');
      const usersData = await fetchKommo(config.subdomain, config.access_token, '/api/v4/users', { limit: '250' });
      const kommoUsers = usersData?._embedded?.users || [];
      console.log(`Fetched ${kommoUsers.length} Kommo users`);

      // Log all users with their group info for debugging
      for (const u of kommoUsers) {
        const groupId = u.rights?.group_id || 'none';
        console.log(`  User: ${u.name} (ID: ${u.id}, group_id: ${groupId})`);
      }

      // Get local SDRs
      const { data: localSdrs } = await supabase.from('sdrs').select('id, name').eq('team_type', 'SDR');
      const sdrList = localSdrs || [];
      console.log(`Local SDRs: ${sdrList.map(s => s.name).join(', ')}`);

      // Match Kommo users to local SDRs by name (fuzzy: first name match)
      for (const ku of kommoUsers) {
        const kuName = (ku.name || '').trim();
        const kuFirstName = kuName.split(' ')[0].toLowerCase();
        const kuFullLower = kuName.toLowerCase();

        for (const sdr of sdrList) {
          const sdrFirstName = sdr.name.split(' ')[0].toLowerCase();
          const sdrFullLower = sdr.name.toLowerCase();

          if (
            kuFullLower === sdrFullLower ||
            (kuFirstName.length >= 3 && kuFirstName === sdrFirstName) ||
            kuFullLower.includes(sdrFullLower) ||
            sdrFullLower.includes(kuFullLower)
          ) {
            presalesUserIds.push(ku.id);
            kommoUserToSdr[String(ku.id)] = sdr.id;
            kommoUserToName[String(ku.id)] = ku.name;
            console.log(`  Matched: ${ku.name} (Kommo ${ku.id}) → ${sdr.name} (SDR ${sdr.id})`);
            break;
          }
        }
      }

      // Cache
      await supabase.from('app_settings').upsert({
        setting_key: 'kommo_presales_users',
        setting_value: {
          userIds: presalesUserIds,
          userToSdr: kommoUserToSdr,
          nameMap: kommoUserToName,
          refreshedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });

      console.log(`Cached ${presalesUserIds.length} pre-sales user IDs`);
    }

    if (presalesUserIds.length === 0) {
      return response({
        error: 'No pre-sales users matched',
        hint: 'SDR names in the system must match Kommo user names',
      }, 400);
    }

    // ── Read sync state ──
    const { data: syncStateSetting } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'kommo_sync_state')
      .maybeSingle();

    const syncState = (syncStateSetting?.setting_value as any) || { phase: 'talks', talkPage: 1, eventPage: 1 };
    let { phase, talkPage, eventPage } = syncState;
    phase = phase || 'talks';
    talkPage = talkPage || 1;
    eventPage = eventPage || 1;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fromUnix = Math.floor(startOfMonth.getTime() / 1000);

    let totalSynced = 0;
    let totalMessages = 0;

    // ── PHASE B: Sync talks (filtered by pre-sales users) ──
    if (phase === 'talks') {
      let hasMore = true;
      let pagesProcessed = 0;

      while (hasMore && pagesProcessed < MAX_TALK_PAGES) {
        const data = await fetchKommoWithArrayFilters(
          config.subdomain, config.access_token, '/api/v4/talks',
          {
            page: String(talkPage),
            limit: '250',
            'filter[created_at][from]': String(fromUnix),
          },
          { 'filter[responsible_user_id]': presalesUserIds }
        );

        const talks = data?._embedded?.talks || [];
        if (!talks.length) {
          hasMore = false;
          break;
        }

        console.log(`Talks page ${talkPage}: ${talks.length} talks`);

        const upserts = talks.filter((t: any) => t.id || t.talk_id).map((t: any) => {
          const talkId = String(t.id || t.talk_id);
          const responsibleUserId = t.responsible_user_id;
          const sdrId = kommoUserToSdr[String(responsibleUserId)] || null;
          const contactId = t.contact_id || t.entity_id || null;
          const sdrName = kommoUserToName[String(responsibleUserId)] || null;

          return {
            kommo_id: talkId,
            sdr_id: sdrId,
            responsible_user_id: responsibleUserId,
            kommo_contact_id: contactId ? String(contactId) : null,
            lead_name: sdrName ? `Conversa de ${sdrName} #${talkId}` : `Conversa #${talkId}`,
            status: t.is_closed ? 'closed' : 'active',
            started_at: t.created_at ? new Date(t.created_at * 1000).toISOString() : null,
            finished_at: t.is_closed && t.closed_at ? new Date(t.closed_at * 1000).toISOString() : null,
            synced_at: new Date().toISOString(),
          };
        });

        if (upserts.length > 0) {
          const { error } = await supabase
            .from('kommo_conversations')
            .upsert(upserts, { onConflict: 'kommo_id' });
          if (error) console.error('Upsert talks error:', error);
          totalSynced += upserts.length;
        }

        hasMore = talks.length >= 250;
        talkPage++;
        pagesProcessed++;
      }

      if (!hasMore) {
        // Move to events phase
        phase = 'events';
        talkPage = 1;
        eventPage = 1;
        console.log(`Talks sync complete. Moving to events phase.`);
      }
    }

    // ── PHASE C: Sync messages via Events API ──
    if (phase === 'events') {
      // Build contact_id → conversation_id map
      const { data: convs } = await supabase
        .from('kommo_conversations')
        .select('id, kommo_id, kommo_contact_id, sdr_id')
        .not('kommo_contact_id', 'is', null)
        .limit(5000);

      const contactToConv = new Map<string, { id: string; kommo_id: string; sdr_id: string | null }>();
      for (const c of (convs || [])) {
        if (c.kommo_contact_id) {
          contactToConv.set(String(c.kommo_contact_id), { id: c.id, kommo_id: c.kommo_id, sdr_id: c.sdr_id });
        }
      }

      console.log(`Contact→Conv map: ${contactToConv.size} entries`);

      let hasMore = true;
      let pagesProcessed = 0;

      while (hasMore && pagesProcessed < MAX_EVENT_PAGES) {
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
          if (!events.length) {
            hasMore = false;
            break;
          }

          console.log(`Events page ${eventPage}: ${events.length} events`);

          const messageUpserts: any[] = [];

          for (const evt of events) {
            const contactId = String(evt.entity_id || '');
            const conv = contactToConv.get(contactId);
            if (!conv) continue; // Event not linked to a pre-sales conversation

            // Extract message text from event
            let messageText = '';
            if (evt.value_after && Array.isArray(evt.value_after)) {
              for (const va of evt.value_after) {
                if (va.message?.text) messageText = va.message.text;
                else if (va.text) messageText = va.text;
                else if (typeof va === 'string') messageText = va;
              }
            }
            // Fallback: try other structures
            if (!messageText && evt.value_after?.message) {
              messageText = evt.value_after.message.text || evt.value_after.message;
            }

            if (!messageText || messageText.length < 1) continue;

            const isOutgoing = evt.type === 'outgoing_chat_message';
            const senderType = isOutgoing ? 'sdr' : 'lead';
            const senderName = isOutgoing
              ? (kommoUserToName[String(evt.created_by)] || 'SDR')
              : 'Lead';

            messageUpserts.push({
              kommo_message_id: String(evt.id),
              conversation_id: conv.id,
              sender_type: senderType,
              sender_name: senderName,
              content: messageText.substring(0, 5000),
              sent_at: evt.created_at ? new Date(evt.created_at * 1000).toISOString() : new Date().toISOString(),
            });
          }

          if (messageUpserts.length > 0) {
            const { error } = await supabase
              .from('kommo_messages')
              .upsert(messageUpserts, { onConflict: 'kommo_message_id' });
            if (error) console.error('Upsert messages error:', error);
            totalMessages += messageUpserts.length;
            console.log(`  Saved ${messageUpserts.length} messages from ${events.length} events`);
          }

          hasMore = events.length >= 100;
          eventPage++;
          pagesProcessed++;
        } catch (evtError: any) {
          console.error('Events fetch error:', evtError.message);
          // Events API might not be available; skip to enrichment
          hasMore = false;
        }
      }

      if (!hasMore) {
        phase = 'enrich';
        eventPage = 1;
        console.log('Events sync complete. Moving to enrichment.');
      }
    }

    // ── PHASE D: Enrich conversations (names, message counts, response times) ──
    if (phase === 'enrich') {
      // Update message counts
      const { data: msgCounts } = await supabase.rpc('exec_sql', { sql: '' }).maybeSingle();
      // Manual approach: get conversations, count messages
      const { data: convsToUpdate } = await supabase
        .from('kommo_conversations')
        .select('id, kommo_id, kommo_contact_id, lead_name')
        .limit(500);

      let enriched = 0;
      for (const conv of (convsToUpdate || [])) {
        // Count messages
        const { count } = await supabase
          .from('kommo_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        const updates: any = { messages_count: count || 0 };

        // Calculate avg response time from messages
        if ((count || 0) > 1) {
          const { data: msgs } = await supabase
            .from('kommo_messages')
            .select('sender_type, sent_at')
            .eq('conversation_id', conv.id)
            .order('sent_at', { ascending: true })
            .limit(100);

          if (msgs && msgs.length > 1) {
            let totalResponseTime = 0;
            let responseCount = 0;
            for (let i = 1; i < msgs.length; i++) {
              if (msgs[i].sender_type === 'sdr' && msgs[i - 1].sender_type === 'lead') {
                const diff = (new Date(msgs[i].sent_at).getTime() - new Date(msgs[i - 1].sent_at).getTime()) / 1000;
                if (diff > 0 && diff < 86400) { // < 24h
                  totalResponseTime += diff;
                  responseCount++;
                }
              }
            }
            if (responseCount > 0) {
              updates.avg_response_time_seconds = Math.round(totalResponseTime / responseCount);
            }
          }
        }

        // Enrich contact name if still generic
        if (conv.lead_name?.startsWith('Conversa') && conv.kommo_contact_id) {
          try {
            const contact = await fetchKommo(
              config.subdomain, config.access_token,
              `/api/v4/contacts/${conv.kommo_contact_id}`
            );
            if (contact?.name) {
              updates.lead_name = contact.name;
              let phone: string | null = null;
              const pf = contact.custom_fields_values?.find((f: any) => f.field_code === 'PHONE');
              if (pf?.values?.[0]?.value) phone = pf.values[0].value;
              if (phone) updates.lead_phone = phone;
              const ef = contact.custom_fields_values?.find((f: any) => f.field_code === 'EMAIL');
              if (ef?.values?.[0]?.value) updates.lead_email = ef.values[0].value;
              enriched++;
            }
          } catch (_e) { /* skip */ }

          if (enriched >= 20) break; // Limit API calls per run
        }

        await supabase.from('kommo_conversations').update(updates).eq('id', conv.id);
      }

      // Reset to talks phase for next run
      phase = 'talks';
      talkPage = 1;
      eventPage = 1;
      console.log(`Enrichment done: ${enriched} contacts enriched`);
    }

    // ── Save sync state ──
    await supabase.from('app_settings').upsert({
      setting_key: 'kommo_sync_state',
      setting_value: { phase, talkPage, eventPage },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'setting_key' });

    // Update last sync timestamp
    await supabase.from('kommo_config').update({ last_sync_at: new Date().toISOString() }).eq('id', config.id);

    console.log(`Sync done: phase=${phase}, talks=${totalSynced}, messages=${totalMessages}`);

    return response({
      success: true,
      phase,
      talks_synced: totalSynced,
      messages_synced: totalMessages,
      presales_users: presalesUserIds.length,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return response({ error: error.message }, 500);
  }
});
