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
    const { leads, emailTemplateId } = await req.json();
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Processing ${leads.length} leads for contact initiation`);
    
    // Update leads status to 'sent_for_contact' 
    const leadIds = leads.map((lead: any) => lead.id);
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        status: 'sent_for_contact',
        sent_for_contact_at: new Date().toISOString()
      })
      .in('id', leadIds);

    if (updateError) {
      console.error('Error updating lead status:', updateError);
      throw updateError;
    }

    // Log the contact initiation for each lead
    const callLogs = leads.map((lead: any) => ({
      lead_id: lead.id,
      campaign_id: lead.campaign_id,
      status: 'initiated',
      notes: `Contact initiated via ${emailTemplateId ? 'email campaign' : 'manual process'}`,
      created_at: new Date().toISOString()
    }));

    const { error: logError } = await supabase
      .from('call_logs')
      .insert(callLogs);

    if (logError) {
      console.warn('Error logging contact initiation:', logError);
      // Don't fail the whole process for logging errors
    }

    console.log(`Successfully processed ${leads.length} leads for contact`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully initiated contact for ${leads.length} leads`,
        processed_leads: leads.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing leads:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process leads for contact'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
})