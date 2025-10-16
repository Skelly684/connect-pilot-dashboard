import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SEARCHLEADS_API_BASE = "https://apis.searchleads.co/api";
const SEARCHLEADS_API_KEY = "5823d0aa-0a51-4fbd-9bed-2050e5c08453";

interface ExportJob {
  log_id: string;
  file_name: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
  user_id: string;
  no_of_leads?: number;
  result_data?: any;
  csv_url?: string;
}

export const useSearchLeadsExport = () => {
  const [pendingExports, setPendingExports] = useState<ExportJob[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const { toast } = useToast();

  // Create export directly with SearchLeads API
  const createExport = async (filter: any, noOfLeads: number, fileName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const response = await fetch(`${SEARCHLEADS_API_BASE}/export`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${SEARCHLEADS_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          filter,
          noOfLeads,
          fileName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export creation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const logId = data.log_id;

      if (!logId) {
        throw new Error("No log_id returned from SearchLeads API");
      }

      // Store in Supabase for tracking
      const { error: dbError } = await supabase
        .from("searchleads_jobs")
        .insert({
          log_id: logId,
          file_name: fileName,
          status: "pending",
          user_id: user.id,
          no_of_leads: noOfLeads,
        });

      if (dbError) {
        console.error("Failed to store job in database:", dbError);
      }

      toast({
        title: "Export Started",
        description: `Export "${fileName}" queued. Log ID: ${logId}`,
      });

      // Start polling immediately
      pollExportStatus(logId);

      return logId;
    } catch (error) {
      console.error("Create export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to create export",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Check status and get export data
  const getExportData = async (logId: string) => {
    try {
      const response = await fetch(`${SEARCHLEADS_API_BASE}/export/${logId}`, {
        headers: {
          "authorization": `Bearer ${SEARCHLEADS_API_KEY}`,
        },
      });

      if (!response.ok) {
        console.error(`Export fetch failed: ${response.status}`);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Export fetch failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get export data error:", error);
      throw error;
    }
  };

  // Legacy method kept for compatibility
  const checkExportStatus = async (logId: string) => {
    try {
      const data = await getExportData(logId);
      return data.log?.status || data.status || "pending";
    } catch (error) {
      console.error("Check status error:", error);
      return "failed";
    }
  };

  // Legacy method kept for compatibility
  const retrieveExportResult = async (logId: string, outputFormat: "json" | "csv" = "json") => {
    return await getExportData(logId);
  };

  // Poll a specific export until complete
  const pollExportStatus = useCallback(async (logId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.log(`Polling timeout for ${logId}`);
        return;
      }

      attempts++;
      const status = await checkExportStatus(logId);

      if (status === "completed") {
        // Retrieve results
        try {
          const jsonResult = await retrieveExportResult(logId, "json");
          const csvResult = await retrieveExportResult(logId, "csv");

          // Update database with results
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("searchleads_jobs")
              .update({
                status: "completed",
                result_data: jsonResult,
                csv_url: csvResult.url || null,
              })
              .eq("log_id", logId)
              .eq("user_id", user.id);
          }

          toast({
            title: "Export Complete",
            description: `Export ${logId} is ready to download!`,
          });
        } catch (error) {
          console.error("Failed to retrieve results:", error);
        }
      } else if (status === "failed") {
        // Update database with failed status
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("searchleads_jobs")
            .update({ status: "failed" })
            .eq("log_id", logId)
            .eq("user_id", user.id);
        }

        toast({
          title: "Export Failed",
          description: `Export ${logId} failed to complete.`,
          variant: "destructive",
        });
      } else {
        // Still pending, check again
        setTimeout(poll, 5000); // Check every 5 seconds
      }
    };

    poll();
  }, [toast]);

  // Fetch all pending exports and poll them
  const fetchAndPollPendingExports = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: jobs } = await supabase
        .from("searchleads_jobs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (jobs && jobs.length > 0) {
        setPendingExports(jobs as ExportJob[]);
        
        // Poll each pending job
        jobs.forEach((job) => {
          pollExportStatus(job.log_id);
        });
      }
    } catch (error) {
      console.error("Failed to fetch pending exports:", error);
    }
  }, [pollExportStatus]);

  // Retrieve results for a completed export by log_id using edge function
  const retrieveCompletedExport = async (logId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      toast({
        title: "Retrieving Results",
        description: `Fetching data for export ${logId}...`,
      });

      // Call edge function to retrieve export (it will try multiple endpoints)
      const { data, error } = await supabase.functions.invoke('retrieve-searchleads-export', {
        body: { logId }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to retrieve export");
      }

      console.log("Edge function response:", data);

      if (!data.success) {
        throw new Error(data.error || "Failed to retrieve export");
      }

      // Show appropriate message based on results
      if (data.has_results && data.csv_url) {
        toast({
          title: "Export Retrieved! ✅",
          description: `Export ${logId} is ready. Check "Lead Export Files" tab to download.`,
          duration: 7000,
        });
      } else {
        toast({
          title: `Export Status: ${data.status}`,
          description: data.error || "Export retrieved but no download URL available yet. It may still be processing.",
          variant: data.status === "failed" ? "destructive" : "default",
          duration: 7000,
        });
      }
    } catch (error) {
      console.error("Retrieve completed export error:", error);
      toast({
        title: "Retrieval Failed",
        description: error instanceof Error ? error.message : "Failed to retrieve export. The SearchLeads API endpoint may have changed.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Poll for existing log_id (for CEO_UK case)
  const pollExistingExport = async (logId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if already in database
      const { data: existing } = await supabase
        .from("searchleads_jobs")
        .select("*")
        .eq("log_id", logId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        // Add to database
        await supabase.from("searchleads_jobs").insert({
          log_id: logId,
          file_name: "Retrieved Export",
          status: "pending",
          user_id: user.id,
        });
      }

      // Start polling
      await pollExportStatus(logId);

      toast({
        title: "Polling Started",
        description: `Checking status of export ${logId}`,
      });
    } catch (error) {
      console.error("Poll existing export error:", error);
      toast({
        title: "Polling Failed",
        description: error instanceof Error ? error.message : "Failed to poll export",
        variant: "destructive",
      });
    }
  };

  // Auto-poll on mount
  useEffect(() => {
    fetchAndPollPendingExports();
    
    // Set up periodic check for new pending exports
    const interval = setInterval(fetchAndPollPendingExports, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchAndPollPendingExports]);

  return {
    createExport,
    checkExportStatus,
    retrieveExportResult,
    pollExportStatus,
    pollExistingExport,
    retrieveCompletedExport,
    pendingExports,
    isPolling,
  };
};
