import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, testPhone = "+1234567890" } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign error:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Simulate test call (replace with actual VAPI integration)
    console.log('Test call would be made:', {
      to: testPhone,
      prompt: campaign.caller_prompt,
      campaign: campaign.name
    });

    // Log the test call
    await supabase.from('call_logs').insert({
      lead_id: null, // Test call doesn't have a lead
      call_status: 'test_call',
      call_duration: 0,
      notes: `Test call for campaign: ${campaign.name}`
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test call initiated successfully',
        campaign: {
          name: campaign.name,
          prompt: campaign.caller_prompt.substring(0, 100) + '...'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-call function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});