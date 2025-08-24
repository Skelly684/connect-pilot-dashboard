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
    const { emailTemplateId, testEmail = "test@example.com" } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', emailTemplateId)
      .single();

    if (templateError || !template) {
      console.error('Template error:', templateError);
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Simulate sending test email (replace with actual email service)
    console.log('Test email would be sent:', {
      to: testEmail,
      subject: template.subject,
      body: template.body,
      from: template.from_name || 'PSN'
    });

    // Log the test email
    await supabase.from('email_logs').insert({
      lead_id: null, // Test email doesn't have a lead
      email_to: testEmail,
      subject: `[TEST] ${template.subject}`,
      body: template.body,
      status: 'test_sent'
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test email sent successfully',
        template: {
          name: template.name,
          subject: template.subject,
          preview: template.body.substring(0, 100) + '...'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});