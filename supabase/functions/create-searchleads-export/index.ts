import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const SEARCHLEADS_API_BASE = "https://apis.searchleads.co/api";
const SEARCHLEADS_API_KEY = "5823d0aa-0a51-4fbd-9bed-2050e5c08453";

Deno.serve(async (req) => {
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { filter, noOfLeads, fileName } = await req.json()

    console.log('Creating SearchLeads export:', { filter, noOfLeads, fileName })

    // Call SearchLeads API to create export
    const response = await fetch(`${SEARCHLEADS_API_BASE}/export`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${SEARCHLEADS_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        filter,
        noOfLeads,
        fileName,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Export creation failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const logId = data.log_id

    if (!logId) {
      throw new Error("No log_id returned from SearchLeads API")
    }

    console.log('Export created with log_id:', logId)

    // Store in Supabase for tracking
    const { error: dbError } = await supabaseClient
      .from("searchleads_jobs")
      .insert({
        log_id: logId,
        file_name: fileName,
        status: "pending",
        user_id: user.id,
      })

    if (dbError) {
      console.error("Failed to store job in database:", dbError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        log_id: logId,
        message: `Export "${fileName}" created successfully. This will take a few hours to complete.`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error creating export:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create export',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
