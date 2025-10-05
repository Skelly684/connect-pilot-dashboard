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
    const { batch_size = 10 } = await req.json().catch(() => ({}));
    
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Starting email queue processing (batch size: ${batch_size})`);
    
    // Step 1: Claim emails from the queue atomically
    const { data: claimedEmails, error: claimError } = await supabase
      .rpc('claim_next_email', { p_limit: batch_size });

    if (claimError) {
      console.error('Error claiming emails:', claimError);
      throw claimError;
    }

    if (!claimedEmails || claimedEmails.length === 0) {
      console.log('No emails in queue to process');
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No emails to process'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Claimed ${claimedEmails.length} emails for processing`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Step 2: Process each claimed email
    for (const email of claimedEmails) {
      try {
        console.log(`Processing email ${email.id} for lead ${email.lead_id} (step ${email.step_number})`);

        // TODO: Replace this with actual Gmail API sending
        // For now, we'll simulate sending and mark as sent
        const emailSent = await sendEmailViaProvider(email);

        if (emailSent) {
          // Step 3: Mark email as sent (this also logs and removes from outbox)
          const { data: marked, error: markError } = await supabase
            .rpc('mark_email_sent', {
              p_outbox_id: email.id,
              p_lock_token: email.lock_token,
              p_provider_message_id: emailSent.messageId || null
            });

          if (markError) {
            console.error(`Failed to mark email ${email.id} as sent:`, markError);
            results.errors.push({
              email_id: email.id,
              error: markError.message,
              stage: 'marking_sent'
            });
            results.failed++;
          } else if (marked) {
            console.log(`Successfully sent and logged email ${email.id}`);
            
            // Step 4: Update lead to schedule next email (if part of sequence)
            if (email.step_number && email.campaign_id) {
              await scheduleNextEmailForLead(supabase, email);
            }
            
            results.sent++;
          } else {
            console.warn(`Email ${email.id} not marked (possibly lock mismatch)`);
            results.failed++;
          }
        } else {
          console.error(`Failed to send email ${email.id}`);
          results.failed++;
          
          // Update outbox with error and release lock
          await supabase
            .from('email_outbox')
            .update({
              status: 'queued',
              lock_token: null,
              last_error: 'Email sending failed',
              attempts: email.attempts + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id);
        }
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        results.errors.push({
          email_id: email.id,
          error: error.message,
          stage: 'processing'
        });
        results.failed++;
        
        // Release lock on error
        await supabase
          .from('email_outbox')
          .update({
            status: 'queued',
            lock_token: null,
            last_error: error.message,
            attempts: email.attempts + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id)
          .eq('lock_token', email.lock_token);
      }
    }

    console.log(`Email processing complete: ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: claimedEmails.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in email queue processor:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process email queue'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to send email via provider (Gmail API, SMTP, etc.)
async function sendEmailViaProvider(email: any): Promise<{ messageId?: string } | null> {
  // TODO: Implement actual email sending via Gmail API or other provider
  // This would use the google_oauth_tokens table to get access token
  // and then call the Gmail API to send the email
  
  console.log('SIMULATED SEND:', {
    to: email.to_email,
    subject: email.subject,
    body_length: email.body?.length || 0
  });
  
  // Simulate successful send
  return { messageId: `sim_${Date.now()}` };
}

// Helper function to schedule next email in sequence
async function scheduleNextEmailForLead(supabase: any, email: any) {
  try {
    // Get the next email step for this campaign
    const { data: nextStep, error: stepError } = await supabase
      .from('campaign_email_steps')
      .select('step_number, send_offset_minutes, template_id, email_templates(subject, body)')
      .eq('campaign_id', email.campaign_id)
      .eq('step_number', email.step_number + 1)
      .eq('is_active', true)
      .single();

    if (stepError || !nextStep) {
      console.log(`No next step for campaign ${email.campaign_id} after step ${email.step_number}`);
      // Update lead to indicate sequence is complete
      await supabase
        .from('leads')
        .update({
          next_email_at: null,
          next_email_step: null
        })
        .eq('id', email.lead_id);
      return;
    }

    // Calculate send time based on offset
    const sendAfter = new Date();
    sendAfter.setMinutes(sendAfter.getMinutes() + (nextStep.send_offset_minutes || 1440)); // Default 24 hours

    // Update lead with next email info
    await supabase
      .from('leads')
      .update({
        next_email_at: sendAfter.toISOString(),
        next_email_step: nextStep.step_number
      })
      .eq('id', email.lead_id);

    // Queue the next email
    await supabase.rpc('queue_email_step', {
      p_lead_id: email.lead_id,
      p_campaign_id: email.campaign_id,
      p_step_number: nextStep.step_number,
      p_template_id: nextStep.template_id,
      p_to_email: email.to_email,
      p_subject: nextStep.email_templates.subject,
      p_body: nextStep.email_templates.body,
      p_send_after: sendAfter.toISOString()
    });

    console.log(`Scheduled next email (step ${nextStep.step_number}) for lead ${email.lead_id} at ${sendAfter.toISOString()}`);
  } catch (error) {
    console.error(`Error scheduling next email for lead ${email.lead_id}:`, error);
    // Don't throw - this shouldn't fail the current email send
  }
}
