import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      console.error('User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Acesso restrito a administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Pipedrive config
    const { data: config, error: configError } = await supabase
      .from('pipedrive_config')
      .select('*')
      .single();

    if (configError || !config) {
      console.error('Config error:', configError);
      return new Response(
        JSON.stringify({ error: 'Pipedrive não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.api_token || !config.domain) {
      return new Response(
        JSON.stringify({ error: 'Credenciais do Pipedrive incompletas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize domain - extract subdomain if full URL was provided
    let cleanDomain = config.domain.trim().toLowerCase();
    
    // Remove protocol if present
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
    // Remove .pipedrive.com suffix if present
    cleanDomain = cleanDomain.replace(/\.pipedrive\.com\/?.*$/, '');
    // Remove any trailing slashes or paths
    cleanDomain = cleanDomain.split('/')[0];
    
    // Validate domain format (alphanumeric and hyphens only, no leading/trailing hyphens)
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
    if (!domainRegex.test(cleanDomain) || cleanDomain.length === 0) {
      console.error('Invalid domain format:', cleanDomain);
      return new Response(
        JSON.stringify({ error: 'Formato de domínio inválido. Use apenas o subdomínio (ex: suaempresa)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching deals from Pipedrive for domain:', cleanDomain);

    // Fetch deals from Pipedrive using API token in header instead of URL
    const pipedriveUrl = `https://${cleanDomain}.pipedrive.com/api/v1/deals?limit=100`;
    const pipedriveResponse = await fetch(pipedriveUrl, {
      headers: {
        'x-api-token': config.api_token,
      },
    });
    
    if (!pipedriveResponse.ok) {
      const errorText = await pipedriveResponse.text();
      console.error('Pipedrive API error:', pipedriveResponse.status);
      return new Response(
        JSON.stringify({ error: 'Erro ao conectar com Pipedrive' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pipedriveData = await pipedriveResponse.json();
    
    if (!pipedriveData.success) {
      console.error('Pipedrive error:', pipedriveData.error);
      return new Response(
        JSON.stringify({ error: pipedriveData.error || 'Erro do Pipedrive' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deals = pipedriveData.data || [];
    console.log(`Found ${deals.length} deals`);

    // Get SDRs to try to match by name
    const { data: sdrs } = await supabase.from('sdrs').select('id, name');
    const sdrMap = new Map(sdrs?.map(s => [s.name.toLowerCase(), s.id]) || []);

    // Upsert deals
    const dealsToUpsert = deals.map((deal: any) => {
      // Try to match SDR by owner name
      const ownerName = deal.owner_name?.toLowerCase() || '';
      const sdrId = sdrMap.get(ownerName) || null;

      return {
        pipedrive_id: deal.id,
        title: deal.title,
        value: deal.value || 0,
        currency: deal.currency || 'BRL',
        status: deal.status,
        stage_name: deal.stage?.name || null,
        won_time: deal.won_time || null,
        lost_time: deal.lost_time || null,
        sdr_id: sdrId,
        synced_at: new Date().toISOString(),
      };
    });

    if (dealsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('pipedrive_deals')
        .upsert(dealsToUpsert, { onConflict: 'pipedrive_id' });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao salvar deals' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update last sync time
    await supabase
      .from('pipedrive_config')
      .update({ 
        last_sync_at: new Date().toISOString(),
        is_connected: true 
      })
      .eq('id', config.id);

    console.log('Sync completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: dealsToUpsert.length,
        message: `${dealsToUpsert.length} negócios sincronizados` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
