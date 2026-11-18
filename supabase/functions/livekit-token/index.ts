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

    const { room, username } = await req.json();
    if (typeof room !== 'string' || !room.trim()) {
      return new Response(JSON.stringify({ error: 'Room name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, role, cell_id, is_active, is_test_account')
      .eq('supabase_user_id', user.id)
      .maybeSingle();

    if (profileError || !profile || !profile.is_active || profile.is_test_account || !['tutor', 'admin', 'super_admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'An active FNI member profile is required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: session, error: sessionError } = await supabaseClient
      .from('call_sessions')
      .select('id, room_id, caller_id, receiver_id, call_mode, cell_id, status, ended_at')
      .eq('room_id', room.trim())
      .maybeSingle();

    if (sessionError || !session || session.ended_at || !['ringing', 'accepted'].includes(session.status)) {
      return new Response(JSON.stringify({ error: 'This FNI call is not available.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: participation } = await supabaseClient
      .from('call_participants')
      .select('role')
      .eq('session_id', session.id)
      .eq('user_id', profile.id)
      .maybeSingle();

    const isDirectParty = session.caller_id === profile.id || session.receiver_id === profile.id;
    const isCellMember = session.call_mode === 'cell' && Boolean(session.cell_id) && session.cell_id === profile.cell_id;
    const isParticipant = Boolean(participation) || isDirectParty || isCellMember;

    if (!isParticipant) {
      return new Response(JSON.stringify({ error: 'You are not invited to this FNI call.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Never trust a client-supplied host flag. Host privileges come from the
    // persisted call creator or the participant record.
    const isHost = session.caller_id === profile.id || participation?.role === 'host';

    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    // One-to-one calls can use the authenticated Supabase WebRTC signal channel.
    // Group/cell rooms require LiveKit; do not pretend a mesh fallback supports them.
    if (!livekitApiKey || !livekitApiSecret || !livekitUrl) {
      if (session.call_mode !== 'direct') {
        return new Response(JSON.stringify({ error: 'Group and cell calls require LIVEKIT_API_KEY, LIVEKIT_API_SECRET and LIVEKIT_URL secrets.' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        mode: 'webrtc-mesh',
        serverUrl: 'direct-webrtc',
        room,
        identity: user.id,
        name: username || user.email || 'FNI Member',
        message: 'Authenticated direct WebRTC signaling is active.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
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
      roomAdmin: isHost,
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
