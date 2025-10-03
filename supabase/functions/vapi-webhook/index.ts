import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VapiWebhookEvent {
  type: string;
  call?: {
    id: string;
    status: string;
    ended_reason?: string;
  };
  transcript?: {
    text: string;
  };
  metadata?: {
    lead_id?: string;
    external_call_id?: string;
  };
}

function extractStatus(evt: VapiWebhookEvent): string {
  if (evt.type === 'call.ended' || evt.call?.status === 'ended') {
    return 'completed';
  }
  if (evt.type === 'call.failed' || evt.call?.status === 'failed') {
    return 'failed';
  }
  if (evt.type === 'call.busy') {
    return 'busy';
  }
  if (evt.type === 'call.no-answer') {
    return 'no-answer';
  }
  return evt.call?.status || 'unknown';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const evt: VapiWebhookEvent = await req.json();
    console.log('VAPI webhook received:', JSON.stringify(evt, null, 2));

    const status = extractStatus(evt);
    const external_call_id = evt.call?.id || evt.metadata?.external_call_id;
    const lead_id = evt.metadata?.lead_id;

    console.log('Extracted:', { status, external_call_id, lead_id });

    if (!external_call_id || !lead_id) {
      console.log('Missing required fields, skipping processing');
      return new Response('OK', { headers: corsHeaders });
    }

    // For completed calls, check for duplicates and update lead status
    if (status === 'completed') {
      // Check for existing completed call log to prevent duplicates
      const { data: existingLog } = await supabase
        .from('call_logs')
        .select('id')
        .eq('lead_id', lead_id)
        .eq('call_status', 'completed')
        .or(`external_call_id.eq.${external_call_id},provider_call_id.eq.${external_call_id}`)
        .single();

      if (existingLog) {
        console.log('Duplicate completed call log found, skipping insert');
        return new Response('OK - Duplicate prevented', { headers: corsHeaders });
      }

      // Insert new call log with clean activity text
      const { error: callLogError } = await supabase
        .from('call_logs')
        .insert({
          lead_id,
          call_status: status,
          external_call_id,
          provider_call_id: external_call_id,
          answered: true,
          notes: 'Call completed',
          created_at: new Date().toISOString(),
        });

      if (callLogError) {
        console.error('Error inserting call log:', callLogError);
        throw callLogError;
      }

      // Update lead status immediately
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          status: 'replied',
          last_call_status: 'completed',
          next_call_at: null,
        })
        .eq('id', lead_id);

      if (leadUpdateError) {
        console.error('Error updating lead status:', leadUpdateError);
        throw leadUpdateError;
      }

      console.log('Successfully processed completed call and updated lead status');
    } else {
      // For other statuses, just insert the call log
      const { error: callLogError } = await supabase
        .from('call_logs')
        .insert({
          lead_id,
          call_status: status,
          external_call_id,
          provider_call_id: external_call_id,
          answered: false,
          notes: `Call ${status}`,
          created_at: new Date().toISOString(),
        });

      if (callLogError) {
        console.error('Error inserting call log:', callLogError);
        throw callLogError;
      }

      console.log(`Successfully processed ${status} call`);
    }

    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('VAPI webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});