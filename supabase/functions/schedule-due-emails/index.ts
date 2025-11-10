import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📅 Schedule-due-emails worker started');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find all leads with emails due for sending
    const { data: dueLeads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        user_id,
        campaign_id,
        next_email_at,
        next_email_step,
        email,
        first_name,
        last_name,
        company
      `)
      .eq('email_sequence_stopped', false)
      .not('next_email_at', 'is', null)
      .not('email', 'is', null)
      .lte('next_email_at', new Date().toISOString())
      .limit(100)
      .order('next_email_at', { ascending: true });

    if (leadsError) {
      console.error('❌ Error fetching due leads:', leadsError);
      throw leadsError;
    }

    if (!dueLeads || dueLeads.length === 0) {
      console.log('✅ No emails due for scheduling');
      return new Response(
        JSON.stringify({ success: true, message: 'No emails due', scheduled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📧 Found ${dueLeads.length} leads with due emails`);

    // Get campaign email steps for these leads
    const campaignIds = [...new Set(dueLeads.map(lead => lead.campaign_id).filter(Boolean))];
    let emailSteps = [];
    
    if (campaignIds.length > 0) {
      const { data: steps } = await supabase
        .from('campaign_email_steps')
        .select(`
          campaign_id,
          step_number,
          template_id,
          email_templates:template_id (
            subject,
            body
          )
        `)
        .in('campaign_id', campaignIds)
        .eq('is_active', true);
      
      emailSteps = steps || [];
    }

    const queued = [];
    const errors = [];

    // Queue each due email
    for (const lead of dueLeads) {
      try {
        // Find the matching email step for this lead
        const currentStep = emailSteps.find(
          step => step.campaign_id === lead.campaign_id && 
                  step.step_number === lead.next_email_step
        );

        if (!currentStep?.email_templates) {
          console.warn(`⚠️ No template found for lead ${lead.id}, campaign ${lead.campaign_id}, step ${lead.next_email_step}`);
          // Clear the next_email_at since there's no valid template
          await supabase
            .from('leads')
            .update({ next_email_at: null, next_email_step: null })
            .eq('id', lead.id);
          continue;
        }

        const template = currentStep.email_templates;
        
        // Replace variables in subject and body
        const replaceVars = (text: string) => {
          return text
            .replace(/\{\{first_name\}\}/gi, lead.first_name || '')
            .replace(/\{\{last_name\}\}/gi, lead.last_name || '')
            .replace(/\{\{company\}\}/gi, lead.company || '')
            .replace(/\{\{email\}\}/gi, lead.email || '');
        };

        const subject = replaceVars(template.subject || '');
        const body = replaceVars(template.body || '');

        // Use RPC to queue the email (avoids duplicate inserts)
        const { error: queueError } = await supabase.rpc('queue_email_step', {
          p_lead_id: lead.id,
          p_campaign_id: lead.campaign_id,
          p_step_number: lead.next_email_step,
          p_template_id: currentStep.template_id,
          p_to_email: lead.email,
          p_subject: subject,
          p_body: body,
          p_send_after: new Date().toISOString() // Send immediately since it's already due
        });

        if (queueError) {
          console.error(`❌ Failed to queue email for lead ${lead.id}:`, queueError);
          errors.push({ lead_id: lead.id, error: queueError.message });
        } else {
          console.log(`✅ Queued email for lead ${lead.id} (step ${lead.next_email_step})`);
          queued.push(lead.id);
        }

      } catch (error) {
        console.error(`❌ Error processing lead ${lead.id}:`, error);
        errors.push({ lead_id: lead.id, error: error.message });
      }
    }

    console.log(`✅ Scheduler completed. Queued ${queued.length} emails, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scheduled ${queued.length} emails`,
        scheduled: queued.length,
        errors: errors.length,
        details: { queued, errors }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Schedule-due-emails error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Scheduler failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
