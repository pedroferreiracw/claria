import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MeetimeLead {
  id: number;
  name: string;
  email: string;
  company?: { name: string };
  phone?: string;
  status: string;
  fitScore?: number;
  fit_score?: number;
  cadence?: { name: string };
  user?: { id: number; email: string; name: string };
}

interface MeetimeProspection {
  id: number;
  lead: { id: number };
  user: { id: number; email: string; name: string };
  status: string;
  startedAt?: string;
  started_at?: string;
  startDate?: string;
  start_date?: string;
  finishedAt?: string;
  finished_at?: string;
}

interface MeetimeActivity {
  id: number;
  prospection?: { id: number };
  user: { id: number; email: string; name: string };
  type: string;
  status: string;
  executionDate?: string;
  execution_date?: string;
  annotation?: string;
  activity_annotation?: string;
  callDurationSeconds?: number;
  call_duration_seconds?: number;
}

interface MeetimeFeedback {
  id: number;
  lead?: { id: number };
  prospection?: { id: number };
  user: { id: number; email: string; name: string };
  result?: string;
  outcome?: string;
  meetingDate?: string;
  meeting_date?: string;
  responseDate?: string;
  response_date?: string;
  notes?: string;
}

// Max items to fetch per entity to avoid worker limits
const MAX_ITEMS_PER_ENTITY = 1000;
const BATCH_SIZE = 100;

async function fetchAllPages(
  baseUrl: string,
  path: string,
  headers: Record<string, string>,
  limit = BATCH_SIZE,
  maxItems = MAX_ITEMS_PER_ENTITY
): Promise<any[]> {
  const allItems: any[] = [];
  let start = 0;
  let hasMore = true;

  while (hasMore && allItems.length < maxItems) {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${baseUrl}${path}${separator}limit=${limit}&start=${start}`;
    console.log(`[sync-meetime] Fetching: ${url}`);

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error(`[sync-meetime] Error fetching ${path}: ${response.status} - ${responseText}`);
        break;
      }

      const data = await response.json();
      const items = data.data || data.items || (Array.isArray(data) ? data : []);
      
      console.log(`[sync-meetime] Got ${items.length} items from ${path} (start=${start})`);

      if (items.length === 0) {
        hasMore = false;
      } else {
        // Only add items up to maxItems limit
        const remaining = maxItems - allItems.length;
        allItems.push(...items.slice(0, remaining));
        start += limit;
        
        if (items.length < limit || allItems.length >= maxItems) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error(`[sync-meetime] Exception fetching ${path}:`, error);
      break;
    }
  }

  console.log(`[sync-meetime] Total items from ${path}: ${allItems.length}${allItems.length >= maxItems ? ' (max limit reached)' : ''}`);
  return allItems;
}

Deno.serve(async (req) => {
  console.log('[sync-meetime] Request received:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[sync-meetime] No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[sync-meetime] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[sync-meetime] User authenticated:', user.id);

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('[sync-meetime] User is not admin');
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Meetime config
    const { data: config, error: configError } = await supabase
      .from('meetime_config')
      .select('*')
      .limit(1)
      .single();

    if (configError || !config?.api_token) {
      console.error('[sync-meetime] No Meetime config found');
      return new Response(JSON.stringify({ error: 'Meetime not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiToken = config.api_token;
    const baseUrl = 'https://api.meetime.com.br/v2';
    const headers = {
      'Authorization': apiToken,
      'Content-Type': 'application/json',
    };

    console.log('[sync-meetime] Starting sync from Meetime API...');

    // Validate token by fetching company info
    try {
      const companyResponse = await fetch(`${baseUrl}/company`, { headers });
      if (!companyResponse.ok) {
        const errorText = await companyResponse.text();
        console.error('[sync-meetime] Token validation failed:', companyResponse.status, errorText);
        return new Response(JSON.stringify({ 
          error: 'Token inválido ou sem permissão',
          details: errorText 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('[sync-meetime] Token validated successfully');
    } catch (error) {
      console.error('[sync-meetime] Error validating token:', error);
    }

    // Get SDRs for mapping
    const { data: sdrs } = await supabase.from('sdrs').select('id, name');
    const sdrMap = new Map(sdrs?.map(s => [s.name.toLowerCase(), s.id]) || []);

    // Helper function to find SDR by name
    const findSdrId = (userName: string | undefined): string | null => {
      if (!userName) return null;
      const normalizedName = userName.toLowerCase();
      for (const [sdrName, sdrId] of sdrMap.entries()) {
        if (normalizedName.includes(sdrName) || sdrName.includes(normalizedName)) {
          return sdrId;
        }
      }
      return null;
    };

    let syncedLeads = 0;
    let syncedProspections = 0;
    let syncedActivities = 0;
    let syncedFeedbacks = 0;
    let errors: string[] = [];

    // Sync Leads
    try {
      console.log('[sync-meetime] Syncing leads...');
      const leads = await fetchAllPages(baseUrl, '/leads', headers);
      
      if (leads.length > 0) {
        const leadsToUpsert = leads.map((lead: MeetimeLead) => ({
          meetime_id: String(lead.id),
          sdr_id: findSdrId(lead.user?.name),
          name: lead.name,
          email: lead.email,
          company: lead.company?.name || null,
          phone: lead.phone || null,
          status: lead.status || 'active',
          fit_score: lead.fitScore ?? lead.fit_score ?? null,
          cadence_name: lead.cadence?.name || null,
          synced_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from('meetime_leads')
          .upsert(leadsToUpsert, { onConflict: 'meetime_id' });

        if (upsertError) {
          console.error('[sync-meetime] Error upserting leads:', upsertError);
          errors.push(`Leads: ${upsertError.message}`);
        } else {
          syncedLeads = leads.length;
        }
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing leads:', error);
      errors.push(`Leads: ${String(error)}`);
    }

    // Sync Prospections
    try {
      console.log('[sync-meetime] Syncing prospections...');
      const prospections = await fetchAllPages(baseUrl, '/prospections', headers);
      
      if (prospections.length > 0) {
        // Get lead IDs mapping
        const { data: existingLeads } = await supabase
          .from('meetime_leads')
          .select('id, meetime_id');
        const leadIdMap = new Map(existingLeads?.map(l => [l.meetime_id, l.id]) || []);

        const prospectionsToUpsert = prospections.map((p: MeetimeProspection) => ({
          meetime_id: String(p.id),
          lead_id: leadIdMap.get(String(p.lead?.id)) || null,
          sdr_id: findSdrId(p.user?.name),
          status: p.status || 'active',
          started_at: p.startedAt ?? p.started_at ?? p.startDate ?? p.start_date ?? null,
          finished_at: p.finishedAt ?? p.finished_at ?? null,
          synced_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from('meetime_prospections')
          .upsert(prospectionsToUpsert, { onConflict: 'meetime_id' });

        if (upsertError) {
          console.error('[sync-meetime] Error upserting prospections:', upsertError);
          errors.push(`Prospections: ${upsertError.message}`);
        } else {
          syncedProspections = prospections.length;
        }
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing prospections:', error);
      errors.push(`Prospections: ${String(error)}`);
    }

    // Sync Activities (correct endpoint: /prospections/activities)
    try {
      console.log('[sync-meetime] Syncing activities...');
      const activities = await fetchAllPages(baseUrl, '/prospections/activities', headers);
      
      if (activities.length > 0) {
        // Get prospection IDs mapping
        const { data: existingProspections } = await supabase
          .from('meetime_prospections')
          .select('id, meetime_id');
        const prospectionIdMap = new Map(existingProspections?.map(p => [p.meetime_id, p.id]) || []);

        const activitiesToUpsert = activities.map((a: MeetimeActivity) => ({
          meetime_id: String(a.id),
          prospection_id: prospectionIdMap.get(String(a.prospection?.id)) || null,
          sdr_id: findSdrId(a.user?.name),
          type: a.type || null,
          status: a.status || null,
          execution_date: a.executionDate ?? a.execution_date ?? null,
          annotation: a.annotation ?? a.activity_annotation ?? null,
          call_duration_seconds: a.callDurationSeconds ?? a.call_duration_seconds ?? null,
          synced_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from('meetime_activities')
          .upsert(activitiesToUpsert, { onConflict: 'meetime_id' });

        if (upsertError) {
          console.error('[sync-meetime] Error upserting activities:', upsertError);
          errors.push(`Activities: ${upsertError.message}`);
        } else {
          syncedActivities = activities.length;
        }
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing activities:', error);
      errors.push(`Activities: ${String(error)}`);
    }

    // Sync Feedbacks (Oportunidades - correct endpoint: /feedbacks)
    try {
      console.log('[sync-meetime] Syncing feedbacks (oportunidades)...');
      const feedbacks = await fetchAllPages(baseUrl, '/feedbacks', headers);
      
      if (feedbacks.length > 0) {
        // Get lead and prospection IDs mapping
        const { data: existingLeads } = await supabase
          .from('meetime_leads')
          .select('id, meetime_id');
        const leadIdMap = new Map(existingLeads?.map(l => [l.meetime_id, l.id]) || []);

        const { data: existingProspections } = await supabase
          .from('meetime_prospections')
          .select('id, meetime_id');
        const prospectionIdMap = new Map(existingProspections?.map(p => [p.meetime_id, p.id]) || []);

        const feedbacksToUpsert = feedbacks.map((f: MeetimeFeedback) => ({
          meetime_id: String(f.id),
          lead_id: leadIdMap.get(String(f.lead?.id)) || null,
          prospection_id: prospectionIdMap.get(String(f.prospection?.id)) || null,
          sdr_id: findSdrId(f.user?.name),
          result: f.result ?? f.outcome ?? null,
          meeting_date: f.meetingDate ?? f.meeting_date ?? null,
          response_date: f.responseDate ?? f.response_date ?? null,
          notes: f.notes || null,
          synced_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from('meetime_deal_feedbacks')
          .upsert(feedbacksToUpsert, { onConflict: 'meetime_id' });

        if (upsertError) {
          console.error('[sync-meetime] Error upserting feedbacks:', upsertError);
          errors.push(`Feedbacks: ${upsertError.message}`);
        } else {
          syncedFeedbacks = feedbacks.length;
        }
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing feedbacks:', error);
      errors.push(`Feedbacks: ${String(error)}`);
    }

    // Update last sync timestamp
    await supabase
      .from('meetime_config')
      .update({ 
        last_sync_at: new Date().toISOString(),
        is_connected: true 
      })
      .eq('id', config.id);

    const totalSynced = syncedLeads + syncedProspections + syncedActivities + syncedFeedbacks;
    const success = totalSynced > 0 || errors.length === 0;

    console.log('[sync-meetime] Sync completed');
    console.log('[sync-meetime] Summary:', { syncedLeads, syncedProspections, syncedActivities, syncedFeedbacks, errors });

    return new Response(
      JSON.stringify({
        success,
        synced: {
          leads: syncedLeads,
          prospections: syncedProspections,
          activities: syncedActivities,
          feedbacks: syncedFeedbacks,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[sync-meetime] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
