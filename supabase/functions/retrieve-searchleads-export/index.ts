import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEARCHLEADS_API_BASE = "https://apis.searchleads.co/api";
const SEARCHLEADS_API_KEY = "5823d0aa-0a51-4fbd-9bed-2050e5c08453";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { logId } = await req.json();
    console.log(`📥 Retrieving export for log_id: ${logId}`);

    const endpoints = [
      `${SEARCHLEADS_API_BASE}/export/${logId}`,
      `${SEARCHLEADS_API_BASE}/exports/${logId}`,
      `${SEARCHLEADS_API_BASE}/export/status/${logId}`,
    ];

    let exportData: any = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: { "authorization": `Bearer ${SEARCHLEADS_API_KEY}` },
        });

        console.log(`📡 Response status: ${response.status}`);
        const responseText = await response.text();
        console.log(`📄 Response body: ${responseText.substring(0, 500)}`);

        if (response.ok) {
          try {
            exportData = JSON.parse(responseText);
            console.log(`✅ Success with endpoint: ${endpoint}`, { status: exportData?.status || exportData?.log?.status });
            break;
          } catch (parseErr) {
            console.error(`❌ JSON parse error:`, parseErr);
          }
        } else {
          console.log(`⚠️ Non-OK response from ${endpoint}: ${response.status}`);
        }
      } catch (err) {
        console.log(`❌ Error with endpoint: ${endpoint}`, err);
      }
    }

    if (!exportData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to retrieve export' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const log = exportData.log || exportData;
    const status = log.status || exportData.status || 'unknown';
    let csvUrl = log.url || exportData.url || exportData.csvUrl;
    const summary = log.summary || exportData.summary;

    if (csvUrl && csvUrl.includes('docs.google.com/spreadsheets')) {
      const spreadsheetId = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (spreadsheetId) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      }
    }

    const { data: existingJob } = await supabase
      .from('searchleads_jobs')
      .select('*')
      .eq('log_id', logId)
      .eq('user_id', user.id)
      .maybeSingle();

    let csvPath: string | null = null;
    let hasResults = false;

    if (csvUrl && status === 'completed') {
      try {
        console.log('📥 Downloading CSV from:', csvUrl);
        const csvResponse = await fetch(csvUrl);
        
        if (csvResponse.ok) {
          const csvBlob = await csvResponse.blob();
          const fileName = existingJob?.file_name || `export_${logId}.csv`;
          csvPath = `${user.id}/${fileName}`;

          console.log('💾 Uploading to storage:', csvPath);

          const { error: uploadError } = await supabase.storage
            .from('exports')
            .upload(csvPath, csvBlob, {
              contentType: 'text/csv',
              upsert: true
            });

          if (uploadError) throw uploadError;
          
          console.log('✅ CSV uploaded successfully');
          hasResults = true;
        }
      } catch (err) {
        console.error('❌ Error downloading/uploading CSV:', err);
      }
    }

    const jobData = {
      log_id: logId,
      user_id: user.id,
      file_name: existingJob?.file_name || `export_${logId}.csv`,
      status: status,
      csv_path: csvPath,
      summary: summary,
      url: csvUrl,
      updated_at: new Date().toISOString(),
    };

    if (existingJob) {
      await supabase
        .from('searchleads_jobs')
        .update(jobData)
        .eq('log_id', logId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('searchleads_jobs')
        .insert(jobData);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        has_results: hasResults,
        csv_url: csvUrl,
        csv_path: csvPath,
        summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
