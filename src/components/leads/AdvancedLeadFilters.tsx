import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Data from Google Sheets
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
  "entertainment", "electrical/electronic manufacturing", "leisure, travel & tourism",
  "professional training & coaching", "transportation/trucking/railroad",
  "law practice", "apparel & fashion", "architecture & planning",
  "mechanical or industrial engineering", "insurance", "telecommunications",
  "human resources", "staffing & recruiting", "sports", "legal services",
  "oil & energy", "media production", "machinery", "wholesale", "consumer goods",
  "music", "photography", "medical practice", "cosmetics", "environmental services",
  "graphic design", "business supplies & equipment", "renewables & environment",
  "facilities services", "publishing", "food production", "arts & crafts",
  "building materials", "civil engineering", "religious institutions",
  "public relations & communications", "higher education", "printing", "furniture",
  "mining & metals", "logistics & supply chain", "research", "pharmaceuticals",
  "individual & family services", "medical devices", "civic & social organization",
  "e-learning", "security & investigations", "chemicals", "government administration",
  "online media", "investment management", "farming", "writing & editing", "textiles",
  "mental health care", "primary/secondary education", "broadcast media",
  "biotechnology", "information services", "international trade & development",
  "motion pictures & film", "consumer electronics", "banking", "import & export",
  "industrial automation", "recreational facilities & services", "performing arts",
  "utilities", "sporting goods", "fine art", "airlines/aviation",
  "computer & network security", "maritime", "luxury goods & jewelry", "veterinary",
  "venture capital & private equity", "wine & spirits", "plastics",
  "aviation & aerospace", "commercial real estate", "computer games",
  "packaging & containers", "executive office", "computer hardware",
  "computer networking", "market research", "outsourcing/offshoring",
  "program development", "translation & localization", "philanthropy",
  "public safety", "alternative medicine", "museums & institutions", "warehousing",
  "defense & space", "newspapers", "paper & forest products", "law enforcement",
  "investment banking", "government relations", "fund-raising", "think tanks",
  "glass, ceramics & concrete", "capital markets", "semiconductors", "animation",
  "political organization", "package/freight delivery", "wireless",
  "international affairs", "public policy", "libraries", "gambling & casinos",
  "railroad manufacture", "ranching", "military", "fishery", "supermarkets",
  "dairy", "tobacco", "shipbuilding", "judiciary", "alternative dispute resolution",
  "nanotechnology", "agriculture", "legislative office"
];

// Sample of top technologies (searchable input will allow any value)
const TOP_TECHNOLOGIES = [
  "Google Analytics", "Salesforce", "HubSpot", "Marketo", "WordPress.org",
  "React", "AWS", "Microsoft Azure", "Shopify", "WooCommerce",
  "Mailchimp", "Zoom", "Slack", "Asana", "Trello", "Monday.com",
  "Zendesk", "Intercom", "Drift", "LinkedIn Marketing Solutions",
  "Facebook Pixel", "Google Tag Manager", "Hotjar", "Mixpanel", "Segment.io"
];

const SENIORITIES = ["owner", "founder", "c-suite", "vp", "director", "manager", "senior", "entry"];
const EMPLOYEE_RANGES = ["1,10", "11,50", "51,200", "201,500", "501,1000", "1001,5000", "5001,10000", "10001+"];
const FUNDING_STAGES = ["seed", "series a", "series b", "series c", "series d", "series e", "ipo", "acquired"];
const MARKET_SEGMENTS = ["b2b", "b2c", "b2b2c"];
const SORT_FIELDS = ["recommendations_score", "person_name", "organization_name", "person_seniority"];

export interface AdvancedFilterPayload {
  person_titles?: string[];
  person_not_titles?: string[];
  include_similar_titles?: boolean;
  person_seniorities?: string[];
  person_department_or_subdepartments?: string[];
  person_locations?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  organization_industry_display_name?: string[];
  organization_industry_not_display_name?: string[];
  q_organization_keyword_tags?: string[];
  included_organization_keyword_fields?: string[];
  q_organization_domains_list?: string[];
  q_organization_domains_exclude_list?: string[];
  currently_using_any_of_technology_uids?: string[];
  currently_not_using_any_of_technology_uids?: string[];
  revenue_range?: string;
  organization_founded_year_range?: string;
  organization_include_unknown_founded_year?: boolean;
  market_segments?: string[];
  q_organization_job_titles?: string[];
  organization_job_locations?: string[];
  Organization_latest_funding_stage_name?: string[];
  total_funding_range?: string;
  not_exist_fields?: string[];
  sort_ascending?: boolean;
  sort_by_field?: string;
  include_count?: boolean;
  fields?: string[];
}

interface AdvancedLeadFiltersProps {
  onFiltersChange: (filters: AdvancedFilterPayload) => void;
}

export default function AdvancedLeadFilters({ onFiltersChange }: AdvancedLeadFiltersProps) {
  const [filters, setFilters] = useState<AdvancedFilterPayload>({
    include_similar_titles: true,
    sort_ascending: true,
    sort_by_field: "recommendations_score",
    include_count: false
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    person: true,
    organization: false,
    technology: false,
    funding: false,
    sorting: false
  });

  // Helper functions for multi-value fields
  const addArrayValue = (field: keyof AdvancedFilterPayload, value: string) => {
    if (!value.trim()) return;
    const currentArray = (filters[field] as string[]) || [];
    if (!currentArray.includes(value)) {
      const updated = { ...filters, [field]: [...currentArray, value] };
      setFilters(updated);
      onFiltersChange(updated);
    }
  };

  const removeArrayValue = (field: keyof AdvancedFilterPayload, value: string) => {
    const currentArray = (filters[field] as string[]) || [];
    const updated = { ...filters, [field]: currentArray.filter(v => v !== value) };
    setFilters(updated);
    onFiltersChange(updated);
  };

  const updateField = (field: keyof AdvancedFilterPayload, value: any) => {
    const updated = { ...filters, [field]: value };
    setFilters(updated);
    onFiltersChange(updated);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const MultiSelectDropdown = ({ 
    field, 
    options, 
    label, 
    placeholder 
  }: { 
    field: keyof AdvancedFilterPayload; 
    options: string[]; 
    label: string; 
    placeholder: string;
  }) => {
    const [inputValue, setInputValue] = useState("");
    const currentValues = (filters[field] as string[]) || [];

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Select onValueChange={(value) => {
            addArrayValue(field, value);
            setInputValue("");
          }}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <ScrollArea className="h-[200px]">
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>
        {currentValues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {currentValues.map((value) => (
              <Badge key={value} variant="secondary" className="gap-1">
                {value}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeArrayValue(field, value)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  const TextArrayInput = ({
    field,
    label,
    placeholder
  }: {
    field: keyof AdvancedFilterPayload;
    label: string;
    placeholder: string;
  }) => {
    const [inputValue, setInputValue] = useState("");
    const currentValues = (filters[field] as string[]) || [];

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
            {currentValues.map((value) => (
              <Badge key={value} variant="secondary" className="gap-1">
                {value}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeArrayValue(field, value)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Lead Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Person Filters */}
        <Collapsible open={expandedSections.person} onOpenChange={() => toggleSection("person")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
            <h3 className="font-semibold">Person Filters</h3>
            {expandedSections.person ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <TextArrayInput
              field="person_titles"
              label="Job Titles (Include)"
              placeholder="e.g., CEO, CFO, CTO"
            />
            
            <TextArrayInput
              field="person_not_titles"
              label="Job Titles (Exclude)"
              placeholder="e.g., Intern, Assistant"
            />

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
              label="Departments"
              placeholder="Select department..."
            />

            <TextArrayInput
              field="person_locations"
              label="Person Locations"
              placeholder="e.g., US, New York, CA"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Organization Filters */}
        <Collapsible open={expandedSections.organization} onOpenChange={() => toggleSection("organization")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
            <h3 className="font-semibold">Organization Filters</h3>
            {expandedSections.organization ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <TextArrayInput
              field="organization_locations"
              label="Organization Locations"
              placeholder="e.g., US, UK, CA"
            />

            <MultiSelectDropdown
              field="organization_num_employees_ranges"
              options={EMPLOYEE_RANGES}
              label="Employee Count Ranges"
              placeholder="Select range..."
            />

            <MultiSelectDropdown
              field="organization_industry_display_name"
              options={INDUSTRIES}
              label="Industries (Include)"
              placeholder="Select industry..."
            />

            <MultiSelectDropdown
              field="organization_industry_not_display_name"
              options={INDUSTRIES}
              label="Industries (Exclude)"
              placeholder="Select industry to exclude..."
            />

            <TextArrayInput
              field="q_organization_keyword_tags"
              label="Organization Keywords"
              placeholder="e.g., SaaS, Cloud, AI"
            />

            <TextArrayInput
              field="q_organization_domains_list"
              label="Domains (Include)"
              placeholder="e.g., google.com, microsoft.com"
            />

            <TextArrayInput
              field="q_organization_domains_exclude_list"
              label="Domains (Exclude)"
              placeholder="e.g., example.com"
            />

            <div className="space-y-2">
              <Label>Revenue Range (Minimum USD)</Label>
              <Input
                type="number"
                placeholder="e.g., 1000000 for $1M+"
                value={filters.revenue_range || ""}
                onChange={(e) => updateField("revenue_range", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Founded Year (Minimum)</Label>
              <Input
                type="number"
                placeholder="e.g., 2015"
                value={filters.organization_founded_year_range || ""}
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

            <MultiSelectDropdown
              field="market_segments"
              options={MARKET_SEGMENTS}
              label="Market Segments"
              placeholder="Select segment..."
            />

            <TextArrayInput
              field="q_organization_job_titles"
              label="Job Titles at Organization"
              placeholder="e.g., Software Engineer"
            />

            <TextArrayInput
              field="organization_job_locations"
              label="Job Locations"
              placeholder="e.g., CA, NY"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Technology Filters */}
        <Collapsible open={expandedSections.technology} onOpenChange={() => toggleSection("technology")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
            <h3 className="font-semibold">Technology Filters</h3>
            {expandedSections.technology ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <TextArrayInput
              field="currently_using_any_of_technology_uids"
              label="Technologies Currently Using"
              placeholder="e.g., Salesforce, HubSpot, React"
            />

            <TextArrayInput
              field="currently_not_using_any_of_technology_uids"
              label="Technologies NOT Using"
              placeholder="e.g., WordPress, Magento"
            />

            <div className="text-sm text-muted-foreground">
              Common technologies: {TOP_TECHNOLOGIES.slice(0, 5).join(", ")}, etc.
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Funding Filters */}
        <Collapsible open={expandedSections.funding} onOpenChange={() => toggleSection("funding")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
            <h3 className="font-semibold">Funding Filters</h3>
            {expandedSections.funding ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <MultiSelectDropdown
              field="Organization_latest_funding_stage_name"
              options={FUNDING_STAGES}
              label="Latest Funding Stage"
              placeholder="Select stage..."
            />

            <div className="space-y-2">
              <Label>Total Funding Range (Minimum USD)</Label>
              <Input
                type="number"
                placeholder="e.g., 1000000 for $1M+"
                value={filters.total_funding_range || ""}
                onChange={(e) => updateField("total_funding_range", e.target.value)}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Sorting & Output Options */}
        <Collapsible open={expandedSections.sorting} onOpenChange={() => toggleSection("sorting")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
            <h3 className="font-semibold">Sorting & Output Options</h3>
            {expandedSections.sorting ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Sort By Field</Label>
              <Select
                value={filters.sort_by_field}
                onValueChange={(value) => updateField("sort_by_field", value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {SORT_FIELDS.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
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
              <Label htmlFor="include_count">Include Count in Response</Label>
            </div>

            <TextArrayInput
              field="not_exist_fields"
              label="Exclude Leads with These Fields"
              placeholder="e.g., spam_email, invalid_phone"
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
