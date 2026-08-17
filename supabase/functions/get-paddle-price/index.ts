import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { priceId, environment } = await req.json();

    if (typeof priceId !== 'string' || priceId.length === 0 || priceId.length > 128) {
      return new Response(JSON.stringify({ error: 'Invalid priceId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const env: PaddleEnv = environment === 'live' ? 'live' : 'sandbox';

    const response = await gatewayFetch(
      env,
      `/prices?external_id=${encodeURIComponent(priceId)}&status=active`,
    );
    if (!response.ok) {
      const details = await response.text();
      console.error(`Paddle price lookup failed [${response.status}]: ${details}`);
      return new Response(JSON.stringify({ error: 'Price lookup failed', status: response.status, details }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const active = (data?.data ?? []).filter((p: { status?: string }) => p?.status === 'active');
    const paddleId = active[0]?.id;
    if (!paddleId) {
      console.error(`No active Paddle price for external_id "${priceId}" in ${env}`);
      return new Response(JSON.stringify({ error: 'Price not found or inactive', priceId, environment: env }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    return new Response(JSON.stringify({ paddleId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('get-paddle-price error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
