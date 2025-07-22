import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, CheckCircle, XCircle, Send } from "lucide-react";
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
}

interface ReviewNewLeadsSectionProps {
  leads: Lead[];
  isLoading: boolean;
  onAcceptLeads: (leadIds: string[]) => Promise<boolean>;
  onRejectLeads: (leadIds: string[]) => Promise<boolean>;
  onSendAcceptedLeads: (leads: Lead[]) => Promise<boolean>;
  onRefresh: () => void;
}

const formatName = (lead: Lead): string => {
  if (lead.name) return lead.name;
  const firstName = lead.first_name || '';
  const lastName = lead.last_name || '';
  return `${firstName} ${lastName}`.trim() || 'N/A';
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
      setSelectedLeads(new Set(newLeads.map(lead => lead.id)));
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
    const allLeadIds = newLeads.map(lead => lead.id);
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
    const allLeadIds = newLeads.map(lead => lead.id);
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
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading new leads...</p>
              </div>
            </div>
          ) : newLeads.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500">No new leads to review!</p>
              <p className="text-sm text-gray-400">All leads have been processed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.size === newLeads.length && newLeads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newLeads.map((lead) => (
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
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {lead.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acceptedLeads.map((lead) => (
                  <TableRow key={lead.id}>
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
                      <Badge className="bg-green-100 text-green-800">
                        ACCEPTED
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};