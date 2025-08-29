import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userId = req.headers.get('x-user-id')
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing x-user-id header' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase service client for reading tokens
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: tokenData, error } = await supabase
      .from('google_tokens')
      .select('expires_at, scope, created_at, updated_at')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ 
          hasRow: false, 
          error: error.message,
          currentTime: Math.floor(Date.now() / 1000)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const isExpired = tokenData.expires_at < currentTime

    return new Response(
      JSON.stringify({
        hasRow: true,
        expires_at: tokenData.expires_at,
        scope: tokenData.scope,
        created_at: tokenData.created_at,
        updated_at: tokenData.updated_at,
        current_time: currentTime,
        is_expired: isExpired,
        expires_in_seconds: tokenData.expires_at - currentTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Diagnostics error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})