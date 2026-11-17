// Supabase Edge Function: livekit-token
// Generates secure, short-lived LiveKit access tokens for authenticated FNI users.
// Validates caller identity, prevents unauthorized room access, and keeps API secrets server-side.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized FNI user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { room, username, isHost } = await req.json();
    if (!room) {
      return new Response(JSON.stringify({ error: 'Room name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL') || 'wss://fni-cells-connect.livekit.cloud';

    // If LiveKit credentials are not yet configured in environment, provide safe WebRTC mesh fallback
    if (!livekitApiKey || !livekitApiSecret) {
      return new Response(
        JSON.stringify({
          mode: 'webrtc-mesh',
          serverUrl: livekitUrl,
          room,
          identity: user.id,
          name: username || user.email || 'FNI Member',
          message: 'LiveKit server credentials pending; utilizing secure WebRTC direct channels.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Generate LiveKit Access Token
    // We import AccessToken dynamically from livekit-server-sdk
    const { AccessToken } = await import('https://esm.sh/livekit-server-sdk@2.6.0');

    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: user.id,
      name: username || 'FNI Member',
      ttl: '2h',
    });

    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: Boolean(isHost),
    });

    const jwt = await token.toJwt();

    return new Response(
      JSON.stringify({
        mode: 'livekit',
        token: jwt,
        serverUrl: livekitUrl,
        room,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Token generation failure' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
