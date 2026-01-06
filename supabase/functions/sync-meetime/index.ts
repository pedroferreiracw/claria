import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MeetimeLead {
  id: string;
  name: string;
  email: string;
  company?: { name: string };
  phone?: string;
  status: string;
  fitScore?: number;
  cadence?: { name: string };
  user?: { id: string; email: string; name: string };
}

interface MeetimeProspection {
  id: string;
  lead: { id: string };
  user: { id: string; email: string; name: string };
  status: string;
  startedAt: string;
  finishedAt?: string;
}

interface MeetimeActivity {
  id: string;
  prospection: { id: string };
  user: { id: string; email: string; name: string };
  type: string;
  status: string;
  executionDate: string;
  annotation?: string;
  callDurationSeconds?: number;
}

interface MeetimeMeeting {
  id: string;
  lead: { id: string };
  user: { id: string; email: string; name: string };
  scheduledAt: string;
  status: string;
  noShow: boolean;
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

    console.log('[sync-meetime] Fetching data from Meetime API...');

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
    let syncedMeetings = 0;

    // Sync Leads
    try {
      console.log('[sync-meetime] Fetching leads...');
      const leadsResponse = await fetch(`${baseUrl}/leads?limit=500`, { headers });
      
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        const leads = leadsData.data || leadsData || [];
        
        console.log(`[sync-meetime] Found ${leads.length} leads`);
        
        if (leads.length > 0) {
          const leadsToUpsert = leads.map((lead: MeetimeLead) => ({
            meetime_id: String(lead.id),
            sdr_id: findSdrId(lead.user?.name),
            name: lead.name,
            email: lead.email,
            company: lead.company?.name || null,
            phone: lead.phone || null,
            status: lead.status || 'active',
            fit_score: lead.fitScore || null,
            cadence_name: lead.cadence?.name || null,
            synced_at: new Date().toISOString(),
          }));

          const { error: upsertError } = await supabase
            .from('meetime_leads')
            .upsert(leadsToUpsert, { onConflict: 'meetime_id' });

          if (upsertError) {
            console.error('[sync-meetime] Error upserting leads:', upsertError);
          } else {
            syncedLeads = leads.length;
          }
        }
      } else {
        console.error('[sync-meetime] Leads fetch failed:', leadsResponse.status);
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing leads:', error);
    }

    // Sync Prospections
    try {
      console.log('[sync-meetime] Fetching prospections...');
      const prospectionsResponse = await fetch(`${baseUrl}/prospections?limit=500`, { headers });
      
      if (prospectionsResponse.ok) {
        const prospectionsData = await prospectionsResponse.json();
        const prospections = prospectionsData.data || prospectionsData || [];
        
        console.log(`[sync-meetime] Found ${prospections.length} prospections`);
        
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
            started_at: p.startedAt || null,
            finished_at: p.finishedAt || null,
            synced_at: new Date().toISOString(),
          }));

          const { error: upsertError } = await supabase
            .from('meetime_prospections')
            .upsert(prospectionsToUpsert, { onConflict: 'meetime_id' });

          if (upsertError) {
            console.error('[sync-meetime] Error upserting prospections:', upsertError);
          } else {
            syncedProspections = prospections.length;
          }
        }
      } else {
        console.error('[sync-meetime] Prospections fetch failed:', prospectionsResponse.status);
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing prospections:', error);
    }

    // Sync Activities
    try {
      console.log('[sync-meetime] Fetching activities...');
      const activitiesResponse = await fetch(`${baseUrl}/prospection-activities?limit=500`, { headers });
      
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        const activities = activitiesData.data || activitiesData || [];
        
        console.log(`[sync-meetime] Found ${activities.length} activities`);
        
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
            execution_date: a.executionDate || null,
            annotation: a.annotation || null,
            call_duration_seconds: a.callDurationSeconds || null,
            synced_at: new Date().toISOString(),
          }));

          const { error: upsertError } = await supabase
            .from('meetime_activities')
            .upsert(activitiesToUpsert, { onConflict: 'meetime_id' });

          if (upsertError) {
            console.error('[sync-meetime] Error upserting activities:', upsertError);
          } else {
            syncedActivities = activities.length;
          }
        }
      } else {
        console.error('[sync-meetime] Activities fetch failed:', activitiesResponse.status);
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing activities:', error);
    }

    // Sync Meetings (from leads endpoint with meeting data)
    try {
      console.log('[sync-meetime] Fetching meetings...');
      const meetingsResponse = await fetch(`${baseUrl}/meetings?limit=500`, { headers });
      
      if (meetingsResponse.ok) {
        const meetingsData = await meetingsResponse.json();
        const meetings = meetingsData.data || meetingsData || [];
        
        console.log(`[sync-meetime] Found ${meetings.length} meetings`);
        
        if (meetings.length > 0) {
          // Get lead IDs mapping
          const { data: existingLeads } = await supabase
            .from('meetime_leads')
            .select('id, meetime_id');
          const leadIdMap = new Map(existingLeads?.map(l => [l.meetime_id, l.id]) || []);

          const meetingsToUpsert = meetings.map((m: MeetimeMeeting) => ({
            meetime_id: String(m.id),
            lead_id: leadIdMap.get(String(m.lead?.id)) || null,
            sdr_id: findSdrId(m.user?.name),
            scheduled_at: m.scheduledAt || null,
            status: m.status || 'scheduled',
            no_show: m.noShow || false,
            synced_at: new Date().toISOString(),
          }));

          const { error: upsertError } = await supabase
            .from('meetime_meetings')
            .upsert(meetingsToUpsert, { onConflict: 'meetime_id' });

          if (upsertError) {
            console.error('[sync-meetime] Error upserting meetings:', upsertError);
          } else {
            syncedMeetings = meetings.length;
          }
        }
      } else {
        console.error('[sync-meetime] Meetings fetch failed:', meetingsResponse.status);
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing meetings:', error);
    }

    // Update last sync timestamp
    await supabase
      .from('meetime_config')
      .update({ 
        last_sync_at: new Date().toISOString(),
        is_connected: true 
      })
      .eq('id', config.id);

    console.log('[sync-meetime] Sync completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        synced: {
          leads: syncedLeads,
          prospections: syncedProspections,
          activities: syncedActivities,
          meetings: syncedMeetings,
        },
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
