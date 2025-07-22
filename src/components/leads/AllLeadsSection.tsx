import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Search, Filter, Download, Trash2, Archive } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import * as XLSX from 'xlsx';

interface Lead {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  company?: string;
  company_name?: string;
  email?: string;
  email_address?: string;
  phone?: string;
  location?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  accepted_at?: string;
  sent_for_contact_at?: string;
  notes?: string;
}

interface AllLeadsSectionProps {
  leads: Lead[];
  isLoading: boolean;
  onUpdateLeadStatus: (leadIds: string[], newStatus: string) => Promise<boolean>;
  onDeleteLeads: (leadIds: string[]) => Promise<boolean>;
  onRefresh: () => void;
}

const ITEMS_PER_PAGE = 25;

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

const formatName = (lead: Lead): string => {
  if (lead.name) return lead.name;
  const firstName = lead.first_name || '';
  const lastName = lead.last_name || '';
  return `${firstName} ${lastName}`.trim() || 'N/A';
};

export const AllLeadsSection = ({ 
  leads, 
  isLoading, 
  onUpdateLeadStatus, 
  onDeleteLeads, 
  onRefresh 
}: AllLeadsSectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Filter leads based on search and status
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      formatName(lead).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.job_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company || lead.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || lead.email_address || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(paginatedLeads.map(lead => lead.id)));
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

  const handleStatusUpdate = async (newStatus: string) => {
    if (selectedLeads.size === 0) return;
    
    setIsUpdating(true);
    const success = await onUpdateLeadStatus(Array.from(selectedLeads), newStatus);
    if (success) {
      setSelectedLeads(new Set());
      onRefresh();
    }
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    if (selectedLeads.size === 0) return;
    
    setIsUpdating(true);
    const success = await onDeleteLeads(Array.from(selectedLeads));
    if (success) {
      setSelectedLeads(new Set());
      onRefresh();
    }
    setIsUpdating(false);
  };

  const exportToExcel = () => {
    const dataToExport = selectedLeads.size > 0 
      ? filteredLeads.filter(lead => selectedLeads.has(lead.id))
      : filteredLeads;

    if (dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: "No leads to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = dataToExport.map(lead => ({
      Name: formatName(lead),
      'Job Title': lead.job_title || '',
      Company: lead.company || lead.company_name || '',
      Email: lead.email || lead.email_address || '',
      Phone: lead.phone || '',
      Location: lead.location || '',
      Status: lead.status || '',
      'Created At': new Date(lead.created_at).toLocaleDateString(),
      Notes: lead.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Leads");
    
    const fileName = `all-leads-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Export Complete",
      description: `Exported ${dataToExport.length} leads to ${fileName}`,
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>
              {filteredLeads.length} leads found • {selectedLeads.size} selected
            </CardDescription>
          </div>
        </div>
        
        {/* Filters and Search */}
        <div className="flex items-center space-x-4 pt-4 border-t">
          <div className="relative flex-1 max-w-sm">
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
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
              <SelectItem value="sent_for_contact">Sent for Contact</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Action Buttons */}
        {selectedLeads.size > 0 && (
          <div className="flex items-center space-x-2 pt-4 border-t">
            <Button 
              onClick={() => handleStatusUpdate('contacted')} 
              disabled={isUpdating}
              size="sm"
            >
              Mark as Contacted
            </Button>
            <Button 
              onClick={() => handleStatusUpdate('qualified')} 
              disabled={isUpdating}
              size="sm"
              variant="outline"
            >
              Mark as Qualified
            </Button>
            <Button 
              onClick={() => handleStatusUpdate('not_interested')} 
              disabled={isUpdating}
              size="sm"
              variant="outline"
            >
              Mark as Not Interested
            </Button>
            <Button 
              onClick={exportToExcel} 
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isUpdating}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedLeads.size})
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
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading leads...</p>
            </div>
          </div>
        ) : paginatedLeads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No leads found matching your criteria.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.size === paginatedLeads.length && paginatedLeads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatName(lead)}
                    </TableCell>
                    <TableCell>{lead.job_title || '—'}</TableCell>
                    <TableCell>{lead.company || lead.company_name || '—'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {(lead.email || lead.email_address) && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Mail className="h-3 w-3" />
                            <span>{lead.email || lead.email_address}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Phone className="h-3 w-3" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
        
        {/* Export All Button */}
        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button onClick={exportToExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All Leads
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};