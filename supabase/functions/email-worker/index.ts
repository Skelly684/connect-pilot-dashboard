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
        
        // Send email via Render backend (which handles Gmail API)
        let sendSuccess = false;
        try {
          const renderBackend = 'https://leads-automation-apel.onrender.com/api';
          const sendResponse = await fetch(`${renderBackend}/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': email.user_id || 'system'
            },
            body: JSON.stringify({
              to: email.to_email,
              subject: email.subject,
              body: email.body,
              lead_id: email.lead_id,
              campaign_id: email.campaign_id
            })
          });

          if (sendResponse.ok) {
            sendSuccess = true;
            console.log(`✅ Email sent successfully via Render backend`);
          } else {
            const errorText = await sendResponse.text();
            console.error(`❌ Render backend error:`, errorText);
          }
        } catch (sendError) {
          console.error(`❌ Failed to reach Render backend:`, sendError);
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
        
        // Step 4: Update lead's next_email_step and next_email_at
        const { data: leadData } = await supabase
          .from('leads')
          .select('next_email_step, campaign_id')
          .eq('id', email.lead_id)
          .single();

        if (leadData) {
          const nextStep = (leadData.next_email_step || 1) + 1;
          
          // Get the next step details
          const { data: nextStepData } = await supabase
            .from('campaign_email_steps')
            .select('send_offset_minutes, template_id')
            .eq('campaign_id', leadData.campaign_id)
            .eq('step_number', nextStep)
            .eq('is_active', true)
            .single();

          if (nextStepData && nextStepData.template_id) {
            // Calculate next send time
            const nextSendAt = new Date();
            nextSendAt.setMinutes(nextSendAt.getMinutes() + nextStepData.send_offset_minutes);

            // Get template details for queuing
            const { data: templateData } = await supabase
              .from('email_templates')
              .select('subject, body')
              .eq('id', nextStepData.template_id)
              .single();

            if (templateData) {
              // Queue the next email using the same function as the trigger
              await supabase.rpc('queue_email_step', {
                p_lead_id: email.lead_id,
                p_campaign_id: leadData.campaign_id,
                p_step_number: nextStep,
                p_template_id: nextStepData.template_id,
                p_to_email: email.to_email,
                p_subject: templateData.subject,
                p_body: templateData.body,
                p_send_after: nextSendAt.toISOString()
              });

              // Update lead tracking
              await supabase
                .from('leads')
                .update({
                  next_email_step: nextStep,
                  next_email_at: nextSendAt.toISOString(),
                  last_email_status: 'sent'
                })
                .eq('id', email.lead_id);
              
              console.log(`📅 Queued next email (step ${nextStep}) for ${nextSendAt.toISOString()}`);
            }
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
