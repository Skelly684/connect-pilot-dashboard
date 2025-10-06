
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, Eye, MoreHorizontal, Search, Loader2, Trash2, Download, FileSpreadsheet, ExternalLink, FileText, Settings } from "lucide-react";
import { AddNoteDialog } from "./AddNoteDialog";
import { ChangeStatusDialog } from "./ChangeStatusDialog";
import { EnhancedCallStatusBadge } from "./EnhancedCallStatusBadge";
import { EnhancedCallActivity } from "./EnhancedCallActivity";
import { LeadActivityPanel } from "./LeadActivityPanel";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { LeadQuickActions } from "./LeadQuickActions";
import * as XLSX from 'xlsx';

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
  company?: string;
  companyName?: string;
  company_name?: string;
  email?: string;
  emailAddress?: string;
  email_address?: string;
  phone?: string;
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
  last_call_status?: string;
  next_call_at?: string | null;
  call_attempts?: number;
  last_email_status?: string;
}

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  onDeleteLeads: (leadIds: string[]) => Promise<boolean>;
  onDeleteAllLeads: () => Promise<boolean>;
  onUpdateLeadStatus?: (leadIds: string[], newStatus: string) => Promise<boolean>;
  onRefresh?: () => void;
  tempHighlightLeadId?: string | null;
}

const ITEMS_PER_PAGE = 25;

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "new":
      return "bg-blue-100 text-blue-800";
    case "contacted":
      return "bg-yellow-100 text-yellow-800";
    case "replied":
      return "bg-green-100 text-green-800";
    case "qualified":
      return "bg-purple-100 text-purple-800";
    case "not_interested":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusRowColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "new":
      return "bg-blue-50/50";
    case "contacted":
      return "bg-yellow-50/50";
    case "replied":
      return "bg-green-50/50";
    case "qualified":
      return "bg-purple-50/50";
    case "not_interested":
      return "bg-red-50/50";
    case "accepted":
      return "bg-emerald-50/50";
    case "rejected":
      return "bg-rose-50/50";
    case "pending_review":
      return "bg-amber-50/50";
    case "sent_for_contact":
      return "bg-cyan-50/50";
    default:
      return "";
  }
};

const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const extractFullName = (lead: Lead): string => {
  if (lead.name) return safeToString(lead.name);
  const firstName = safeToString(lead.firstName || lead.first_name);
  const lastName = safeToString(lead.lastName || lead.last_name);
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  return 'N/A';
};

const extractJobTitle = (lead: Lead): string => {
  return safeToString(lead.jobTitle || lead.job_title || lead.headline);
};

const extractCompanyInfo = (lead: Lead) => {
  // Handle both string and object company data
  let companyData = lead.company || lead.companyName || lead.company_name;
  
  if (typeof companyData === 'string') {
    try {
      // Try to parse if it's a JSON string
      companyData = JSON.parse(companyData);
    } catch (e) {
      // If parsing fails, treat as simple string
      return {
        name: companyData,
        website: '',
        industry: '',
        location: '',
        phone: ''
      };
    }
  }
  
  if (companyData && typeof companyData === 'object') {
    return {
      name: safeToString((companyData as any)?.name || (companyData as any)?.companyName || (companyData as any)?.company_name || ''),
      website: safeToString((companyData as any)?.website || (companyData as any)?.websiteUrl || (companyData as any)?.url || ''),
      industry: safeToString((companyData as any)?.industry || (companyData as any)?.industryName || ''),
      location: safeToString((companyData as any)?.location || (companyData as any)?.address || (companyData as any)?.city || ''),
      phone: safeToString((companyData as any)?.phone || (companyData as any)?.phoneNumber || '')
    };
  }
  
  return {
    name: safeToString(companyData || ''),
    website: '',
    industry: '',
    location: '',
    phone: ''
  };
};

const extractEmail = (lead: Lead): string => {
  return safeToString(lead.email || lead.emailAddress || lead.email_address);
};

const extractPhone = (lead: Lead): string => {
  if (lead.phone) return safeToString(lead.phone);
  
  // Handle contact_phone_numbers from database (stored as JSON string)
  if (lead.contact_phone_numbers) {
    try {
      const phoneNumbers = typeof lead.contact_phone_numbers === 'string' 
        ? JSON.parse(lead.contact_phone_numbers) 
        : lead.contact_phone_numbers;
      if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
        const phoneObj = phoneNumbers[0];
        return safeToString(phoneObj.sanitizedNumber || phoneObj.rawNumber);
      }
    } catch (e) {
      console.warn('Error parsing contact_phone_numbers:', e);
    }
  }
  
  // Handle contactPhoneNumbers from API response
  if (lead.contactPhoneNumbers && lead.contactPhoneNumbers.length > 0) {
    const phoneObj = lead.contactPhoneNumbers[0];
    return safeToString(phoneObj.sanitizedNumber || phoneObj.rawNumber);
  }
  return '';
};

const extractLocation = (lead: Lead): string => {
  if (lead.location) return safeToString(lead.location);
  if (lead.rawAddress || lead.raw_address) return safeToString(lead.rawAddress || lead.raw_address);
  
  const parts = [
    safeToString(lead.cityName || lead.city_name),
    safeToString(lead.stateName || lead.state_name),
    safeToString(lead.countryName || lead.country_name)
  ].filter(part => part && part !== '');
  
  return parts.join(', ') || '';
};

const CompanyCell = ({ company }: { company: any }) => {
  const companyInfo = extractCompanyInfo({ company });
  
  return (
    <div className="space-y-1">
      <div className="font-medium text-gray-900 dark:text-white">
        {companyInfo.name || '—'}
      </div>
      {companyInfo.website && (
        <div className="flex items-center space-x-1">
          <a 
            href={companyInfo.website.startsWith('http') ? companyInfo.website : `https://${companyInfo.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
          >
            <span>{companyInfo.website}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      {companyInfo.industry && (
        <div className="text-sm text-gray-600 dark:text-foreground/80">{companyInfo.industry}</div>
      )}
      {companyInfo.location && (
        <div className="text-sm text-gray-500 dark:text-foreground/80">{companyInfo.location}</div>
      )}
      {companyInfo.phone && (
        <div className="text-sm text-gray-500 dark:text-foreground/80">{companyInfo.phone}</div>
      )}
    </div>
  );
};

export const LeadTable = ({ leads = [], isLoading, onDeleteLeads, onDeleteAllLeads, onUpdateLeadStatus, onRefresh, tempHighlightLeadId }: LeadTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<{ id: string; name: string; status: string } | null>(null);
  const { toast } = useToast();

  // Track which replied leads should pulse (replied but not yet viewed)
  const unviewedLeads = useMemo(() => {
    const viewedLeads = JSON.parse(localStorage.getItem('psn-viewed-leads') || '[]');
    return new Set(
      leads
        .filter(lead => 
          (lead.status?.toLowerCase() === 'replied' || lead.last_email_status?.toLowerCase() === 'reply') &&
          !viewedLeads.includes(String(lead.id))
        )
        .map(lead => String(lead.id))
    );
  }, [leads]);

  // Mark lead as viewed
  const markLeadAsViewed = (leadId: string) => {
    const viewedLeads = JSON.parse(localStorage.getItem('psn-viewed-leads') || '[]');
    if (!viewedLeads.includes(leadId)) {
      viewedLeads.push(leadId);
      localStorage.setItem('psn-viewed-leads', JSON.stringify(viewedLeads));
    }
  };

  console.log("LeadTable received leads:", leads);
  console.log("LeadTable isLoading:", isLoading);

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = extractFullName(lead).toLowerCase();
    const jobTitle = extractJobTitle(lead).toLowerCase();
    const companyInfo = extractCompanyInfo(lead);
    const company = companyInfo.name.toLowerCase();
    const email = extractEmail(lead).toLowerCase();
    
    return fullName.includes(searchLower) ||
           jobTitle.includes(searchLower) ||
           company.includes(searchLower) ||
           email.includes(searchLower);
  });

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedLeads.map(lead => String(lead.id || `lead-${leads.indexOf(lead)}`)));
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

  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) return;
    
    setIsDeleting(true);
    const success = await onDeleteLeads(Array.from(selectedLeads));
    if (success) {
      setSelectedLeads(new Set());
    }
    setIsDeleting(false);
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    const success = await onDeleteAllLeads();
    if (success) {
      setSelectedLeads(new Set());
    }
    setIsDeleting(false);
  };

  const exportToExcel = (selectedOnly = false) => {
    const dataToExport = selectedOnly 
      ? filteredLeads.filter(lead => selectedLeads.has(String(lead.id || `lead-${leads.indexOf(lead)}`)))
      : filteredLeads;

    if (dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: selectedOnly ? "No leads selected for export" : "No leads to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = dataToExport.map(lead => {
      const companyInfo = extractCompanyInfo(lead);
      return {
        Name: extractFullName(lead),
        'Job Title': extractJobTitle(lead),
        'Company Name': companyInfo.name,
        'Company Website': companyInfo.website,
        'Company Industry': companyInfo.industry,
        'Company Location': companyInfo.location,
        'Company Phone': companyInfo.phone,
        Email: extractEmail(lead),
        Phone: extractPhone(lead),
        Location: extractLocation(lead),
        Status: safeToString(lead.status || 'new'),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    
    const fileName = selectedOnly 
      ? `selected-leads-${new Date().toISOString().split('T')[0]}.xlsx`
      : `all-leads-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Export Complete",
      description: `Exported ${dataToExport.length} leads to ${fileName}`,
    });
  };

  const exportToCSV = (selectedOnly = false) => {
    const dataToExport = selectedOnly 
      ? filteredLeads.filter(lead => selectedLeads.has(String(lead.id || `lead-${leads.indexOf(lead)}`)))
      : filteredLeads;

    if (dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: selectedOnly ? "No leads selected for export" : "No leads to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Name', 'Job Title', 'Company Name', 'Company Website', 'Company Industry', 'Company Location', 'Company Phone', 'Email', 'Phone', 'Location', 'Status'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(lead => {
        const companyInfo = extractCompanyInfo(lead);
        return [
          `"${extractFullName(lead).replace(/"/g, '""')}"`,
          `"${extractJobTitle(lead).replace(/"/g, '""')}"`,
          `"${companyInfo.name.replace(/"/g, '""')}"`,
          `"${companyInfo.website.replace(/"/g, '""')}"`,
          `"${companyInfo.industry.replace(/"/g, '""')}"`,
          `"${companyInfo.location.replace(/"/g, '""')}"`,
          `"${companyInfo.phone.replace(/"/g, '""')}"`,
          `"${extractEmail(lead).replace(/"/g, '""')}"`,
          `"${extractPhone(lead).replace(/"/g, '""')}"`,
          `"${extractLocation(lead).replace(/"/g, '""')}"`,
          `"${safeToString(lead.status || 'new').replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const fileName = selectedOnly 
      ? `selected-leads-${new Date().toISOString().split('T')[0]}.csv`
      : `all-leads-${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: `Exported ${dataToExport.length} leads to ${fileName}`,
    });
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Lead Database</CardTitle>
          <CardDescription>Loading leads...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-lg">Loading leads...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lead Database</CardTitle>
            <CardDescription>
              {filteredLeads.length} leads found • {selectedLeads.size} selected • Showing {paginatedLeads.length} per page
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            {selectedLeads.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedLeads.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Selected Leads</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedLeads.size} selected lead(s)? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-700">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {leads.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Leads</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete ALL leads? This action cannot be undone and will remove all {leads.length} leads from your database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => exportToCSV(false)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export All as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToExcel(false)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export All as Excel
                </DropdownMenuItem>
                {selectedLeads.size > 0 && (
                  <>
                    <DropdownMenuItem onClick={() => exportToCSV(true)}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Selected as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToExcel(true)}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Selected as Excel
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLeads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No leads found</p>
            <p className="text-gray-400 text-sm mt-2">
              Try adjusting your search criteria or search for new leads
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedLeads.size === paginatedLeads.length && paginatedLeads.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead className="w-64">Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead, index) => {
                    const leadId = String(lead.id || `lead-${startIndex + index}`);
                    const fullName = extractFullName(lead);
                    const jobTitle = extractJobTitle(lead);
                    const email = extractEmail(lead);
                    const phone = extractPhone(lead);
                    const location = extractLocation(lead);
                     const status = safeToString(lead.status || 'new');
                     const isUnviewed = unviewedLeads.has(leadId);

                      return (
                          <>
                              <TableRow 
                              key={leadId} 
                              className={`transition-all duration-500 cursor-pointer ${
                                isUnviewed
                                  ? 'lead-pulse-purple'
                                  : 'hover:bg-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-purple-900/60 dark:hover:to-purple-700/60 dark:hover:shadow-[0_0_50px_hsl(262_100%_70%/0.6)]'
                              }`}
                            >
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
                                    {fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'N'}
                                  </AvatarFallback>
                                </Avatar>
                                 <div>
                                   <div className="font-medium text-gray-900 dark:text-white">{fullName}</div>
                                   <div className="text-sm text-gray-500 dark:text-foreground/80">{email || 'No email'}</div>
                                 </div>
                              </div>
                            </TableCell>
                             <TableCell className="font-medium dark:text-foreground">
                               {jobTitle || 'N/A'}
                             </TableCell>
                            <TableCell>
                              <CompanyCell company={lead.company || lead.companyName || lead.company_name} />
                            </TableCell>
                            <TableCell className="text-sm text-gray-500 dark:text-foreground/80">{location || 'N/A'}</TableCell>
                           <TableCell>
                             <div className="flex flex-col gap-1">
                               {/* Only show status if it's not "no-tz" */}
                               {status !== 'no-tz' && (
                                 <Badge className={getStatusColor(status)}>
                                   {status?.replace('_', ' ') || 'new'}
                                 </Badge>
                               )}
                               <EnhancedCallStatusBadge 
                                 leadId={leadId} 
                                 lastCallStatus={lead.last_call_status}
                                 nextCallAt={lead.next_call_at}
                                 callAttempts={lead.call_attempts}
                               />
                              </div>
                            </TableCell>
                             <TableCell className="text-sm text-gray-500 dark:text-foreground/80">
                               {phone || 'N/A'}
                             </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                   {unviewedLeads.has(leadId) && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => markLeadAsViewed(leadId)}
                                      className="bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                  )}
                                 <LeadQuickActions
                                  lead={lead}
                                  showViewActivity={true}
                                  onViewActivity={(leadId) => {
                                    // Mark as viewed when expanding activity
                                    markLeadAsViewed(leadId);
                                    
                                    const newExpanded = new Set(expandedRows);
                                    if (expandedRows.has(leadId)) {
                                      newExpanded.delete(leadId);
                                    } else {
                                      newExpanded.add(leadId);
                                    }
                                    setExpandedRows(newExpanded);
                                  }}
                                />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-white z-50">
                                    {onUpdateLeadStatus && (
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedLeadForAction({ id: leadId, name: fullName, status: status });
                                          setChangeStatusDialogOpen(true);
                                        }}
                                        className="flex items-center gap-2"
                                      >
                                        <Settings className="h-4 w-4" />
                                        Change Status
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedLeadForAction({ id: leadId, name: fullName, status: status });
                                        setAddNoteDialogOpen(true);
                                      }}
                                      className="flex items-center gap-2"
                                    >
                                      <FileText className="h-4 w-4" />
                                      Add Note
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                           </TableCell>
                           </TableRow>
                           {expandedRows.has(leadId) && (
                             <TableRow>
                               <TableCell colSpan={8} className="p-0 border-t-0">
                                  <div className="px-4 pb-4">
                                    <LeadActivityPanel 
                                      leadId={leadId} 
                                      leadName={fullName} 
                                      enabled={expandedRows.has(leadId)} 
                                    />
                                  </div>
                               </TableCell>
                             </TableRow>
                           )}
                        </>
                      );
                   })}
                 </TableBody>
               </Table>
             </div>
            
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum <= totalPages) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Dialogs */}
      {selectedLeadForAction && (
        <>
          <AddNoteDialog
            leadId={selectedLeadForAction.id}
            leadName={selectedLeadForAction.name}
            open={addNoteDialogOpen}
            onOpenChange={setAddNoteDialogOpen}
            onNoteAdded={() => {
              onRefresh?.();
              setSelectedLeadForAction(null);
            }}
          />
          {onUpdateLeadStatus && (
             <ChangeStatusDialog
               leadId={selectedLeadForAction.id}
               leadName={selectedLeadForAction.name}
               currentStatus={selectedLeadForAction.status}
               open={changeStatusDialogOpen}
               onOpenChange={setChangeStatusDialogOpen}
               onStatusChanged={async (leadId: string, newStatus: string) => {
                 console.log('LeadTable onStatusChanged called:', { leadId, newStatus });
                 const success = await onUpdateLeadStatus([leadId], newStatus);
                 console.log('onUpdateLeadStatus result:', success);
                 if (success) {
                   // Lead status updated - component will auto-refresh
                   onRefresh?.();
                   setSelectedLeadForAction(null);
                 }
                 return success;
               }}
             />
          )}
        </>
      )}
    </Card>
  );
};
