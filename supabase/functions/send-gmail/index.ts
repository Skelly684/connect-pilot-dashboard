import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  user_id: string;
  to: string;
  subject: string;
  body: string;
  lead_id: string;  // Required for Reply-To tracking
  campaign_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 Gmail send function started');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, to, subject, body, lead_id, campaign_id }: EmailRequest = await req.json();

    if (!user_id || !to || !subject || !body || !lead_id) {
      throw new Error('Missing required fields: user_id, to, subject, body, lead_id');
    }

    // Verify the lead exists and get all lead data for template replacement
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, email_address, first_name, last_name, name, company_name, company, job_title, phone, city_name, state_name, country_name, headline')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', lead_id, leadError);
      throw new Error(`Cannot send email: Lead ${lead_id} does not exist`);
    }

    // Function to replace template variables with lead data
    const replaceTemplateVariables = (text: string): string => {
      let result = text;
      
      // Replace all common lead variables
      const replacements: Record<string, string> = {
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        name: lead.name || lead.first_name || '',
        company_name: lead.company_name || lead.company || '',
        company: lead.company || lead.company_name || '',
        job_title: lead.job_title || '',
        email: lead.email_address || '',
        phone: lead.phone || '',
        city: lead.city_name || '',
        state: lead.state_name || '',
        country: lead.country_name || '',
        headline: lead.headline || ''
      };

      // Replace each variable
      Object.entries(replacements).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(regex, value);
      });

      return result;
    };

    // Replace template variables in subject and body
    const processedSubject = replaceTemplateVariables(subject);
    const processedBody = replaceTemplateVariables(body);

    // Form the Reply-To address with lead tracking
    const replyTo = `scott+${lead_id}@premiersportsnetwork.com`;
    console.log(`📧 Sending email with Reply-To: ${replyTo}`);

    // Get user's Gmail OAuth token
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('access_token, refresh_token, expires_at, client_id, client_secret')
      .eq('user_id', user_id)
      .single();

    if (tokenError || !tokenData) {
      console.error('No Gmail OAuth token found for user:', user_id);
      throw new Error('Gmail not connected. Please connect your Gmail account.');
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    const now = new Date().getTime();
    const expiresAt = new Date(tokenData.expires_at).getTime();
    
    if (now >= expiresAt) {
      console.log('🔄 Refreshing expired token...');
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: tokenData.client_id || Deno.env.get('GOOGLE_CLIENT_ID') || '',
          client_secret: tokenData.client_secret || Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
          refresh_token: tokenData.refresh_token || '',
          grant_type: 'refresh_token'
        })
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Gmail token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update token in database
      await supabase
        .from('google_oauth_tokens')
        .update({
          access_token: refreshData.access_token,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        })
        .eq('user_id', user_id);

      console.log('✅ Token refreshed');
    }

    // Create email in RFC 2822 format with Reply-To tracking using processed subject/body
    const emailContent = [
      `To: ${to}`,
      `Reply-To: ${replyTo}`,
      `Subject: ${processedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      processedBody
    ].join('\r\n');

    // Base64url encode the email
    const encodedEmail = btoa(emailContent)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error('Gmail API error:', errorText);
      throw new Error(`Gmail API error: ${errorText}`);
    }

    const gmailResponse = await sendResponse.json();
    const providerMessageId = gmailResponse.id;
    console.log('✅ Email sent via Gmail, message ID:', providerMessageId);

    // Note: Email logging is handled by mark_email_sent function in email-worker
    // to avoid duplicate logs and ensure proper step tracking

    return new Response(
      JSON.stringify({
        success: true,
        message_id: providerMessageId,
        to,
        subject: processedSubject,
        reply_to: replyTo,
        lead_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Gmail send error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
