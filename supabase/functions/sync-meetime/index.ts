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
  cadence?: { name: string };
  user?: { id: number; email: string; name: string };
}

interface MeetimeProspection {
  id: number;
  lead: { id: number };
  user: { id: number; email: string; name: string };
  status: string;
  startedAt: string;
  finishedAt?: string;
}

interface MeetimeActivity {
  id: number;
  prospection?: { id: number };
  user: { id: number; email: string; name: string };
  type: string;
  status: string;
  executionDate: string;
  annotation?: string;
  callDurationSeconds?: number;
}

interface MeetimeDealFeedback {
  id: number;
  lead?: { id: number };
  prospection?: { id: number };
  user: { id: number; email: string; name: string };
  result: string; // 'QUALIFIED', 'UNQUALIFIED', 'NO_CONTACT'
  meetingDate?: string;
  responseDate?: string;
  notes?: string;
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
    let syncedDealFeedbacks = 0;

    // Sync Leads
    try {
      console.log('[sync-meetime] Fetching leads...');
      const leadsUrl = `${baseUrl}/leads?limit=500`;
      console.log('[sync-meetime] Leads URL:', leadsUrl);
      
      const leadsResponse = await fetch(leadsUrl, { headers });
      const leadsResponseText = await leadsResponse.text();
      
      console.log('[sync-meetime] Leads response status:', leadsResponse.status);
      
      if (leadsResponse.ok) {
        const leadsData = JSON.parse(leadsResponseText);
        const leads = leadsData.data || leadsData.items || leadsData || [];
        
        console.log(`[sync-meetime] Found ${Array.isArray(leads) ? leads.length : 0} leads`);
        
        if (Array.isArray(leads) && leads.length > 0) {
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
        console.error('[sync-meetime] Leads fetch failed:', leadsResponse.status, leadsResponseText);
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing leads:', error);
    }

    // Sync Prospections
    try {
      console.log('[sync-meetime] Fetching prospections...');
      const prospectionsUrl = `${baseUrl}/prospections?limit=500`;
      console.log('[sync-meetime] Prospections URL:', prospectionsUrl);
      
      const prospectionsResponse = await fetch(prospectionsUrl, { headers });
      const prospectionsResponseText = await prospectionsResponse.text();
      
      console.log('[sync-meetime] Prospections response status:', prospectionsResponse.status);
      
      if (prospectionsResponse.ok) {
        const prospectionsData = JSON.parse(prospectionsResponseText);
        const prospections = prospectionsData.data || prospectionsData.items || prospectionsData || [];
        
        console.log(`[sync-meetime] Found ${Array.isArray(prospections) ? prospections.length : 0} prospections`);
        
        if (Array.isArray(prospections) && prospections.length > 0) {
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
        console.error('[sync-meetime] Prospections fetch failed:', prospectionsResponse.status, prospectionsResponseText);
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing prospections:', error);
    }

    // Sync Activities (Prospection Activities)
    try {
      console.log('[sync-meetime] Fetching activities...');
      const activitiesUrl = `${baseUrl}/prospection-activities?limit=500`;
      console.log('[sync-meetime] Activities URL:', activitiesUrl);
      
      const activitiesResponse = await fetch(activitiesUrl, { headers });
      const activitiesResponseText = await activitiesResponse.text();
      
      console.log('[sync-meetime] Activities response status:', activitiesResponse.status);
      
      if (activitiesResponse.ok) {
        const activitiesData = JSON.parse(activitiesResponseText);
        const activities = activitiesData.data || activitiesData.items || activitiesData || [];
        
        console.log(`[sync-meetime] Found ${Array.isArray(activities) ? activities.length : 0} activities`);
        
        if (Array.isArray(activities) && activities.length > 0) {
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
        console.error('[sync-meetime] Activities fetch failed:', activitiesResponse.status, activitiesResponseText);
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing activities:', error);
    }

    // Sync Deal Feedbacks (Oportunidades = Agendamentos qualificados)
    try {
      console.log('[sync-meetime] Fetching deal-feedbacks...');
      const dealFeedbacksUrl = `${baseUrl}/deal-feedbacks?limit=500`;
      console.log('[sync-meetime] Deal Feedbacks URL:', dealFeedbacksUrl);
      
      const dealFeedbacksResponse = await fetch(dealFeedbacksUrl, { headers });
      const dealFeedbacksResponseText = await dealFeedbacksResponse.text();
      
      console.log('[sync-meetime] Deal Feedbacks response status:', dealFeedbacksResponse.status);
      
      if (dealFeedbacksResponse.ok) {
        const dealFeedbacksData = JSON.parse(dealFeedbacksResponseText);
        const dealFeedbacks = dealFeedbacksData.data || dealFeedbacksData.items || dealFeedbacksData || [];
        
        console.log(`[sync-meetime] Found ${Array.isArray(dealFeedbacks) ? dealFeedbacks.length : 0} deal feedbacks`);
        
        if (Array.isArray(dealFeedbacks) && dealFeedbacks.length > 0) {
          // Get lead and prospection IDs mapping
          const { data: existingLeads } = await supabase
            .from('meetime_leads')
            .select('id, meetime_id');
          const leadIdMap = new Map(existingLeads?.map(l => [l.meetime_id, l.id]) || []);

          const { data: existingProspections } = await supabase
            .from('meetime_prospections')
            .select('id, meetime_id');
          const prospectionIdMap = new Map(existingProspections?.map(p => [p.meetime_id, p.id]) || []);

          const dealFeedbacksToUpsert = dealFeedbacks.map((df: MeetimeDealFeedback) => ({
            meetime_id: String(df.id),
            lead_id: leadIdMap.get(String(df.lead?.id)) || null,
            prospection_id: prospectionIdMap.get(String(df.prospection?.id)) || null,
            sdr_id: findSdrId(df.user?.name),
            result: df.result || null,
            meeting_date: df.meetingDate || null,
            response_date: df.responseDate || null,
            notes: df.notes || null,
            synced_at: new Date().toISOString(),
          }));

          const { error: upsertError } = await supabase
            .from('meetime_deal_feedbacks')
            .upsert(dealFeedbacksToUpsert, { onConflict: 'meetime_id' });

          if (upsertError) {
            console.error('[sync-meetime] Error upserting deal feedbacks:', upsertError);
          } else {
            syncedDealFeedbacks = dealFeedbacks.length;
          }
        }
      } else {
        console.error('[sync-meetime] Deal Feedbacks fetch failed:', dealFeedbacksResponse.status, dealFeedbacksResponseText);
      }
    } catch (error) {
      console.error('[sync-meetime] Error syncing deal feedbacks:', error);
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
    console.log('[sync-meetime] Summary:', { syncedLeads, syncedProspections, syncedActivities, syncedDealFeedbacks });

    return new Response(
      JSON.stringify({
        success: true,
        synced: {
          leads: syncedLeads,
          prospections: syncedProspections,
          activities: syncedActivities,
          dealFeedbacks: syncedDealFeedbacks,
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
