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
    const { user_id, limit = 50 } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
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

    console.log(`Fetching due email steps for user ${user_id}`);
    
    // Get leads that are due for email and have NOT stopped their sequence
    const { data: dueLeads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        user_id,
        campaign_id,
        next_email_at,
        next_email_step,
        email_sequence_stopped,
        email,
        first_name,
        last_name,
        company
      `)
      .eq('user_id', user_id)
      .eq('email_sequence_stopped', false)  // CRITICAL: Skip stopped sequences
      .not('next_email_at', 'is', null)
      .lte('next_email_at', new Date().toISOString())
      .limit(limit)
      .order('next_email_at', { ascending: true });

    if (leadsError) {
      console.error('Error fetching due leads:', leadsError);
      throw leadsError;
    }

    console.log(`Found ${dueLeads?.length || 0} leads due for emails (excluding stopped sequences)`);

    // Get campaign email steps for these leads
    const campaignIds = [...new Set(dueLeads?.map(lead => lead.campaign_id).filter(Boolean) || [])];
    let emailSteps = [];
    
    if (campaignIds.length > 0) {
      const { data: steps, error: stepsError } = await supabase
        .from('campaign_email_steps')
        .select(`
          id,
          campaign_id,
          step_number,
          template_id,
          send_offset_minutes,
          is_active,
          email_templates:template_id (
            id,
            subject,
            body,
            name
          )
        `)
        .in('campaign_id', campaignIds)
        .eq('is_active', true)
        .order('step_number', { ascending: true });

      if (stepsError) {
        console.warn('Error fetching email steps:', stepsError);
      } else {
        emailSteps = steps || [];
      }
    }

    // Match leads with their corresponding email steps
    const dueEmailTasks = dueLeads?.map(lead => {
      const campaignSteps = emailSteps.filter(step => step.campaign_id === lead.campaign_id);
      const currentStep = campaignSteps.find(step => step.step_number === lead.next_email_step);
      
      return {
        lead,
        step: currentStep,
        template: currentStep?.email_templates
      };
    }).filter(task => task.step && task.template) || [];

    console.log(`Prepared ${dueEmailTasks.length} email tasks for processing`);

    return new Response(
      JSON.stringify({
        success: true,
        due_emails: dueEmailTasks,
        total_count: dueEmailTasks.length,
        processed_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error fetching due email steps:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch due email steps'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})