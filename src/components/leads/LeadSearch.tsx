import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, Download, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdvancedLeadFilters, { AdvancedFilterPayload } from "./AdvancedLeadFilters";

interface LeadSearchProps {
  onResults: (leads: any[]) => void;
  onSearchStart: () => void;
  onSearchComplete: () => void;
  onSaveLeads: (leads: any[]) => Promise<boolean>;
}

export const LeadSearch = ({ onResults, onSearchStart, onSearchComplete, onSaveLeads }: LeadSearchProps) => {
  const [filters, setFilters] = useState({
    jobTitle: "",
    industry: "",
    location: "",
    company: "",
    seniorityLevel: "",
    department: "",
    companySize: "",
    currentCompanyOnly: false,
    yearsOfExperience: [0],
    numberOfLeads: [10],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchResults, setLastSearchResults] = useState<any[]>([]);
  const [lastExportLogId, setLastExportLogId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterPayload>({});
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    onSearchStart();
    
    console.log("Search filters:", filters);
    console.log("Advanced filters:", advancedFilters);
    
    try {
      // Build the complete filter payload matching SearchLeads API format
      const filterPayload = {
        filter: {
          // Person filters
          ...(filters.jobTitle && { person_titles: [filters.jobTitle] }),
          ...(filters.location && { person_locations: [filters.location] }),
          
          // Company filters
          ...(filters.industry && { organization_industry_display_name: [filters.industry] }),
          ...(filters.companySize && { organization_num_employees_enum: [filters.companySize] }),
          
          // Merge advanced filters - they override basic if both are set
          ...advancedFilters,
        },
        no_of_leads: filters.numberOfLeads[0],
        file_name: "lead_export"
      };

      console.log("Sending API request to backend");
      console.log("Request payload:", JSON.stringify(filterPayload, null, 2));

      // Get current user ID from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const response = await fetch("https://leads-automation-apel.onrender.com/api/searchleads/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
        },
        body: JSON.stringify(filterPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API request failed:", response.status, errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("API response:", data);
      
      // Capture log_id from response
      if (data.log_id) {
        setLastExportLogId(data.log_id);
        console.log("🔑 Captured log_id:", data.log_id);
      }

      // Handle different response formats
      let leads = [];
      if (Array.isArray(data)) {
        leads = data;
      } else if (data && Array.isArray(data.leads)) {
        leads = data.leads;
      } else if (data && Array.isArray(data.results)) {
        leads = data.results;
      } else if (data && typeof data === 'object') {
        // If it's an object, try to find an array property
        const arrayValues = Object.values(data).filter(value => Array.isArray(value));
        if (arrayValues.length > 0) {
          leads = arrayValues[0] as any[];
        }
      }

      console.log("Processed leads:", leads);
      setLastSearchResults(leads);

      if (leads && leads.length > 0) {
        // Limit to first 100 leads to prevent UI issues
        const limitedLeads = leads.slice(0, 100);
        onResults(limitedLeads);
        toast({
          title: "Search Complete",
          description: `Found ${leads.length} leads. Showing first ${limitedLeads.length}. Click "Save to Database" to persist results.`,
        });
        
        if (leads.length > 100) {
          toast({
            title: "Results Limited",
            description: `Found ${leads.length} leads but showing only the first 100 for performance.`,
            variant: "default",
          });
        }
      } else {
        onResults([]);
        setLastSearchResults([]);
        toast({
          title: "No Results",
          description: "No leads found matching your criteria.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      onResults([]);
      setLastSearchResults([]);
      
      let errorMessage = "Unable to connect to the lead search API.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      onSearchComplete();
    }
  };

  const handleSaveResults = async () => {
    if (lastSearchResults.length === 0) {
      toast({
        title: "No Results",
        description: "No search results to save. Please perform a search first.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const success = await onSaveLeads(lastSearchResults);
    if (success) {
      setLastSearchResults([]); // Clear results after saving
    }
    setIsSaving(false);
  };

  const industries = [
    "Technology",
    "Financial Services", 
    "Real Estate",
    "Healthcare",
    "Manufacturing",
    "Retail",
    "Consulting",
    "Education",
    "Energy",
    "Media & Communications",
    "Government",
    "Non-Profit",
    "Transportation",
    "Hospitality",
    "Legal Services"
  ];

  const seniorityLevels = [
    "Entry",
    "Associate", 
    "Manager",
    "Director",
    "VP",
    "C-Level",
    "Owner",
    "Partner"
  ];

  const departments = [
    "Sales",
    "Marketing",
    "Finance",
    "HR",
    "Operations",
    "IT",
    "Engineering",
    "Product",
    "Customer Success",
    "Legal",
    "Business Development",
    "Strategy"
  ];

  const companySizes = [
    "1-10",
    "11-50",
    "51-200", 
    "201-500",
    "501-1000",
    "1000+"
  ];

  return (
    <>
    {/* Export Log ID Display */}
    {lastExportLogId && (
      <Card className="border-2 border-primary mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            🔑 Latest Export Job ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm break-all">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-foreground">log_id:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(lastExportLogId);
                  toast({
                    title: "Copied!",
                    description: "Log ID copied to clipboard",
                  });
                }}
              >
                Copy
              </Button>
            </div>
            <div className="text-primary font-bold text-base">{lastExportLogId}</div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Use this log_id to track your export job status in the backend
          </p>
        </CardContent>
      </Card>
    )}
    
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Search className="h-5 w-5 mr-2 text-blue-600" />
          Lead Search & Filters
        </CardTitle>
        <CardDescription>
          Define your target criteria to find relevant prospects
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title / Keywords</Label>
              <Input
                id="jobTitle"
                placeholder="e.g., Wealth Manager, CEO, Marketing Director"
                value={filters.jobTitle}
                onChange={(e) => setFilters({...filters, jobTitle: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={filters.industry} onValueChange={(value) => setFilters({...filters, industry: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry.toLowerCase()}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, New York, United States"
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                placeholder="e.g., HSBC, Google, Microsoft"
                value={filters.company}
                onChange={(e) => setFilters({...filters, company: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Seniority Level</Label>
              <Select value={filters.seniorityLevel} onValueChange={(value) => setFilters({...filters, seniorityLevel: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {seniorityLevels.map((level) => (
                    <SelectItem key={level} value={level.toLowerCase()}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Department / Function</Label>
              <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept.toLowerCase()}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select value={filters.companySize} onValueChange={(value) => setFilters({...filters, companySize: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {companySizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size} employees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="currentCompanyOnly"
                  checked={filters.currentCompanyOnly}
                  onCheckedChange={(checked) => setFilters({...filters, currentCompanyOnly: checked as boolean})}
                />
                <Label htmlFor="currentCompanyOnly" className="text-sm font-normal">
                  Current Company Only
                </Label>
              </div>
            </div>
            
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label>Years of Experience: {filters.yearsOfExperience[0]}+ years</Label>
              <Slider
                value={filters.yearsOfExperience}
                onValueChange={(value) => setFilters({...filters, yearsOfExperience: value})}
                max={30}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0 years</span>
                <span>30+ years</span>
              </div>
            </div>
            
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label>Number of Leads: {filters.numberOfLeads[0]} leads</Label>
              <Slider
                value={filters.numberOfLeads}
                onValueChange={(value) => setFilters({...filters, numberOfLeads: value})}
                max={100}
                min={10}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>10 leads</span>
                <span>100 leads</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4 pt-4">
            <Button type="submit" disabled={isSearching} className="px-8 py-2 bg-blue-600 hover:bg-blue-700">
              {isSearching ? "Searching..." : "Search Leads"}
              <Search className="ml-2 h-4 w-4" />
            </Button>
            
            {lastSearchResults.length > 0 && (
              <Button 
                type="button" 
                onClick={handleSaveResults} 
                disabled={isSaving}
                className="px-8 py-2 bg-green-600 hover:bg-green-700"
              >
                {isSaving ? "Saving..." : "Save to Database"}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Active filters: {Object.entries(filters).filter(([key, value]) => {
                  if (key === 'yearsOfExperience') return value[0] > 0;
                  if (key === 'numberOfLeads') return value[0] > 10;
                  if (key === 'currentCompanyOnly') return value;
                  return value && value !== '';
                }).length}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {lastSearchResults.length > 0 && (
                <span className="text-green-600">
                  {lastSearchResults.length} leads ready to save
                </span>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
    
    <div className="mt-6">
      <AdvancedLeadFilters onFiltersChange={setAdvancedFilters} />
    </div>
    </>
  );
};
