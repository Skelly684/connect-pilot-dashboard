
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Mail, Phone, Eye, MoreHorizontal, Search, Loader2 } from "lucide-react";
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

interface Lead {
  id?: number | string;
  name?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  job_title?: string;
  headline?: string;
  company?: string;
  companyName?: string;
  email?: string;
  emailAddress?: string;
  phone?: string;
  location?: string;
  rawAddress?: string;
  stateName?: string;
  cityName?: string;
  countryName?: string;
  status?: string;
  lastContact?: string;
  last_contact?: string;
  contactPhoneNumbers?: Array<{ sanitizedNumber?: string; rawNumber?: string }>;
}

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
}

const ITEMS_PER_PAGE = 50;

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

const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const extractFullName = (lead: Lead): string => {
  if (lead.name) return safeToString(lead.name);
  const firstName = safeToString(lead.firstName);
  const lastName = safeToString(lead.lastName);
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  return 'N/A';
};

const extractJobTitle = (lead: Lead): string => {
  return safeToString(lead.jobTitle || lead.job_title || lead.headline);
};

const extractCompany = (lead: Lead): string => {
  return safeToString(lead.company || lead.companyName);
};

const extractEmail = (lead: Lead): string => {
  return safeToString(lead.email || lead.emailAddress);
};

const extractPhone = (lead: Lead): string => {
  if (lead.phone) return safeToString(lead.phone);
  if (lead.contactPhoneNumbers && lead.contactPhoneNumbers.length > 0) {
    const phoneObj = lead.contactPhoneNumbers[0];
    return safeToString(phoneObj.sanitizedNumber || phoneObj.rawNumber);
  }
  return '';
};

const extractLocation = (lead: Lead): string => {
  if (lead.location) return safeToString(lead.location);
  if (lead.rawAddress) return safeToString(lead.rawAddress);
  
  const parts = [
    safeToString(lead.cityName),
    safeToString(lead.stateName),
    safeToString(lead.countryName)
  ].filter(part => part && part !== '');
  
  return parts.join(', ') || '';
};

export const LeadTable = ({ leads = [], isLoading }: LeadTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  console.log("LeadTable received leads:", leads);

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = extractFullName(lead).toLowerCase();
    const jobTitle = extractJobTitle(lead).toLowerCase();
    const company = extractCompany(lead).toLowerCase();
    const email = extractEmail(lead).toLowerCase();
    
    return fullName.includes(searchLower) ||
           jobTitle.includes(searchLower) ||
           company.includes(searchLower) ||
           email.includes(searchLower);
  });

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Lead Database</CardTitle>
          <CardDescription>Searching for leads...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-lg">Searching for leads...</span>
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
              {filteredLeads.length} leads found • Showing {paginatedLeads.length} per page
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLeads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No leads found</p>
            <p className="text-gray-400 text-sm mt-2">
              Try adjusting your search criteria or filters
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead, index) => {
                    const leadId = lead.id || `lead-${startIndex + index}`;
                    const fullName = extractFullName(lead);
                    const jobTitle = extractJobTitle(lead);
                    const company = extractCompany(lead);
                    const email = extractEmail(lead);
                    const phone = extractPhone(lead);
                    const location = extractLocation(lead);
                    const status = safeToString(lead.status || 'new');

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
                        <TableCell>{company || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{location || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                            {status.replace('_', ' ')}
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
    </Card>
  );
};
