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
    const { 
      lead_id, 
      from_email, 
      subject, 
      body_snippet, 
      reply_type = "gmail_poll" 
    } = await req.json();
    
    if (!lead_id || !from_email) {
      return new Response(
        JSON.stringify({ error: 'lead_id and from_email are required' }),
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

    console.log(`Processing email reply for lead ${lead_id} from ${from_email}`);
    
    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('user_id, campaign_id, email_sequence_stopped')
      .eq('id', lead_id)
      .single();

    if (leadError) {
      console.error('Error fetching lead details:', leadError);
      throw leadError;
    }

    // Update lead status to "replied" and add reply details
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'replied',
        last_reply_from: from_email,
        last_reply_subject: subject || 'No Subject',
        last_reply_snippet: body_snippet || '',
        last_reply_at: new Date().toISOString(),
        last_email_reply_at: new Date().toISOString()
      })
      .eq('id', lead_id);

    if (updateError) {
      console.error('Error updating lead status:', updateError);
      throw updateError;
    }

    // Log the reply in email_logs
    const { error: replyLogError } = await supabase
      .from('email_logs')
      .insert({
        lead_id: lead_id,
        campaign_id: lead.campaign_id,
        user_id: lead.user_id,
        from_email: from_email,
        subject: subject || 'No Subject',
        body: body_snippet || '',
        status: 'received',
        direction: 'inbound',
        notes: `Reply detected via ${reply_type}`,
        created_at: new Date().toISOString()
      });

    if (replyLogError) {
      console.warn('Error logging reply:', replyLogError);
    }

    // Stop email sequence if it's not already stopped
    let sequenceStoppedResult = null;
    if (!lead.email_sequence_stopped) {
      try {
        const stopResponse = await supabase.functions.invoke('stop-email-sequence', {
          body: { lead_id, reason: 'reply' }
        });
        
        if (stopResponse.error) {
          console.warn('Error stopping sequence:', stopResponse.error);
        } else {
          sequenceStoppedResult = stopResponse.data;
          console.log('Email sequence stopped successfully');
        }
      } catch (stopError) {
        console.warn('Error calling stop-email-sequence function:', stopError);
      }
    }

    console.log(`Successfully processed reply for lead ${lead_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead_id,
        reply_processed: true,
        sequence_stopped: sequenceStoppedResult?.stopped || lead.email_sequence_stopped,
        message: `Reply processed for lead ${lead_id}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing email reply:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process email reply'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})