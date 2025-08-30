import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { Loader2, Search, Users, CheckCircle2, PhoneCall, Mail } from "lucide-react";

interface ScrapedLead {
  id?: string;
  name?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  location?: string;
}

interface ScrapeFilters {
  keywords?: string;
  location?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  limit?: number;
}

export const LeadScrapeForm = () => {
  const [filters, setFilters] = useState<ScrapeFilters>({
    limit: 50
  });
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScrapedLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isAccepting, setIsAccepting] = useState(false);
  const [testCallData, setTestCallData] = useState({ number: "", lead_name: "" });
  const [testEmailData, setTestEmailData] = useState({ to: "" });
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const { toast } = useToast();

  const handleScrape = async () => {
    setIsLoading(true);
    try {
      // Only send filled fields
      const payload: any = {};
      if (filters.keywords?.trim()) payload.keywords = filters.keywords.trim();
      if (filters.location?.trim()) payload.location = filters.location.trim();
      if (filters.jobTitle?.trim()) payload.jobTitle = filters.jobTitle.trim();
      if (filters.company?.trim()) payload.company = filters.company.trim();
      if (filters.industry?.trim()) payload.industry = filters.industry.trim();
      if (filters.limit) payload.limit = filters.limit;

      const response = await apiFetch('/api/scrape-leads', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      setResults(response.leads || []);
      setSelectedLeads(new Set());
      
      toast({
        title: "Scrape Complete",
        description: `Found ${response.leads?.length || 0} leads`,
      });
    } catch (error: any) {
      console.error('Failed to scrape leads:', error);
      toast({
        title: "Scrape Failed",
        description: error.message || "Failed to scrape leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(results.map((lead, index) => lead.id || `lead-${index}`));
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

  const handleAcceptAndRunOutreach = async () => {
    if (selectedLeads.size === 0) {
      toast({
        title: "No Leads Selected",
        description: "Please select leads to accept",
        variant: "destructive",
      });
      return;
    }

    setIsAccepting(true);
    try {
      // Get selected lead objects exactly as returned from scrape
      const selectedLeadObjects = results.filter((lead, index) => 
        selectedLeads.has(lead.id || `lead-${index}`)
      );

      const response = await apiFetch('/api/accepted-leads', {
        method: 'POST',
        body: JSON.stringify({
          leads: selectedLeadObjects,
          emailTemplateId: null
        })
      });
      
      toast({
        title: "Leads Accepted",
        description: `Accepted ${selectedLeadObjects.length} leads for outreach`,
      });
      
      // Clear selection after successful acceptance
      setSelectedLeads(new Set());
    } catch (error: any) {
      console.error('Failed to accept leads:', error);
      toast({
        title: "Accept Failed",
        description: error.message || "Failed to accept leads",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleTestCall = async () => {
    if (!testCallData.number.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to test",
        variant: "destructive",
      });
      return;
    }

    setIsTestingCall(true);
    try {
      await apiFetch('/api/test-call', {
        method: 'POST',
        body: JSON.stringify({
          number: testCallData.number,
          lead_name: testCallData.lead_name || undefined
        })
      });
      
      toast({
        title: "Test Call Initiated",
        description: `Test call started to ${testCallData.number}`,
      });
    } catch (error: any) {
      toast({
        title: "Test Call Failed",
        description: error.message || "Failed to initiate test call",
        variant: "destructive",
      });
    } finally {
      setIsTestingCall(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailData.to.trim()) {
      toast({
        title: "Email Address Required",
        description: "Please enter an email address to test",
        variant: "destructive",
      });
      return;
    }

    setIsTestingEmail(true);
    try {
      await apiFetch('/api/test-email', {
        method: 'POST',
        body: JSON.stringify({
          to: testEmailData.to,
          emailTemplateId: null
        })
      });
      
      toast({
        title: "Test Email Sent",
        description: `Test email sent to ${testEmailData.to}`,
      });
    } catch (error: any) {
      toast({
        title: "Test Email Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scrape Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Lead Scraping
          </CardTitle>
          <CardDescription>
            Search and scrape leads from various sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                value={filters.keywords || ""}
                onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
                placeholder="e.g., software engineer"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={filters.location || ""}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                placeholder="e.g., San Francisco"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={filters.jobTitle || ""}
                onChange={(e) => setFilters({ ...filters, jobTitle: e.target.value })}
                placeholder="e.g., CEO, Developer"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={filters.company || ""}
                onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                placeholder="e.g., Google, Startup"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={filters.industry || ""}
                onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                placeholder="e.g., Technology"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limit">Limit</Label>
              <Select value={String(filters.limit)} onValueChange={(value) => setFilters({ ...filters, limit: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 leads</SelectItem>
                  <SelectItem value="50">50 leads</SelectItem>
                  <SelectItem value="100">100 leads</SelectItem>
                  <SelectItem value="200">200 leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={handleScrape} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search Leads
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Search Results
                </CardTitle>
                <CardDescription>
                  {results.length} leads found • {selectedLeads.size} selected
                </CardDescription>
              </div>
              
              <Button 
                onClick={handleAcceptAndRunOutreach}
                disabled={selectedLeads.size === 0 || isAccepting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept & Run Outreach ({selectedLeads.size})
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedLeads.size === results.length}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  Select All
                </Label>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((lead, index) => {
                    const leadId = lead.id || `lead-${index}`;
                    return (
                      <TableRow key={leadId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLeads.has(leadId)}
                            onCheckedChange={(checked) => handleSelectLead(leadId, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{lead.name || "—"}</TableCell>
                        <TableCell>{lead.email || "—"}</TableCell>
                        <TableCell>{lead.company || "—"}</TableCell>
                        <TableCell>{lead.jobTitle || "—"}</TableCell>
                        <TableCell>{lead.location || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Utilities */}
      <Card>
        <CardHeader>
          <CardTitle>Test Utilities</CardTitle>
          <CardDescription>
            Test calling and email functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Test Call */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <PhoneCall className="h-4 w-4" />
                Test Call
              </h4>
              <div className="space-y-2">
                <Label htmlFor="test-number">Phone Number (E164 format)</Label>
                <Input
                  id="test-number"
                  value={testCallData.number}
                  onChange={(e) => setTestCallData({ ...testCallData, number: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-lead-name">Lead Name (optional)</Label>
                <Input
                  id="test-lead-name"
                  value={testCallData.lead_name}
                  onChange={(e) => setTestCallData({ ...testCallData, lead_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <Button onClick={handleTestCall} disabled={isTestingCall} variant="outline" className="w-full">
                {isTestingCall ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Test Call
                  </>
                )}
              </Button>
            </div>

            {/* Test Email */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Test Email
              </h4>
              <div className="space-y-2">
                <Label htmlFor="test-email">Email Address</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmailData.to}
                  onChange={(e) => setTestEmailData({ ...testEmailData, to: e.target.value })}
                  placeholder="test@example.com"
                />
              </div>
              <Button onClick={handleTestEmail} disabled={isTestingEmail} variant="outline" className="w-full">
                {isTestingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Test Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};