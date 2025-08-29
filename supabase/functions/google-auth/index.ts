import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-auth/callback`

function isUUID(s: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(s)
}

function getRequestUserId(request: Request): string | null {
  // Try to get user ID from authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // This would need JWT parsing in a real implementation
    // For now, return null to use fallback
  }
  
  // Try to get from query params
  const url = new URL(request.url)
  const userIdParam = url.searchParams.get('user_id')
  if (userIdParam && isUUID(userIdParam)) {
    return userIdParam
  }
  
  return null
}

async function upsertGoogleTokens(userId: string, credentials: any) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { error } = await supabase
    .from('google_tokens')
    .upsert({
      user_id: userId,
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      token_uri: credentials.token_uri || 'https://oauth2.googleapis.com/token',
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      scopes: credentials.scope ? credentials.scope.split(' ') : [],
      expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null
    })

  if (error) {
    console.error('Error upserting Google tokens:', error)
    throw error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathname = url.pathname

    // Handle OAuth start
    if (pathname.includes('/start')) {
      const state = url.searchParams.get('state') || 'anonymous'
      
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Google OAuth not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const scopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' ')

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', scopes)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')

      return Response.redirect(authUrl.toString())
    }

    // Handle OAuth callback
    if (pathname.includes('/callback')) {
      const error = url.searchParams.get('error')
      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state') || ''

      // Try to get user id from state ("uid:<uuid>"), else from header/query, else fallback
      let userId: string | null = null
      
      if (state.startsWith('uid:')) {
        const candidate = state.slice(4)
        if (isUUID(candidate)) {
          userId = candidate
        }
      }

      if (!userId) {
        const candidate = getRequestUserId(req)
        if (candidate && isUUID(candidate)) {
          userId = candidate
        }
      }

      // If still no valid UUID, we can't proceed
      if (!userId || !isUUID(userId)) {
        const html = `
          <script>window.close();</script>
          <p>Error: No valid user ID to store tokens. Please try again.</p>
        `
        return new Response(html, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        })
      }

      if (!code) {
        const html = `
          <script>window.close();</script>
          <p>Error: No authorization code received.</p>
        `
        return new Response(html, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        })
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: GOOGLE_REDIRECT_URI,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Token exchange failed:', errorText)
        const html = `
          <script>window.close();</script>
          <p>Error: Failed to exchange authorization code for tokens.</p>
        `
        return new Response(html, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        })
      }

      const tokens = await tokenResponse.json()
      
      // Store tokens in database
      await upsertGoogleTokens(userId, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_uri: 'https://oauth2.googleapis.com/token',
        scope: tokens.scope,
        expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
      })

      const html = `
        <script>window.close();</script>
        <p>Google Calendar connected successfully! You may close this tab.</p>
      `
      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      })
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Google auth error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})