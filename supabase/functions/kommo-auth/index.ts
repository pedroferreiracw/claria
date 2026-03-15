import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, integration_id, secret_key, auth_code } = await req.json();

    if (!subdomain || !integration_id || !secret_key || !auth_code) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios: subdomain, integration_id, secret_key, auth_code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange authorization code for access_token and refresh_token
    const tokenResponse = await fetch(`https://${subdomain}.kommo.com/oauth2/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: integration_id,
        client_secret: secret_key,
        grant_type: 'authorization_code',
        code: auth_code,
        redirect_uri: `https://${subdomain}.kommo.com`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Kommo OAuth error:', tokenResponse.status, errorText);
      
      let errorMessage = 'Falha ao trocar o código de autorização por tokens.';
      if (tokenResponse.status === 400) {
        errorMessage = 'Código de autorização inválido ou expirado. Gere um novo código na Kommo e tente novamente.';
      } else if (tokenResponse.status === 401) {
        errorMessage = 'ID de integração ou chave secreta incorretos. Verifique os dados e tente novamente.';
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens = await tokenResponse.json();

    return new Response(
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in || 86400,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('kommo-auth error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno ao autenticar com a Kommo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
