import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, CheckCircle, XCircle, Send, Eye, MoreHorizontal, ExternalLink, Loader2 } from "lucide-react";
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
  created_at?: string;
}

interface ReviewNewLeadsSectionProps {
  leads: Lead[];
  isLoading: boolean;
  onAcceptLeads: (leadIds: string[]) => Promise<boolean>;
  onRejectLeads: (leadIds: string[]) => Promise<boolean>;
  onSendAcceptedLeads: (leads: Lead[]) => Promise<boolean>;
  onRefresh: () => void;
}

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
      <div className="font-medium text-gray-900">
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
        <div className="text-sm text-gray-600">{companyInfo.industry}</div>
      )}
      {companyInfo.location && (
        <div className="text-sm text-gray-500">{companyInfo.location}</div>
      )}
      {companyInfo.phone && (
        <div className="text-sm text-gray-500">{companyInfo.phone}</div>
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
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

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
    if (selectedLeads.size === 0) return;
    
    setIsProcessing(true);
    const success = await onAcceptLeads(Array.from(selectedLeads));
    if (success) {
      setSelectedLeads(new Set());
      onRefresh();
      toast({
        title: "Success",
        description: `${selectedLeads.size} leads accepted for outreach`,
      });
    }
    setIsProcessing(false);
  };

  const handleRejectSelected = async () => {
    if (selectedLeads.size === 0) return;
    
    setIsProcessing(true);
    const success = await onRejectLeads(Array.from(selectedLeads));
    if (success) {
      setSelectedLeads(new Set());
      onRefresh();
      toast({
        title: "Success",
        description: `${selectedLeads.size} leads rejected`,
      });
    }
    setIsProcessing(false);
  };

  const handleAcceptAll = async () => {
    const allLeadIds = newLeads.map(lead => String(lead.id || `lead-${newLeads.indexOf(lead)}`));
    if (allLeadIds.length === 0) return;
    
    setIsProcessing(true);
    const success = await onAcceptLeads(allLeadIds);
    if (success) {
      setSelectedLeads(new Set());
      onRefresh();
      toast({
        title: "Success",
        description: `All ${allLeadIds.length} leads accepted for outreach`,
      });
    }
    setIsProcessing(false);
  };

  const handleRejectAll = async () => {
    const allLeadIds = newLeads.map(lead => String(lead.id || `lead-${newLeads.indexOf(lead)}`));
    if (allLeadIds.length === 0) return;
    
    setIsProcessing(true);
    const success = await onRejectLeads(allLeadIds);
    if (success) {
      setSelectedLeads(new Set());
      onRefresh();
      toast({
        title: "Success",
        description: `All ${allLeadIds.length} leads rejected`,
      });
    }
    setIsProcessing(false);
  };

  const handleSendToBackend = async () => {
    if (acceptedLeads.length === 0) {
      toast({
        title: "No Accepted Leads",
        description: "Please accept some leads first before sending to backend",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const success = await onSendAcceptedLeads(acceptedLeads);
    if (success) {
      onRefresh();
    }
    setIsProcessing(false);
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
          
          {/* Action Buttons */}
          {newLeads.length > 0 && (
            <div className="flex items-center space-x-2 pt-4 border-t">
              {selectedLeads.size > 0 ? (
                <>
                  <Button 
                    onClick={handleAcceptSelected} 
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Selected ({selectedLeads.size})
                  </Button>
                  <Button 
                    onClick={handleRejectSelected} 
                    disabled={isProcessing}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Selected ({selectedLeads.size})
                  </Button>
                </>
              ) : (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept All ({newLeads.length})
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
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject All ({newLeads.length})
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
                    const status = safeToString(lead.status || 'new');

                    return (
                      <TableRow key={leadId} className="hover:bg-gray-50">
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
                              <div className="font-medium text-gray-900">{fullName}</div>
                              <div className="text-sm text-gray-500">{email || 'No email'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {jobTitle || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <CompanyCell company={lead.company || lead.companyName || lead.company_name} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{location || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                             {status?.replace('_', ' ') || 'new'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {phone || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="sm" disabled={!email}>
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled={!phone}>
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
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
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Backend ({acceptedLeads.length})
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
                    const status = safeToString(lead.status || 'accepted');

                    return (
                      <TableRow key={leadId} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`/avatars/${leadId}.png`} />
                              <AvatarFallback>
                                {fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'N'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900">{fullName}</div>
                              <div className="text-sm text-gray-500">{email || 'No email'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {jobTitle || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <CompanyCell company={lead.company || lead.companyName || lead.company_name} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{location || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                            {status?.replace('_', ' ') || 'new'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {phone || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="sm" disabled={!email}>
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled={!phone}>
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
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
    </div>
  );
};