import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthState {
  user_id: string;
  return_path?: string;
  code_verifier: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      return new Response(`
        <html>
          <body>
            <script>
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage('google_oauth_error:${error}', '*');
                  window.close();
                } else {
                  window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=${error}';
                }
              } catch (e) {
                window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=callback';
              }
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    if (!code || !state) {
      return new Response(`
        <html>
          <body>
            <script>
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage('google_oauth_error:missing_code_or_state', '*');
                  window.close();
                } else {
                  window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=missing_params';
                }
              } catch (e) {
                window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=callback';
              }
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // Decode state
    let oauthState: OAuthState
    try {
      oauthState = JSON.parse(atob(state))
    } catch (e) {
      console.error('Invalid state:', e)
      return new Response(`
        <html>
          <body>
            <script>
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage('google_oauth_error:invalid_state', '*');
                  window.close();
                } else {
                  window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=invalid_state';
                }
              } catch (e) {
                window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=callback';
              }
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        code,
        code_verifier: oauthState.code_verifier,
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return new Response(`
        <html>
          <body>
            <script>
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage('google_oauth_error:token_exchange_failed', '*');
                  window.close();
                } else {
                  window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=token_exchange';
                }
              } catch (e) {
                window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=callback';
              }
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    const tokenData = await tokenResponse.json()
    
    // Create Supabase service client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Calculate expires_at
    const expiresAt = Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600) - 60

    // Upsert tokens
    const { error: dbError } = await supabase
      .from('google_tokens')
      .upsert({
        user_id: oauthState.user_id,
        provider: 'google',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || undefined,
        id_token: tokenData.id_token || undefined,
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || '',
        expires_at: expiresAt,
      }, {
        onConflict: 'user_id,provider',
        ignoreDuplicates: false
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(`
        <html>
          <body>
            <script>
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage('google_oauth_error:Unable to store Google tokens', '*');
                  window.close();
                } else {
                  window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=token_store_failed';
                }
              } catch (e) {
                window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=callback';
              }
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // Success - return HTML that closes popup or redirects
    const returnUrl = oauthState.return_path || '/calendar'
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'
    
    return new Response(`
      <html>
        <body>
          <script>
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage('google_oauth_success', '*');
                window.close();
              } else {
                window.location.href = '${baseUrl}${returnUrl}?gcal=connected';
              }
            } catch (e) {
              window.location.href = '${baseUrl}${returnUrl}?gcal=connected';
            }
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } })

  } catch (error) {
    console.error('OAuth callback error:', error)
    return new Response(`
      <html>
        <body>
          <script>
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage('google_oauth_error:internal_error', '*');
                window.close();
              } else {
                window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=internal';
              }
            } catch (e) {
              window.location.href = '${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.dev') || 'http://localhost:3000'}/calendar?gcal=error=callback';
            }
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } })
  }
})