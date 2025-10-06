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
    console.log('🚀 Email worker started');
    
    // Initialize Supabase client with service role (has full permissions)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Claim emails from the queue using atomic locking
    const { data: claimedEmails, error: claimError } = await supabase.rpc('claim_next_email', {
      p_limit: 10  // Process up to 10 emails per run
    });

    if (claimError) {
      console.error('Error claiming emails:', claimError);
      throw claimError;
    }

    if (!claimedEmails || claimedEmails.length === 0) {
      console.log('✅ No emails due for sending');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No emails to process',
          processed: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`📧 Claimed ${claimedEmails.length} emails for processing`);

    // Step 2: Process each claimed email
    const results = [];
    for (const email of claimedEmails) {
      try {
        console.log(`📧 Processing email ${email.id} to ${email.to_email}`);
        
        // Get user_id for Gmail OAuth
        const { data: leadData } = await supabase
          .from('leads')
          .select('user_id')
          .eq('id', email.lead_id)
          .single();

        if (!leadData?.user_id) {
          console.error(`❌ No user_id found for lead ${email.lead_id}`);
          results.push({ email_id: email.id, status: 'send_failed', error: 'No user_id' });
          continue;
        }

        // Send email via Gmail API edge function
        let sendSuccess = false;
        try {
          const sendResponse = await supabase.functions.invoke('send-gmail', {
            body: {
              user_id: leadData.user_id,
              to: email.to_email,
              subject: email.subject,
              body: email.body,
              lead_id: email.lead_id,
              campaign_id: email.campaign_id
            }
          });

          if (sendResponse.error) {
            console.error(`❌ Gmail send error:`, sendResponse.error);
          } else if (sendResponse.data?.success) {
            sendSuccess = true;
            console.log(`✅ Email sent successfully via Gmail API`);
          } else {
            console.error(`❌ Gmail send failed:`, sendResponse.data);
          }
        } catch (sendError) {
          console.error(`❌ Failed to call send-gmail:`, sendError);
        }

        if (!sendSuccess) {
          // Failed to send, don't mark as sent
          console.error(`Email ${email.id} failed to send`);
          results.push({ email_id: email.id, status: 'send_failed', error: 'Render backend unavailable' });
          continue;
        }
        
        // Step 3: Mark email as sent (this logs to email_logs AND deletes from outbox)
        const { data: markResult, error: markError } = await supabase.rpc('mark_email_sent', {
          p_outbox_id: email.id,
          p_lock_token: email.lock_token,
          p_provider_message_id: `sim_${Date.now()}` // Replace with actual Gmail message ID
        });

        if (markError) {
          console.error(`❌ Failed to mark email ${email.id} as sent:`, markError);
          results.push({ email_id: email.id, status: 'mark_failed', error: markError.message });
          continue;
        }
        
        console.log(`✅ Email ${email.id} logged and removed from outbox`);
        
        // mark_email_sent already handles queuing the next step and updating the lead
        // No need to duplicate that logic here

        results.push({ email_id: email.id, status: 'sent', to: email.to_email });

      } catch (emailError) {
        console.error(`Error processing email ${email.id}:`, emailError);
        results.push({ email_id: email.id, status: 'error', error: emailError.message });
      }
    }

    console.log(`✅ Worker completed. Processed ${results.length} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} emails`,
        processed: results.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Email worker error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Email worker failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
