import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const SEARCHLEADS_API_BASE = "https://apis.searchleads.co/api";
const SEARCHLEADS_API_KEY = "5823d0aa-0a51-4fbd-9bed-2050e5c08453";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { logId } = await req.json()

    if (!logId) {
      return new Response(JSON.stringify({ error: 'logId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Retrieving SearchLeads export:', logId)

    // Try different endpoint patterns to find the correct one
    const endpointsToTry = [
      `/export/${logId}`,
      `/exports/${logId}`,
      `/log/${logId}`,
      `/logs/${logId}`,
      `/export/${logId}/result`,
      `/export/${logId}/status`,
    ];

    let exportData = null;
    let successfulEndpoint = null;

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Trying endpoint: ${SEARCHLEADS_API_BASE}${endpoint}`);
        
        const response = await fetch(`${SEARCHLEADS_API_BASE}${endpoint}`, {
          method: "GET",
          headers: {
            "authorization": `Bearer ${SEARCHLEADS_API_KEY}`,
            "content-type": "application/json",
          },
        });

        if (response.ok) {
          exportData = await response.json();
          successfulEndpoint = endpoint;
          console.log(`Success with endpoint: ${endpoint}`, exportData);
          break;
        } else {
          const errorText = await response.text();
          console.log(`Failed with ${endpoint}: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.log(`Error trying ${endpoint}:`, error);
      }
    }

    if (!exportData) {
      return new Response(
        JSON.stringify({
          error: 'Could not retrieve export from SearchLeads API. All endpoint patterns failed.',
          tried: endpointsToTry,
          suggestion: 'Please check SearchLeads dashboard or contact SearchLeads support for API documentation.'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Extract relevant data from response
    const csvUrl = exportData.log?.url || exportData.log?.data || exportData.url || exportData.data || exportData.file_csv || exportData.csv_url || null;
    const summary = exportData.summary || exportData.log?.summary || null;
    const status = exportData.log?.status || exportData.status || "unknown";
    const leadsEnriched = exportData.log?.leadsEnriched || null;
    const creditsUsed = exportData.log?.creditsUsed || null;

    console.log('Extracted data:', { csvUrl, status, leadsEnriched, creditsUsed, successfulEndpoint });

    // Update or insert in database
    const { data: existing } = await supabaseClient
      .from("searchleads_jobs")
      .select("*")
      .eq("log_id", logId)
      .eq("user_id", user.id)
      .maybeSingle();

    const dbUpdate = {
      status: status,
      csv_url: csvUrl,
      url: csvUrl,
      summary: summary || (leadsEnriched ? `${leadsEnriched} leads enriched, ${creditsUsed} credits used` : null),
    };

    if (existing) {
      await supabaseClient
        .from("searchleads_jobs")
        .update(dbUpdate)
        .eq("log_id", logId)
        .eq("user_id", user.id);
    } else {
      await supabaseClient
        .from("searchleads_jobs")
        .insert({
          log_id: logId,
          file_name: exportData.fileName || "Retrieved Export",
          user_id: user.id,
          ...dbUpdate,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        log_id: logId,
        endpoint: successfulEndpoint,
        status: status,
        csv_url: csvUrl,
        has_results: !!csvUrl,
        data: exportData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error retrieving export:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to retrieve export',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
