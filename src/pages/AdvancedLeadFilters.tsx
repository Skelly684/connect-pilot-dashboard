import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ChevronDown, ChevronUp, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useSearchLeadsExport } from "@/hooks/useSearchLeadsExport";

const SENIORITIES = ["owner", "founder", "c-suite", "vp", "director", "manager", "senior", "entry"];
const EMPLOYEE_RANGES = ["1,10", "11,50", "51,200", "201,500", "501,1000", "1001,5000", "5001,10000", "10001+"];
const FUNDING_STAGES = ["seed", "series a", "series b", "series c", "series d", "series e", "ipo", "acquired"];
const MARKET_SEGMENTS = ["b2b", "b2c", "b2b2c"];
const SORT_FIELDS = ["recommendations_score", "person_name", "organization_name", "person_seniority", "employee_count"];
const KEYWORD_FIELDS = ["name", "description", "domain"];
const EXPORT_FIELDS = ["id", "email", "person_name", "title", "company_name", "linkedin_url", "phone"];


const DEPARTMENTS = [
  "C-Suite", "Product", "Engineering & Technical", "Design", "Education",
  "Finance", "Human Resources", "Information Technology", "Legal", "Marketing",
  "Medical & Health", "Operations", "Sales", "Consulting"
];

const INDUSTRIES = [
  "information technology & services", "construction", "marketing & advertising",
  "real estate", "health, wellness & fitness", "management consulting",
  "computer software", "internet", "retail", "financial services",
  "consumer services", "hospital & health care", "automotive", "restaurants",
  "education management", "food & beverages", "design", "hospitality",
  "accounting", "events services", "nonprofit organization management",
  "entertainment", "electrical/electronic manufacturing", "leisure, travel & tourism"
];

export default function AdvancedLeadFilters() {
  const { toast } = useToast();
  const { createExport, pendingExports } = useSearchLeadsExport();
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    person: true,
    company: false,
    technology: false,
    financials: false,
    market: false,
    sorting: false,
  });

  const [noOfLeads, setNoOfLeads] = useState(100);
  const [fileName, setFileName] = useState("lead_export");

  // Filter state
  const [filters, setFilters] = useState<any>({
    person_titles: [],
    person_not_titles: [],
    include_similar_titles: true,
    person_seniorities: [],
    person_department_or_subdepartments: [],
    person_locations: [],
    organization_locations: [],
    organization_num_employees_ranges: [],
    organization_industry_display_name: [],
    organization_industry_not_display_name: [],
    q_organization_keyword_tags: [],
    included_organization_keyword_fields: [],
    q_organization_domains_list: [],
    q_organization_domains_exclude_list: [],
    currently_using_any_of_technology_uids: [],
    currently_not_using_any_of_technology_uids: [],
    revenue_range: "",
    organization_founded_year_range: "",
    organization_include_unknown_founded_year: false,
    market_segments: [],
    q_organization_job_titles: [],
    organization_job_locations: [],
    Organization_latest_funding_stage_name: [],
    total_funding_range: "",
    not_exist_fields: [],
    sort_ascending: true,
    sort_by_field: "recommendations_score",
    include_count: false,
    fields: [],
  });

  const addArrayValue = (field: string, value: string) => {
    if (!value.trim()) return;
    const currentArray = filters[field] || [];
    if (!currentArray.includes(value)) {
      setFilters({ ...filters, [field]: [...currentArray, value] });
    }
  };

  const removeArrayValue = (field: string, value: string) => {
    const currentArray = filters[field] || [];
    setFilters({ ...filters, [field]: currentArray.filter((v: string) => v !== value) });
  };

  const updateField = (field: string, value: any) => {
    setFilters({ ...filters, [field]: value });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const buildPayload = (includeMeta: boolean = false) => {
    // Clean up filters - remove empty values
    const cleanedFilters: any = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        cleanedFilters[key] = value;
      } else if (typeof value === "string" && value.trim() !== "") {
        cleanedFilters[key] = value;
      } else if (typeof value === "boolean") {
        cleanedFilters[key] = value;
      }
    });

    const payload: any = { filter: cleanedFilters };
    
    if (includeMeta) {
      payload.no_of_leads = noOfLeads;
      payload.file_name = fileName;
    }

    return payload;
  };


  const handleExport = async () => {
    setIsLoading(true);
    try {
      const payload = buildPayload(false);
      await createExport(payload.filter, noOfLeads, fileName);
      
      toast({
        title: "Export Created ✅",
        description: `${fileName} export created. Check the "Pending Exports" section below.`,
        duration: 10000,
      });
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const TextArrayInput = ({ field, label, placeholder }: { field: string; label: string; placeholder: string }) => {
    const [inputValue, setInputValue] = useState("");
    const currentValues = filters[field] || [];

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addArrayValue(field, inputValue);
                setInputValue("");
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              addArrayValue(field, inputValue);
              setInputValue("");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {currentValues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {currentValues.map((value: string) => (
              <Badge key={value} variant="secondary" className="gap-1">
                {value}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeArrayValue(field, value)} />
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  const MultiSelectDropdown = ({ field, options, label, placeholder }: { field: string; options: string[]; label: string; placeholder: string }) => {
    const currentValues = filters[field] || [];

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Select onValueChange={(value) => addArrayValue(field, value)}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <ScrollArea className="h-[200px]">
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
        {currentValues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {currentValues.map((value: string) => (
              <Badge key={value} variant="secondary" className="gap-1">
                {value}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeArrayValue(field, value)} />
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Advanced Lead Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Person Filters */}
          <Collapsible open={expandedSections.person} onOpenChange={() => toggleSection("person")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <h3 className="font-semibold">👤 Person Filters</h3>
              {expandedSections.person ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <TextArrayInput field="person_titles" label="Job Titles to Include" placeholder="e.g., CEO, CFO, Director" />
              <TextArrayInput field="person_not_titles" label="Exclude Job Titles" placeholder="e.g., Intern, Assistant" />
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_similar_titles"
                  checked={filters.include_similar_titles}
                  onCheckedChange={(checked) => updateField("include_similar_titles", checked)}
                />
                <Label htmlFor="include_similar_titles">Include Similar Titles</Label>
              </div>

              <MultiSelectDropdown
                field="person_seniorities"
                options={SENIORITIES}
                label="Seniority Levels"
                placeholder="Select seniority..."
              />

              <MultiSelectDropdown
                field="person_department_or_subdepartments"
                options={DEPARTMENTS}
                label="Departments / Subdepartments"
                placeholder="Select department..."
              />

              <TextArrayInput field="person_locations" label="Person Locations" placeholder="e.g., United States, New York" />
            </CollapsibleContent>
          </Collapsible>

          {/* Company Filters */}
          <Collapsible open={expandedSections.company} onOpenChange={() => toggleSection("company")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <h3 className="font-semibold">🏢 Company Filters</h3>
              {expandedSections.company ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <TextArrayInput field="organization_locations" label="Company Location(s)" placeholder="e.g., United States, California" />

              <MultiSelectDropdown
                field="organization_num_employees_ranges"
                options={EMPLOYEE_RANGES}
                label="Company Size (Employees)"
                placeholder="Select range..."
              />

              <MultiSelectDropdown
                field="organization_industry_display_name"
                options={INDUSTRIES}
                label="Industry (Include)"
                placeholder="Select industry..."
              />

              <MultiSelectDropdown
                field="organization_industry_not_display_name"
                options={INDUSTRIES}
                label="Industry (Exclude)"
                placeholder="Select industry to exclude..."
              />

              <div className="space-y-2">
                <Label>Founded Year Range (Minimum)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 2015"
                  value={filters.organization_founded_year_range}
                  onChange={(e) => updateField("organization_founded_year_range", e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_unknown_founded"
                  checked={filters.organization_include_unknown_founded_year}
                  onCheckedChange={(checked) => updateField("organization_include_unknown_founded_year", checked)}
                />
                <Label htmlFor="include_unknown_founded">Include Unknown Founded Year</Label>
              </div>

              <TextArrayInput field="organization_job_locations" label="Company Job Locations" placeholder="e.g., CA, NY" />
            </CollapsibleContent>
          </Collapsible>

          {/* Technology & Keywords */}
          <Collapsible open={expandedSections.technology} onOpenChange={() => toggleSection("technology")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <h3 className="font-semibold">💻 Technology & Keywords</h3>
              {expandedSections.technology ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <TextArrayInput
                field="currently_using_any_of_technology_uids"
                label="Technologies Used (Include)"
                placeholder="e.g., Salesforce, HubSpot, React"
              />

              <TextArrayInput
                field="currently_not_using_any_of_technology_uids"
                label="Technologies Not Used (Exclude)"
                placeholder="e.g., Legacy CRM"
              />

              <TextArrayInput field="q_organization_keyword_tags" label="Keyword Tags" placeholder="e.g., SaaS, Cloud, AI" />

              <MultiSelectDropdown
                field="included_organization_keyword_fields"
                options={KEYWORD_FIELDS}
                label="Search Keywords In"
                placeholder="Select fields..."
              />

              <TextArrayInput
                field="q_organization_domains_list"
                label="Include Specific Domains"
                placeholder="e.g., google.com, microsoft.com"
              />

              <TextArrayInput
                field="q_organization_domains_exclude_list"
                label="Exclude Domains"
                placeholder="e.g., example.com"
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Financials & Growth */}
          <Collapsible open={expandedSections.financials} onOpenChange={() => toggleSection("financials")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <h3 className="font-semibold">💰 Financials & Growth</h3>
              {expandedSections.financials ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Revenue Range (Minimum USD)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 1000000 for $1M+"
                  value={filters.revenue_range}
                  onChange={(e) => updateField("revenue_range", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Funding Amount Range (Minimum USD)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 1000000"
                  value={filters.total_funding_range}
                  onChange={(e) => updateField("total_funding_range", e.target.value)}
                />
              </div>

              <MultiSelectDropdown
                field="Organization_latest_funding_stage_name"
                options={FUNDING_STAGES}
                label="Funding Stage"
                placeholder="Select stage..."
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Market & Segmentation */}
          <Collapsible open={expandedSections.market} onOpenChange={() => toggleSection("market")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <h3 className="font-semibold">📈 Market & Segmentation</h3>
              {expandedSections.market ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <MultiSelectDropdown
                field="market_segments"
                options={MARKET_SEGMENTS}
                label="Market Segment"
                placeholder="Select segment..."
              />

              <TextArrayInput
                field="q_organization_job_titles"
                label="Job Titles Within Companies"
                placeholder="e.g., Software Engineer"
              />

              <TextArrayInput field="not_exist_fields" label="Exclude if Field Exists" placeholder="e.g., spam_email" />
            </CollapsibleContent>
          </Collapsible>

          {/* Sorting & Meta */}
          <Collapsible open={expandedSections.sorting} onOpenChange={() => toggleSection("sorting")}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <h3 className="font-semibold">⚙️ Sorting & Output</h3>
              {expandedSections.sorting ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Sort Results By</Label>
                <Select value={filters.sort_by_field} onValueChange={(value) => updateField("sort_by_field", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sort field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sort_ascending"
                  checked={filters.sort_ascending}
                  onCheckedChange={(checked) => updateField("sort_ascending", checked)}
                />
                <Label htmlFor="sort_ascending">Sort Ascending</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_count"
                  checked={filters.include_count}
                  onCheckedChange={(checked) => updateField("include_count", checked)}
                />
                <Label htmlFor="include_count">Include Count Only</Label>
              </div>

              <MultiSelectDropdown
                field="fields"
                options={EXPORT_FIELDS}
                label="Fields to Include in Export"
                placeholder="Select fields..."
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Export Configuration */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">📦 Export Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Number of Leads to Export</Label>
                <Input
                  type="number"
                  value={noOfLeads}
                  onChange={(e) => setNoOfLeads(parseInt(e.target.value) || 100)}
                  min={100}
                  max={1000}
                />
              </div>

              <div className="space-y-2">
                <Label>Export File Name</Label>
                <Input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="lead_export"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleExport}
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              {isLoading ? "Processing..." : "Get Leads"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Exports Section */}
      {pendingExports.length > 0 && (
        <Card className="border-0 shadow-sm mt-6">
          <CardHeader>
            <CardTitle>Pending Exports</CardTitle>
            <p className="text-sm text-muted-foreground">
              Lead searches currently being processed by SearchLeads
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingExports.map((job) => (
                <div 
                  key={job.log_id} 
                  className="p-4 border rounded-lg bg-muted/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="animate-pulse">
                        Processing
                      </Badge>
                      <span className="font-semibold">{job.file_name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {job.summary && typeof job.summary === 'object' && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Filters:</span>
                      <div className="mt-1 space-y-1">
                        {Object.entries(job.summary as Record<string, any>).map(([key, value]) => {
                          if (Array.isArray(value) && value.length > 0) {
                            return (
                              <div key={key} className="flex gap-2">
                                <span className="text-muted-foreground/70">{key.replace(/_/g, ' ')}:</span>
                                <span>{value.join(', ')}</span>
                              </div>
                            );
                          } else if (typeof value === 'string' && value) {
                            return (
                              <div key={key} className="flex gap-2">
                                <span className="text-muted-foreground/70">{key.replace(/_/g, ' ')}:</span>
                                <span>{value}</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs font-mono text-muted-foreground">
                    log_id: {job.log_id}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
