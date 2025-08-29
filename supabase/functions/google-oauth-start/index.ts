import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
}

interface OAuthState {
  user_id: string;
  return_path?: string;
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, length)
}

async function generatePKCE() {
  const codeVerifier = generateRandomString(128)
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  return { codeVerifier, codeChallenge }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const userId = req.headers.get('x-user-id')
    const returnPath = url.searchParams.get('return') || '/calendar'
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing x-user-id header' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { codeVerifier, codeChallenge } = await generatePKCE()
    const state = btoa(JSON.stringify({ user_id: userId, return_path: returnPath }))

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`
    
    if (!googleClientId) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'openid',
      'email',
      'profile'
    ].join(' ')

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(googleClientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${encodeURIComponent(state)}&` +
      `code_challenge=${encodeURIComponent(codeChallenge)}&` +
      `code_challenge_method=S256&` +
      `access_type=offline&` +
      `include_granted_scopes=true&` +
      `prompt=consent`

    // Store PKCE verifier temporarily (you might want to use a more robust storage)
    // For now, we'll include it in the state (not recommended for production)
    const stateWithVerifier = btoa(JSON.stringify({ 
      user_id: userId, 
      return_path: returnPath,
      code_verifier: codeVerifier 
    }))

    const finalAuthUrl = authUrl.replace(
      `state=${encodeURIComponent(state)}`,
      `state=${encodeURIComponent(stateWithVerifier)}`
    )

    return new Response(
      JSON.stringify({ auth_url: finalAuthUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('OAuth start error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})