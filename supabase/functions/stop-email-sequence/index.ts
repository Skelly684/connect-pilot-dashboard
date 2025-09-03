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
    const { lead_id, reason = "reply" } = await req.json();
    
    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id is required' }),
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

    console.log(`Stopping email sequence for lead ${lead_id} due to: ${reason}`);
    
    // Update lead record to stop email sequence
    const updateData: any = {
      email_sequence_stopped: true,
      next_email_at: null,
      last_email_status: reason,
    };
    
    // Add reply timestamp if the reason is a reply
    if (reason === "reply") {
      updateData.last_email_reply_at = new Date().toISOString();
    }
    
    const { error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', lead_id);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    // Get lead details for logging
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('user_id, campaign_id')
      .eq('id', lead_id)
      .single();

    if (leadError) {
      console.error('Error fetching lead details:', leadError);
      throw leadError;
    }

    // Insert log entry into email_logs
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        lead_id: lead_id,
        campaign_id: lead.campaign_id,
        user_id: lead.user_id,
        subject: "[Sequence Stopped]",
        body: `Email sequence stopped due to ${reason}`,
        status: "sequence_stopped",
        direction: "system",
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.warn('Error logging sequence stop:', logError);
      // Don't fail the whole process for logging errors
    }

    console.log(`Successfully stopped email sequence for lead ${lead_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead_id,
        stopped: true,
        reason: reason,
        message: `Email sequence stopped for lead ${lead_id} due to ${reason}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error stopping email sequence:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to stop email sequence'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})