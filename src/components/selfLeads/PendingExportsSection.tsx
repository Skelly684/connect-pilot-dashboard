import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { apiFetch } from "@/lib/apiFetch";

interface PendingJob {
  log_id: string;
  file_name: string;
  status: string;
  created_at: string;
}

export const PendingExportsSection = () => {
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingJobs = async () => {
    try {
      const response = await apiFetch("/searchleads/jobs?status=pending&limit=50&page=1");
      setPendingJobs(response?.items || []);
    } catch (error) {
      console.error("Error fetching pending jobs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pending exports",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingJobs();

    // Poll every 60 seconds
    const interval = setInterval(() => {
      fetchPendingJobs();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Pending Exports</CardTitle>
        <CardDescription>
          Lead searches currently being processed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pendingJobs.length === 0 ? (
          <div className="text-center py-8">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No pending exports. Start a new lead search to create one.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingJobs.map((job) => (
                  <TableRow key={job.log_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        {job.file_name || "Export"}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{job.status}</TableCell>
                    <TableCell>
                      {format(new Date(job.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
