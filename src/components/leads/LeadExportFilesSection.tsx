import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface ExportJob {
  log_id: string;
  file_name: string;
  csv_path?: string | null;
  url?: string | null;
  summary?: any;
  created_at: string;
  status: string;
}

export const LeadExportFilesSection = () => {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewLeads, setReviewLeads] = useState<any[]>([]);
  const [isLoadingCSV, setIsLoadingCSV] = useState(false);
  const { toast } = useToast();

  const fetchExportJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("searchleads_jobs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setExportJobs(data || []);
    } catch (error) {
      console.error("Error fetching export jobs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch export jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExportJobs();

    // Poll every 60 seconds
    const interval = setInterval(() => {
      fetchExportJobs();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleDownload = (url: string, fileName: string) => {
    // Open in new tab (works for both CSV and Google Sheets)
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const leads: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const lead: any = {};

      headers.forEach((header, index) => {
        lead[header] = values[index] || '';
      });

      leads.push(lead);
    }

    return leads;
  };

  const handleReview = async (url: string) => {
    setIsLoadingCSV(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch CSV');
      
      const csvText = await response.text();
      const parsedLeads = parseCSV(csvText);
      
      setReviewLeads(parsedLeads);
      setReviewDialogOpen(true);
    } catch (error) {
      console.error('Error loading CSV:', error);
      toast({
        title: "Error",
        description: "Failed to load CSV file for review",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCSV(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Completed Lead Exports</CardTitle>
        <CardDescription>
          Recent completed exports from lead searches
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : exportJobs.length === 0 ? (
          <div className="text-center py-8">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No completed exports yet. We'll refresh automatically.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Log ID</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportJobs.map((job) => (
                  <TableRow key={job.log_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        {job.file_name || "Export"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {job.log_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      {typeof job.summary === 'string' 
                        ? job.summary
                        : job.summary?.leads?.length 
                          ? `${job.summary.leads.length} leads` 
                          : "—"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(job.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      {(job.url || job.csv_path) ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReview(job.url || job.csv_path!)}
                            disabled={isLoadingCSV}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(
                              job.url || job.csv_path!, 
                              job.file_name || "export"
                            )}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download CSV
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Processing...</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Leads from CSV</DialogTitle>
            <DialogDescription>
              Preview of {reviewLeads.length} leads from the export
            </DialogDescription>
          </DialogHeader>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewLeads.map((lead, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {lead.firstName || lead.first_name || lead.fullName || lead.name || '—'}
                      {' '}
                      {lead.lastName || lead.last_name || ''}
                    </TableCell>
                    <TableCell>
                      {lead.jobTitle || lead.job_title || lead.title || lead.headline || '—'}
                    </TableCell>
                    <TableCell>
                      {lead.company || lead.companyName || lead.company_name || lead.orgName || '—'}
                    </TableCell>
                    <TableCell>
                      {lead.email || lead.emailAddress || lead.email_address ? (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {lead.email || lead.emailAddress || lead.email_address}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {lead.phone || lead.phone_number || '—'}
                    </TableCell>
                    <TableCell>
                      {lead.location || lead.cityName || lead.city_name || lead.orgCity || '—'}
                      {(lead.stateName || lead.state_name || lead.orgState) && 
                        `, ${lead.stateName || lead.state_name || lead.orgState}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};