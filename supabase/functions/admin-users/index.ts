import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create regular client for user verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? ''
          }
        }
      }
    )

    const userIdHeader = req.headers.get('x-user-id')
    if (!userIdHeader) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if requesting user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', userIdHeader)
      .single()

    console.log('Admin check for user:', userIdHeader, 'Profile:', profile, 'Error:', profileError)

    if (profileError || !profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'GET') {
      // Get all users
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, created_at, is_admin, is_blocked')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching profiles:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(profiles), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      const { email, password, name, is_admin } = await req.json()

      console.log('Creating user with email:', email)

      // Use admin createUser to bypass signup restrictions
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email since it's admin created
        user_metadata: { name }
      })

      if (authError) {
        console.error('Auth error:', authError)
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!authUser.user) {
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Auth user created:', authUser.user.id)

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email,
          is_admin: is_admin || false
        })

      if (profileError) {
        console.error('Profile error:', profileError)
        // If profile creation fails, delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('Profile created successfully')

      return new Response(JSON.stringify({ 
        success: true, 
        user: { 
          id: authUser.user.id, 
          email: authUser.user.email 
        } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'DELETE') {
      const { userId } = await req.json()

      console.log('Deleting user:', userId)

      // Delete user from auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (authError) {
        console.error('Auth delete error:', authError)
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('User deleted successfully')

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'PATCH') {
      const { userId, action, newPassword, isBlocked } = await req.json()

      if (action === 'reset_password') {
        console.log('Resetting password for user:', userId)

        // Update user password
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword
        })

        if (authError) {
          console.error('Password reset error:', authError)
          return new Response(JSON.stringify({ error: authError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('Password reset successfully')

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'toggle_blocked') {
        console.log('Toggling blocked status for user:', userId, 'to:', isBlocked)

        // Update user blocked status
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ is_blocked: isBlocked })
          .eq('id', userId)

        if (profileError) {
          console.error('Toggle blocked error:', profileError)
          return new Response(JSON.stringify({ error: profileError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        console.log('Blocked status toggled successfully')

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})