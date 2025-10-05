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
        console.log(`Sending email ${email.id} to ${email.to_email}`);
        
        // TODO: Actually send the email via Gmail API here
        // For now, we'll simulate sending
        // In production, you'd use Google Gmail API with OAuth tokens
        
        // Get user's OAuth token
        const { data: tokenData } = await supabase
          .from('google_oauth_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', email.lead_id) // Assuming user_id stored somewhere
          .single();

        // Simulate successful send for now
        const sendSuccess = true; // Replace with actual Gmail API call
        
        if (sendSuccess) {
          // Step 3: Mark email as sent (this deletes from outbox and logs to email_logs)
          const { data: markResult, error: markError } = await supabase.rpc('mark_email_sent', {
            p_outbox_id: email.id,
            p_lock_token: email.lock_token,
            p_provider_message_id: `sim_${Date.now()}` // Replace with actual Gmail message ID
          });

          if (markError) {
            console.error(`Failed to mark email ${email.id} as sent:`, markError);
            results.push({ email_id: email.id, status: 'mark_failed', error: markError.message });
          } else {
            console.log(`✅ Email ${email.id} sent and logged`);
            
            // Step 4: Update lead's next_email_step and next_email_at
            const { data: leadData } = await supabase
              .from('leads')
              .select('next_email_step, campaign_id')
              .eq('id', email.lead_id)
              .single();

            if (leadData) {
              const nextStep = (leadData.next_email_step || 1) + 1;
              
              // Get the next step's timing
              const { data: nextStepData } = await supabase
                .from('campaign_email_steps')
                .select('send_offset_minutes')
                .eq('campaign_id', leadData.campaign_id)
                .eq('step_number', nextStep)
                .eq('is_active', true)
                .single();

              if (nextStepData) {
                // Calculate next send time
                const nextSendAt = new Date();
                nextSendAt.setMinutes(nextSendAt.getMinutes() + nextStepData.send_offset_minutes);

                await supabase
                  .from('leads')
                  .update({
                    next_email_step: nextStep,
                    next_email_at: nextSendAt.toISOString(),
                    last_email_status: 'sent'
                  })
                  .eq('id', email.lead_id);
                
                console.log(`📅 Scheduled next email (step ${nextStep}) for ${nextSendAt.toISOString()}`);
              } else {
                // No more steps, mark sequence complete
                await supabase
                  .from('leads')
                  .update({
                    next_email_step: null,
                    next_email_at: null,
                    last_email_status: 'sequence_complete'
                  })
                  .eq('id', email.lead_id);
                
                console.log(`🎉 Email sequence completed for lead ${email.lead_id}`);
              }
            }

            results.push({ email_id: email.id, status: 'sent', to: email.to_email });
          }
        } else {
          // Failed to send
          results.push({ email_id: email.id, status: 'send_failed', error: 'Gmail API error' });
        }

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
