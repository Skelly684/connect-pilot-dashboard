import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2, Eye, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useCampaigns } from "@/hooks/useCampaigns";

interface ExportJob {
  log_id: string;
  file_name: string;
  csv_path?: string | null;
  url?: string | null;
  summary?: any;
  created_at: string;
  status: string;
}

const safeStr = (v?: string | null): string => {
  return (v ?? "").toString().trim();
};

const extractDomain = (url?: string | null): string => {
  const raw = safeStr(url);
  if (!raw) return "";
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
};

const ensureHref = (url?: string | null): string | null => {
  const raw = safeStr(url);
  if (!raw) return null;
  try {
    const hasProto = /^https?:\/\//i.test(raw);
    return hasProto ? raw : `https://${raw}`;
  } catch {
    return null;
  }
};

export const LeadExportFilesSection = () => {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewLeads, setReviewLeads] = useState<any[]>([]);
  const [isLoadingCSV, setIsLoadingCSV] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const isOperatingRef = useRef(false);
  const { toast } = useToast();
  const { campaigns, getDefaultCampaign } = useCampaigns();

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
      const rawLead: any = {};

      headers.forEach((header, index) => {
        rawLead[header] = values[index] || '';
      });

      // Map CSV columns to Lead interface
      const lead = {
        tempId: i, // Temporary ID for selection
        name: rawLead.Name || '',
        email: rawLead.email || '',
        company_website: rawLead.organization_primary_domain || '',
        linkedin_url: rawLead.Linkdeln_url || '',
        job_title: rawLead.title || '',
        company_name: rawLead.organization_name || '',
        country_name: rawLead.country || '',
        state_name: rawLead.state || '',
        phone: rawLead.phone_number || '',
        industry: rawLead.Industry || '',
      };

      leads.push(lead);
    }

    return leads;
  };

  const handleReview = async (url: string) => {
    setIsLoadingCSV(true);
    setSelectedLeads(new Set());
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(reviewLeads.map(lead => lead.tempId));
      setSelectedLeads(allIds);
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: number, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleAcceptSelected = async () => {
    if (isOperatingRef.current || isProcessing) return;
    if (selectedLeads.size === 0) return;
    
    const campaignId = selectedCampaignId || getDefaultCampaign()?.id;
    if (!campaignId) {
      toast({
        title: "No Campaign Selected",
        description: "Please select a campaign before accepting leads",
        variant: "destructive",
      });
      return;
    }
    
    isOperatingRef.current = true;
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selectedLeadsData = reviewLeads.filter(lead => selectedLeads.has(lead.tempId));
      
      const leadsToInsert = selectedLeadsData.map(lead => ({
        user_id: user.id,
        name: lead.name,
        email: lead.email,
        email_address: lead.email,
        company_name: lead.company_name,
        company_website: lead.company_website,
        linkedin_url: lead.linkedin_url,
        job_title: lead.job_title,
        phone: lead.phone,
        state_name: lead.state_name,
        country_name: lead.country_name,
        status: 'accepted',
        campaign_id: campaignId,
      }));

      const { error } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (error) throw error;

      setSelectedLeads(new Set());
      toast({
        title: "Success",
        description: `${selectedLeadsData.length} leads accepted for outreach`,
      });
      
      // Remove accepted leads from review list
      setReviewLeads(prev => prev.filter(lead => !selectedLeads.has(lead.tempId)));
    } catch (error) {
      console.error('Error accepting leads:', error);
      toast({
        title: "Error",
        description: "Failed to accept leads",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
    }
  };

  const handleRejectSelected = async () => {
    if (isOperatingRef.current || isProcessing) return;
    if (selectedLeads.size === 0) return;
    
    isOperatingRef.current = true;
    setIsProcessing(true);
    try {
      // Simply remove from the review list
      setReviewLeads(prev => prev.filter(lead => !selectedLeads.has(lead.tempId)));
      setSelectedLeads(new Set());
      toast({
        title: "Success",
        description: "Selected leads rejected",
      });
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
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
        <DialogContent className="max-w-7xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Review Leads from CSV</DialogTitle>
                <DialogDescription>
                  {reviewLeads.length} leads • {selectedLeads.size} selected
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2 border-b">
            <Button
              onClick={handleAcceptSelected}
              disabled={selectedLeads.size === 0 || isProcessing}
              size="sm"
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Accept Selected ({selectedLeads.size})
            </Button>
            <Button
              onClick={handleRejectSelected}
              disabled={selectedLeads.size === 0 || isProcessing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject Selected
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.size === reviewLeads.length && reviewLeads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>LinkedIn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewLeads.map((lead) => {
                  const companyDomain = extractDomain(lead.company_website);
                  const companyHref = ensureHref(lead.company_website);
                  const linkedinHref = ensureHref(lead.linkedin_url);

                  return (
                    <TableRow key={lead.tempId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.has(lead.tempId)}
                          onCheckedChange={(checked) => handleSelectLead(lead.tempId, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {lead.name || '—'}
                      </TableCell>
                      <TableCell>
                        {lead.job_title || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {lead.company_name || '—'}
                          </div>
                          {companyHref && companyDomain && (
                            <div className="flex items-center space-x-1">
                              <a 
                                href={companyHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                              >
                                <span>{companyDomain}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.email ? (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {lead.email}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {lead.phone || '—'}
                      </TableCell>
                      <TableCell>
                        {[lead.state_name, lead.country_name].filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        {linkedinHref ? (
                          <a
                            href={linkedinHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};