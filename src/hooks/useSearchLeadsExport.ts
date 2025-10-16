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

  // Check status of a specific export
  const checkExportStatus = async (logId: string) => {
    try {
      const response = await fetch(`${SEARCHLEADS_API_BASE}/export/${logId}/status`, {
        headers: {
          "authorization": `Bearer ${SEARCHLEADS_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();
      return data.log?.status || "pending";
    } catch (error) {
      console.error("Check status error:", error);
      return "failed";
    }
  };

  // Retrieve completed export results
  const retrieveExportResult = async (logId: string, outputFormat: "json" | "csv" = "json") => {
    try {
      const response = await fetch(
        `${SEARCHLEADS_API_BASE}/export/${logId}/result?outputFileFormat=${outputFormat}`,
        {
          headers: {
            "authorization": `Bearer ${SEARCHLEADS_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Result retrieval failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Retrieve result error:", error);
      throw error;
    }
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
        .single();

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
    pendingExports,
    isPolling,
  };
};
