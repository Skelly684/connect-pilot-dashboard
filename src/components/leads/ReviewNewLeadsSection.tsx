import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, CheckCircle, XCircle, Send, Eye, MoreHorizontal, ExternalLink, Loader2, Linkedin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCampaigns } from "@/hooks/useCampaigns";
import { LeadQuickActions } from "./LeadQuickActions";
import { supabase } from "@/integrations/supabase/client";
import { LeadExportFilesSection } from "./LeadExportFilesSection";

interface Lead {
  id?: number | string;
  name?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  jobTitle?: string;
  job_title?: string;
  headline?: string;
  title?: string;
  position?: string;
  company?: string;
  companyName?: string;
  company_name?: string;
  email?: string;
  emailAddress?: string;
  email_address?: string;
  phone?: string;
  phone_number?: string;
  location?: string;
  rawAddress?: string;
  raw_address?: string;
  stateName?: string;
  state_name?: string;
  cityName?: string;
  city_name?: string;
  countryName?: string;
  country_name?: string;
  status?: string;
  lastContact?: string;
  last_contact?: string;
  contactPhoneNumbers?: Array<{ sanitizedNumber?: string; rawNumber?: string }>;
  contact_phone_numbers?: string;
  created_at?: string;
  // New scraper fields
  fullName?: string;
  orgName?: string;
  orgWebsite?: string;
  orgCountry?: string;
  orgCity?: string;
  orgState?: string;
  company_website?: string;
  linkedinUrl?: string;
  linkedin_url?: string;
}

interface ReviewNewLeadsSectionProps {
  leads: Lead[];
  isLoading: boolean;
  onAcceptLeads: (leadIds: string[], campaignId?: string) => Promise<boolean>;
  onRejectLeads: (leadIds: string[]) => Promise<boolean>;
  onSendAcceptedLeads: (leads: Lead[], campaignId?: string) => Promise<boolean>;
  onRefresh: () => void;
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

// Legacy compatibility
const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "new":
      return "bg-blue-100 text-blue-800";
    case "pending_review":
      return "bg-yellow-100 text-yellow-800";
    case "accepted":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "contacted":
      return "bg-purple-100 text-purple-800";
    case "replied":
      return "bg-emerald-100 text-emerald-800";
    case "qualified":
      return "bg-indigo-100 text-indigo-800";
    case "not_interested":
      return "bg-gray-100 text-gray-800";
    case "sent_for_contact":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const extractFullName = (lead: Lead): string => {
  const name = safeStr(lead.name) || [safeStr(lead.first_name), safeStr(lead.last_name)].filter(Boolean).join(" ").trim();
  return name || "—";
};

const extractJobTitle = (lead: Lead): string => {
  return safeStr(lead.job_title) || "—";
};

const extractCompanyInfo = (lead: Lead) => {
  const companyName = safeStr(lead.company_name);
  const companySite = safeStr(lead.company_website);
  
  return {
    name: companyName || "—",
    domain: extractDomain(companySite),
    href: ensureHref(companySite),
  };
};

const extractEmail = (lead: Lead): string => {
  return safeStr(lead.email) || safeStr(lead.email_address) || "—";
};

const extractPhone = (lead: Lead): string => {
  return safeStr(lead.phone) || "—";
};

const extractLocation = (lead: Lead): string => {
  const city = safeStr(lead.city_name);
  const state = safeStr(lead.state_name);
  const country = safeStr(lead.country_name);
  const parts = [city, state, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
};

const extractLinkedIn = (lead: Lead): string | null => {
  return ensureHref(lead.linkedin_url);
};

const CompanyCell = ({ lead }: { lead: Lead }) => {
  const companyInfo = extractCompanyInfo(lead);
  
  return (
    <div className="space-y-1">
      <div className="font-medium text-gray-900 dark:text-white">
        {companyInfo.name}
      </div>
      {companyInfo.href && companyInfo.domain && (
        <div className="flex items-center space-x-1">
          <a 
            href={companyInfo.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
          >
            <span>{companyInfo.domain}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
};

export const ReviewNewLeadsSection = ({ 
  leads, 
  isLoading, 
  onAcceptLeads, 
  onRejectLeads, 
  onSendAcceptedLeads,
  onRefresh 
}: ReviewNewLeadsSectionProps) => {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const isOperatingRef = useRef(false); // Hard lock to prevent double-clicks
  const { toast } = useToast();
  const navigate = useNavigate();
  const { campaigns, getDefaultCampaign } = useCampaigns();

  // Filter for new leads that need review
  const newLeads = leads.filter(lead => lead.status === 'new' || lead.status === 'pending_review');
  const acceptedLeads = leads.filter(lead => lead.status === 'accepted');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(newLeads.map(lead => String(lead.id || `lead-${newLeads.indexOf(lead)}`)));
      setSelectedLeads(allIds);
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleAcceptSelected = async () => {
    // Prevent double submissions
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
      const success = await onAcceptLeads(Array.from(selectedLeads), campaignId);
      if (success) {
        setSelectedLeads(new Set());
        onRefresh();
        toast({
          title: "Success",
          description: `${selectedLeads.size} leads accepted for outreach`,
        });
      }
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
    }
  };

  const handleRejectSelected = async () => {
    // Prevent double submissions
    if (isOperatingRef.current || isProcessing) return;
    if (selectedLeads.size === 0) return;
    
    isOperatingRef.current = true;
    setIsProcessing(true);
    try {
      const success = await onRejectLeads(Array.from(selectedLeads));
      if (success) {
        setSelectedLeads(new Set());
        onRefresh();
        toast({
          title: "Success",
          description: `${selectedLeads.size} leads rejected`,
        });
      }
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
    }
  };

  const handleAcceptAll = async () => {
    // Prevent double submissions
    if (isOperatingRef.current || isProcessing) return;
    
    const allLeadIds = newLeads.map(lead => String(lead.id || `lead-${newLeads.indexOf(lead)}`));
    if (allLeadIds.length === 0) return;
    
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
      const success = await onAcceptLeads(allLeadIds, campaignId);
      if (success) {
        setSelectedLeads(new Set());
        onRefresh();
        toast({
          title: "Success",
          description: `All ${allLeadIds.length} leads accepted for outreach`,
        });
      }
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
    }
  };

  const handleRejectAll = async () => {
    // Prevent double submissions
    if (isOperatingRef.current || isProcessing) return;
    
    const allLeadIds = newLeads.map(lead => String(lead.id || `lead-${newLeads.indexOf(lead)}`));
    if (allLeadIds.length === 0) return;
    
    isOperatingRef.current = true;
    setIsProcessing(true);
    try {
      const success = await onRejectLeads(allLeadIds);
      if (success) {
        setSelectedLeads(new Set());
        onRefresh();
        toast({
          title: "Success",
          description: `All ${allLeadIds.length} leads rejected`,
        });
      }
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
    }
  };

  const handleSendToBackend = async () => {
    // Prevent double submissions
    if (isOperatingRef.current || isProcessing) return;
    
    if (acceptedLeads.length === 0) {
      toast({
        title: "No Accepted Leads",
        description: "Please accept some leads first before sending to backend",
        variant: "destructive",
      });
      return;
    }

    const campaignId = selectedCampaignId || getDefaultCampaign()?.id;
    isOperatingRef.current = true;
    setIsProcessing(true);
    try {
      const success = await onSendAcceptedLeads(acceptedLeads, campaignId);
      if (success) {
        onRefresh();
      }
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
    }
  };

  const handleSendSingleLead = async (lead: Lead) => {
    // Prevent double submissions
    if (isOperatingRef.current || isProcessing) return;
    
    isOperatingRef.current = true;
    setIsProcessing(true);
    try {
      const leadData = [{
        id: lead.id,
        first_name: lead.firstName || lead.first_name,
        last_name: lead.lastName || lead.last_name,
        company_name: extractCompanyInfo(lead).name,
        email_address: extractEmail(lead),
        campaign_id: getDefaultCampaign()?.id
      }];

      const response = await fetch('/api/accepted-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: leadData,
          emailTemplateId: getDefaultCampaign()?.email_template_id
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Email sent to ${extractFullName(lead)}`,
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
    }
  };

  const handleCallLead = async (lead: Lead) => {
    // Prevent double submissions
    if (isOperatingRef.current || isProcessing) return;
    
    isOperatingRef.current = true;
    setIsProcessing(true);
    try {
      const phone = extractPhone(lead);
      const campaignId = getDefaultCampaign()?.id;

      const response = await fetch('/api/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: phone,
          campaign_id: campaignId
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Test call initiated to ${extractFullName(lead)}`,
        });
      } else {
        throw new Error('Failed to initiate call');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate call",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
    }
  };

  const handleViewActivity = (leadId: string) => {
    navigate(`/lead/${leadId}`);
  };

  return (
    <div className="space-y-6">
      {/* New Leads Review Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Review New Leads</CardTitle>
              <CardDescription>
                {newLeads.length} new leads waiting for review • {selectedLeads.size} selected
              </CardDescription>
            </div>
          </div>
          
          {/* Campaign Selection */}
          <div className="pt-4 border-t">
            <div className="flex items-center space-x-4">
              <label htmlFor="campaign-select" className="text-sm font-medium text-gray-700">
                Campaign:
              </label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name} {campaign.is_default ? "(Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedCampaignId && getDefaultCampaign() && (
                <span className="text-sm text-gray-500">
                  Will use default: {getDefaultCampaign()?.name}
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          {newLeads.length > 0 && (
            <div className="flex items-center space-x-2 pt-4 border-t">
              {selectedLeads.size > 0 ? (
                <>
                  <Button 
                    onClick={handleAcceptSelected} 
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                    aria-busy={isProcessing ? 'true' : 'false'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Accepting…' : `Accept Selected (${selectedLeads.size})`}
                  </Button>
                  <Button 
                    onClick={handleRejectSelected} 
                    disabled={isProcessing}
                    variant="destructive"
                    aria-busy={isProcessing ? 'true' : 'false'}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Rejecting…' : `Reject Selected (${selectedLeads.size})`}
                  </Button>
                </>
              ) : (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                        aria-busy={isProcessing ? 'true' : 'false'}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isProcessing ? 'Processing…' : `Accept All (${newLeads.length})`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Accept All Leads</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to accept all {newLeads.length} leads for outreach? 
                          This will move them to the accepted queue.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAcceptAll} className="bg-green-600 hover:bg-green-700">
                          Accept All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        disabled={isProcessing}
                        variant="destructive"
                        aria-busy={isProcessing ? 'true' : 'false'}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {isProcessing ? 'Processing…' : `Reject All (${newLeads.length})`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject All Leads</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject all {newLeads.length} leads? 
                          This action will mark them as rejected and they won't be used for outreach.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRejectAll} className="bg-red-600 hover:bg-red-700">
                          Reject All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-lg">Loading new leads...</span>
            </div>
          ) : newLeads.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No new leads to review!</p>
              <p className="text-gray-400 text-sm mt-2">All leads have been processed.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedLeads.size === newLeads.length && newLeads.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead className="w-64">Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>LinkedIn</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newLeads.map((lead, index) => {
                    const leadId = String(lead.id || `lead-${index}`);
                    const fullName = extractFullName(lead);
                    const jobTitle = extractJobTitle(lead);
                    const email = extractEmail(lead);
                    const phone = extractPhone(lead);
                    const location = extractLocation(lead);
                    const linkedinHref = extractLinkedIn(lead);
                    const status = safeToString(lead.status || 'new');

                    return (
                      <TableRow key={leadId} className="transition-all duration-500 cursor-pointer hover:bg-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-purple-900/60 dark:hover:to-purple-700/60 dark:hover:shadow-[0_0_50px_hsl(262_100%_70%/0.6)]">
                        <TableCell>
                          <Checkbox
                            checked={selectedLeads.has(leadId)}
                            onCheckedChange={(checked) => handleSelectLead(leadId, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`/avatars/${leadId}.png`} />
                              <AvatarFallback>
                                {fullName !== "—" ? fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'N'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{fullName}</div>
                              {email !== "—" ? (
                                <a 
                                  href={`mailto:${email}`}
                                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  title={email}
                                >
                                  {email}
                                </a>
                              ) : (
                                <div className="text-sm text-gray-500 dark:text-foreground/80">—</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium dark:text-foreground" title={jobTitle !== "—" ? jobTitle : "Not provided"}>
                          {jobTitle}
                        </TableCell>
                        <TableCell>
                          <CompanyCell lead={lead} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-foreground/80" title={location !== "—" ? location : "Not provided"}>
                          {location}
                        </TableCell>
                        <TableCell>
                          {linkedinHref ? (
                            <a 
                              href={linkedinHref} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              title="Open LinkedIn profile"
                              className="inline-flex items-center justify-center h-9 w-9 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Linkedin className="h-5 w-5" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center h-9 w-9 text-gray-400 cursor-not-allowed" title="No profile">
                              <Linkedin className="h-5 w-5" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                             {status?.replace('_', ' ') || 'new'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-foreground/80" title={phone !== "—" ? phone : "Not provided"}>
                          {phone}
                        </TableCell>
                         <TableCell className="text-right">
                           <div className="flex items-center justify-end space-x-2">
                             <LeadQuickActions 
                               lead={lead}
                               onSendEmail={handleSendSingleLead}
                               onCallLead={handleCallLead}
                               onViewActivity={handleViewActivity}
                               showViewActivity={true}
                             />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white">
                                <DropdownMenuItem>Add to Campaign</DropdownMenuItem>
                                <DropdownMenuItem>Update Status</DropdownMenuItem>
                                <DropdownMenuItem>Add Note</DropdownMenuItem>
                                <DropdownMenuItem>Export Contact</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accepted Leads Section */}
      {acceptedLeads.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Accepted Leads Queue</CardTitle>
                <CardDescription>
                  {acceptedLeads.length} leads ready to be sent for outreach
                </CardDescription>
              </div>
              <Button 
                onClick={handleSendToBackend} 
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
                aria-busy={isProcessing ? 'true' : 'false'}
              >
                <Send className="h-4 w-4 mr-2" />
                {isProcessing ? 'Sending…' : `Send to Backend (${acceptedLeads.length})`}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead className="w-64">Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>LinkedIn</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acceptedLeads.map((lead, index) => {
                    const leadId = String(lead.id || `accepted-lead-${index}`);
                    const fullName = extractFullName(lead);
                    const jobTitle = extractJobTitle(lead);
                    const email = extractEmail(lead);
                    const phone = extractPhone(lead);
                    const location = extractLocation(lead);
                    const linkedinHref = extractLinkedIn(lead);
                    const status = safeToString(lead.status || 'accepted');

                    return (
                      <TableRow key={leadId} className="transition-all duration-500 cursor-pointer hover:bg-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-purple-900/60 dark:hover:to-purple-700/60 dark:hover:shadow-[0_0_50px_hsl(262_100%_70%/0.6)]">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`/avatars/${leadId}.png`} />
                              <AvatarFallback>
                                {fullName !== "—" ? fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'N'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{fullName}</div>
                              <div className="text-sm text-gray-500 dark:text-foreground/80" title={email !== "—" ? email : "Not provided"}>
                                {email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium dark:text-foreground" title={jobTitle !== "—" ? jobTitle : "Not provided"}>
                          {jobTitle}
                        </TableCell>
                        <TableCell>
                          <CompanyCell lead={lead} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-foreground/80" title={location !== "—" ? location : "Not provided"}>
                          {location}
                        </TableCell>
                        <TableCell>
                          {linkedinHref ? (
                            <a 
                              href={linkedinHref} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              title="Open LinkedIn profile"
                              className="inline-flex items-center justify-center h-9 w-9 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Linkedin className="h-5 w-5" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center justify-center h-9 w-9 text-gray-400 cursor-not-allowed" title="No profile">
                              <Linkedin className="h-5 w-5" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                            {status?.replace('_', ' ') || 'new'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-foreground/80" title={phone !== "—" ? phone : "Not provided"}>
                          {phone}
                        </TableCell>
                         <TableCell className="text-right">
                           <div className="flex items-center justify-end space-x-2">
                             <LeadQuickActions 
                               lead={lead}
                               onSendEmail={handleSendSingleLead}
                               onCallLead={handleCallLead}
                               onViewActivity={handleViewActivity}
                               showViewActivity={true}
                             />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white">
                                <DropdownMenuItem>Add to Campaign</DropdownMenuItem>
                                <DropdownMenuItem>Update Status</DropdownMenuItem>
                                <DropdownMenuItem>Add Note</DropdownMenuItem>
                                <DropdownMenuItem>Export Contact</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV Export Files Section */}
      <LeadExportFilesSection />
    </div>
  );
};