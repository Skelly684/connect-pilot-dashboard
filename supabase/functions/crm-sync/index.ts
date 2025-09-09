import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CRMIntegration {
  id: string;
  provider: string;
  api_key_encrypted: string;
  auto_sync: boolean;
  sync_settings: any;
}

interface Lead {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;
  last_reply_snippet?: string;
  last_reply_subject?: string;
}

// Simple encryption/decryption for demo (use proper encryption in production)
function encrypt(text: string): string {
  return btoa(text); // Base64 encode for demo
}

function decrypt(encryptedText: string): string {
  return atob(encryptedText); // Base64 decode for demo
}

async function syncToHubSpot(apiKey: string, lead: Lead) {
  const hubspotEndpoint = 'https://api.hubapi.com/crm/v3/objects/contacts';
  
  const contactData = {
    properties: {
      firstname: lead.first_name || lead.name?.split(' ')[0] || '',
      lastname: lead.last_name || lead.name?.split(' ').slice(1).join(' ') || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      lifecyclestage: 'lead',
      lead_status: lead.status,
      hs_lead_status: lead.status === 'replied' ? 'CONNECTED' : 'NEW'
    }
  };

  const response = await fetch(hubspotEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(contactData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function syncToSalesforce(apiKey: string, lead: Lead) {
  // Note: Salesforce requires OAuth flow in production
  // This is a simplified version for demo
  const salesforceEndpoint = 'https://your-domain.my.salesforce.com/services/data/v57.0/sobjects/Lead/';
  
  const leadData = {
    FirstName: lead.first_name || lead.name?.split(' ')[0] || '',
    LastName: lead.last_name || lead.name?.split(' ').slice(1).join(' ') || 'Unknown',
    Email: lead.email || '',
    Phone: lead.phone || '',
    Company: lead.company || 'Unknown',
    Status: lead.status === 'replied' ? 'Qualified' : 'Open - Not Contacted'
  };

  const response = await fetch(salesforceEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(leadData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function syncToPipedrive(apiKey: string, lead: Lead) {
  const pipedriveEndpoint = `https://api.pipedrive.com/v1/persons?api_token=${apiKey}`;
  
  const personData = {
    name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
    email: [{ value: lead.email || '', primary: true }],
    phone: [{ value: lead.phone || '', primary: true }],
    org_name: lead.company || '',
    label: lead.status === 'replied' ? 'Hot Lead' : 'New Lead'
  };

  const response = await fetch(pipedriveEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(personData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pipedrive API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, integrationId, apiKey, provider, leadIds, testConnection } = await req.json();

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log(`CRM Sync Action: ${action} for user: ${user.id}`);

    switch (action) {
      case 'connect': {
        // Test connection and save integration
        let testResult;
        try {
          if (provider === 'hubspot') {
            // Test HubSpot connection
            const response = await fetch('https://api.hubapi.com/crm/v3/properties/contacts', {
              headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!response.ok) throw new Error('Invalid HubSpot API key');
            testResult = await response.json();
          } else if (provider === 'salesforce') {
            // For demo purposes, we'll assume the key is valid
            testResult = { success: true };
          } else if (provider === 'pipedrive') {
            // Test Pipedrive connection
            const response = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`);
            if (!response.ok) throw new Error('Invalid Pipedrive API key');
            testResult = await response.json();
          }

          // Save integration
          const { data: integration, error } = await supabase
            .from('crm_integrations')
            .upsert({
              user_id: user.id,
              provider,
              api_key_encrypted: encrypt(apiKey),
              is_active: true,
              auto_sync: false
            })
            .select()
            .single();

          if (error) throw error;

          return new Response(
            JSON.stringify({ success: true, integration, testResult }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'sync': {
        // Sync specific leads or all replied leads
        const { data: integration } = await supabase
          .from('crm_integrations')
          .select('*')
          .eq('id', integrationId)
          .eq('user_id', user.id)
          .single();

        if (!integration) {
          throw new Error('Integration not found');
        }

        const apiKey = decrypt(integration.api_key_encrypted);
        let leadsQuery = supabase
          .from('leads')
          .select('*')
          .eq('user_id', user.id);

        if (leadIds && leadIds.length > 0) {
          leadsQuery = leadsQuery.in('id', leadIds);
        } else {
          // Sync only replied leads if no specific leads provided
          leadsQuery = leadsQuery.eq('status', 'replied');
        }

        const { data: leads, error: leadsError } = await leadsQuery;
        if (leadsError) throw leadsError;

        const results = [];
        for (const lead of leads || []) {
          try {
            let syncResult;
            if (integration.provider === 'hubspot') {
              syncResult = await syncToHubSpot(apiKey, lead);
            } else if (integration.provider === 'salesforce') {
              syncResult = await syncToSalesforce(apiKey, lead);
            } else if (integration.provider === 'pipedrive') {
              syncResult = await syncToPipedrive(apiKey, lead);
            }

            // Log successful sync
            await supabase.from('crm_sync_logs').insert({
              integration_id: integration.id,
              lead_id: lead.id,
              sync_type: 'lead_sync',
              status: 'success',
              external_id: syncResult?.id || syncResult?.data?.id
            });

            results.push({ lead_id: lead.id, success: true, external_id: syncResult?.id });
          } catch (error) {
            // Log failed sync
            await supabase.from('crm_sync_logs').insert({
              integration_id: integration.id,
              lead_id: lead.id,
              sync_type: 'lead_sync',
              status: 'failed',
              error_message: error.message
            });

            results.push({ lead_id: lead.id, success: false, error: error.message });
          }
        }

        // Update last sync time
        await supabase
          .from('crm_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id);

        return new Response(
          JSON.stringify({ success: true, results, synced_count: results.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        // Remove integration
        const { error } = await supabase
          .from('crm_integrations')
          .delete()
          .eq('id', integrationId)
          .eq('user_id', user.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle_auto_sync': {
        // Toggle auto sync setting
        const { auto_sync } = await req.json();
        const { error } = await supabase
          .from('crm_integrations')
          .update({ auto_sync })
          .eq('id', integrationId)
          .eq('user_id', user.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('CRM Sync Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});