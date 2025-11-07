import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apifyToken = Deno.env.get('APIFY_API_TOKEN');

    if (!apifyToken) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { filters, fileName } = await req.json();

    console.log('Received filters from client:', JSON.stringify(filters, null, 2));

    // Call Apify API
    const apifyResponse = await fetch(
      `https://api.apify.com/v2/acts/code_crafter~leads-finder/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      }
    );

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error('Apify API error response:', errorText);
      console.error('Filters that caused error:', JSON.stringify(filters, null, 2));
      throw new Error(`Apify API error ${apifyResponse.status}: ${errorText}`);
    }

    const leads = await apifyResponse.json();
    console.log(`Received ${leads.length} leads from Apify`);

    // Convert leads to CSV with correct field mapping
    const csvHeaders = [
      'email', 'first_name', 'last_name', 'full_name', 'company_name',
      'company_website', 'job_title', 'city', 'state', 'country',
      'linkedin', 'company_phone', 'headline', 'industry',
      'seniority_level', 'functional_level', 'company_size'
    ];

    const csvRows = [csvHeaders.join(',')];
    
    for (const lead of leads) {
      const row = csvHeaders.map(header => {
        const value = lead[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value).replace(/"/g, '""');
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      });
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });

    // Generate unique file path
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-z0-9_-]/gi, '_');
    const filePath = `${user.id}/${timestamp}_${safeFileName}.csv`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(filePath, csvBlob, {
        contentType: 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload CSV: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('exports')
      .getPublicUrl(filePath);

    const csvUrl = urlData.publicUrl;
    const logId = crypto.randomUUID();

    // Store job record
    const { error: insertError } = await supabase
      .from('searchleads_jobs')
      .insert({
        log_id: logId,
        file_name: `${safeFileName}.csv`,
        status: 'completed',
        user_id: user.id,
        csv_path: filePath,
        url: csvUrl,
        summary: {
          total_leads: leads.length,
          source: 'apify',
        },
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to store job record: ${insertError.message}`);
    }

    console.log(`Successfully created job ${logId} with ${leads.length} leads`);

    return new Response(
      JSON.stringify({
        jobId: logId,
        csvUrl,
        leadCount: leads.length,
        csvPath: filePath,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in apify-leads function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
