import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract lead_id from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const lead_id = pathParts[pathParts.length - 1];
    
    if (!lead_id || lead_id === 'dev-stop-sequence') {
      return new Response(
        JSON.stringify({ error: 'lead_id is required in URL path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`[DEV] Manually stopping email sequence for lead ${lead_id}`);
    
    // Call the stop-email-sequence function
    const { data, error } = await supabase.functions.invoke('stop-email-sequence', {
      body: { lead_id, reason: 'manual' }
    });

    if (error) {
      console.error('Error calling stop-email-sequence function:', error);
      throw error;
    }

    console.log(`[DEV] Successfully stopped sequence for lead ${lead_id}`);

    return new Response(
      JSON.stringify({
        ok: true,
        lead_id: lead_id,
        stopped: true,
        method: 'manual',
        ...data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[DEV] Error stopping email sequence:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Failed to stop email sequence'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})