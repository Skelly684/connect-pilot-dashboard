import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ApifyFiltersProps {
  onFiltersChange: (filters: any) => void;
}

const SENIORITY_LEVELS = [
  { label: "Founder", value: "founder" },
  { label: "Owner", value: "owner" },
  { label: "C-Suite", value: "c_suite" },
  { label: "Director", value: "director" },
  { label: "Partner", value: "partner" },
  { label: "VP", value: "vp" },
  { label: "Head", value: "head" },
  { label: "Manager", value: "manager" },
  { label: "Senior", value: "senior" },
  { label: "Entry", value: "entry" },
  { label: "Trainee", value: "trainee" }
];

const FUNCTIONAL_LEVELS = [
  { label: "Sales", value: "sales" },
  { label: "Marketing", value: "marketing" },
  { label: "Engineering", value: "engineering" },
  { label: "Operations", value: "operations" },
  { label: "HR", value: "hr" },
  { label: "Finance", value: "finance" },
  { label: "Legal", value: "legal" },
  { label: "IT", value: "it" },
  { label: "Customer Success", value: "customer_success" }
];

const EMAIL_STATUS = [
  { label: "Validated", value: "validated" }
];

const COMPANY_SIZES = [
  { label: "0-1", value: "0-1" },
  { label: "2-10", value: "2-10" },
  { label: "11-20", value: "11-20" },
  { label: "21-50", value: "21-50" },
  { label: "51-100", value: "51-100" },
  { label: "101-200", value: "101-200" },
  { label: "201-500", value: "201-500" },
  { label: "501-1000", value: "501-1000" },
  { label: "1001-2000", value: "1001-2000" },
  { label: "2001-5000", value: "2001-5000" },
  { label: "10000+", value: "10000+" }
];

const REVENUE_OPTIONS = ["100K", "500K", "1M", "5M", "10M", "25M", "50M", "100M", "500M", "1B", "5B", "10B"];

const FUNDING_ROUNDS = [
  { label: "Seed", value: "seed" },
  { label: "Series A", value: "series_a" },
  { label: "Series B", value: "series_b" },
  { label: "Series C", value: "series_c" },
  { label: "Series D+", value: "series_d_plus" },
  { label: "IPO", value: "ipo" },
  { label: "Acquired", value: "acquired" }
];

export function ApifyLeadFilters({ onFiltersChange }: ApifyFiltersProps) {
  const [filters, setFilters] = useState<any>({
    fetch_count: 50000,
    file_name: "Prospects",
    contact_job_title: [],
    contact_not_job_title: [],
    seniority_level: [],
    functional_level: [],
    contact_location: [],
    contact_city: [],
    contact_not_location: [],
    contact_not_city: [],
    email_status: [],
    company_domain: [],
    size: [],
    company_industry: [],
    company_not_industry: [],
    company_keywords: [],
    company_not_keywords: [],
    min_revenue: "",
    max_revenue: "",
    funding: [],
  });

  const [tempInputs, setTempInputs] = useState<Record<string, string>>({});

  // Clean up any invalid filter values on mount (from old cached data)
  useEffect(() => {
    const validSeniorityValues = SENIORITY_LEVELS.map(s => s.value);
    const validFunctionalValues = FUNCTIONAL_LEVELS.map(f => f.value);
    const validSizeValues = COMPANY_SIZES.map(c => c.value);
    const validFundingValues = FUNDING_ROUNDS.map(f => f.value);
    
    const cleanedFilters = {
      ...filters,
      seniority_level: (filters.seniority_level || []).filter((v: string) => validSeniorityValues.includes(v)),
      functional_level: (filters.functional_level || []).filter((v: string) => validFunctionalValues.includes(v)),
      size: (filters.size || []).filter((v: string) => validSizeValues.includes(v)),
      funding: (filters.funding || []).filter((v: string) => validFundingValues.includes(v)),
    };
    
    // Only update if something changed
    if (JSON.stringify(cleanedFilters) !== JSON.stringify(filters)) {
      setFilters(cleanedFilters);
      onFiltersChange(cleanedFilters);
    }
  }, []); // Run once on mount

  const updateFilters = (newFilters: any) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const addArrayValue = (field: string, value: string) => {
    if (!value.trim()) return;
    const current = filters[field] || [];
    if (!current.includes(value.trim())) {
      updateFilters({
        ...filters,
        [field]: [...current, value.trim()],
      });
    }
    setTempInputs({ ...tempInputs, [field]: "" });
  };

  const removeArrayValue = (field: string, value: string) => {
    updateFilters({
      ...filters,
      [field]: (filters[field] || []).filter((v: string) => v !== value),
    });
  };

  const toggleCheckbox = (field: string, value: string) => {
    const current = filters[field] || [];
    if (current.includes(value)) {
      updateFilters({
        ...filters,
        [field]: current.filter((v: string) => v !== value),
      });
    } else {
      updateFilters({
        ...filters,
        [field]: [...current, value],
      });
    }
  };

  const TextArrayInput = ({ field, label, placeholder }: { field: string; label: string; placeholder: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={tempInputs[field] || ""}
          onChange={(e) => setTempInputs({ ...tempInputs, [field]: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addArrayValue(field, tempInputs[field] || "");
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => addArrayValue(field, tempInputs[field] || "")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {(filters[field] || []).map((value: string) => (
          <Badge key={value} variant="secondary" className="flex items-center gap-1">
            {value}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => removeArrayValue(field, value)}
            />
          </Badge>
        ))}
      </div>
    </div>
  );

  const CheckboxGroup = ({ field, label, options }: { field: string; label: string; options: Array<{label: string, value: string}> }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`${field}-${option.value}`}
              checked={(filters[field] || []).includes(option.value)}
              onCheckedChange={() => toggleCheckbox(field, option.value)}
            />
            <Label htmlFor={`${field}-${option.value}`} className="text-sm font-normal cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  const clearAllFilters = () => {
    const resetFilters = {
      fetch_count: 50000,
      file_name: "Prospects",
      contact_job_title: [],
      contact_not_job_title: [],
      seniority_level: [],
      functional_level: [],
      contact_location: [],
      contact_city: [],
      contact_not_location: [],
      contact_not_city: [],
      email_status: [],
      company_domain: [],
      size: [],
      company_industry: [],
      company_not_industry: [],
      company_keywords: [],
      company_not_keywords: [],
      min_revenue: "",
      max_revenue: "",
      funding: [],
    };
    setFilters(resetFilters);
    onFiltersChange(resetFilters);
    setTempInputs({});
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lead Filters</CardTitle>
            <CardDescription>Configure advanced filtering for lead generation</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Number of Leads</Label>
            <Input
              type="number"
              min={1}
              max={50000}
              value={filters.fetch_count}
              onChange={(e) => updateFilters({ ...filters, fetch_count: parseInt(e.target.value) || 50000 })}
            />
          </div>

          <div className="space-y-2">
            <Label>File Name</Label>
            <Input
              value={filters.file_name}
              onChange={(e) => updateFilters({ ...filters, file_name: e.target.value })}
            />
          </div>
        </div>

        <TextArrayInput field="contact_job_title" label="Job Titles (Include)" placeholder="e.g., CEO, CFO, Marketing Director" />
        <TextArrayInput field="contact_not_job_title" label="Job Titles (Exclude)" placeholder="e.g., Intern, Assistant" />

        <CheckboxGroup field="seniority_level" label="Seniority Level" options={SENIORITY_LEVELS} />
        <CheckboxGroup field="functional_level" label="Functional Level" options={FUNCTIONAL_LEVELS} />

        <TextArrayInput field="contact_location" label="Locations (Include)" placeholder="e.g., United States, United Kingdom" />
        <TextArrayInput field="contact_city" label="Cities (Include)" placeholder="e.g., New York, London" />
        <TextArrayInput field="contact_not_location" label="Locations (Exclude)" placeholder="e.g., India, China" />
        <TextArrayInput field="contact_not_city" label="Cities (Exclude)" placeholder="e.g., Mumbai, Beijing" />

        <CheckboxGroup field="email_status" label="Email Status" options={EMAIL_STATUS} />

        <TextArrayInput field="company_domain" label="Company Domains" placeholder="e.g., microsoft.com, google.com" />
        <CheckboxGroup field="size" label="Company Size" options={COMPANY_SIZES} />

        <TextArrayInput field="company_industry" label="Industries (Include)" placeholder="e.g., Technology, Finance" />
        <TextArrayInput field="company_not_industry" label="Industries (Exclude)" placeholder="e.g., Retail, Healthcare" />

        <TextArrayInput field="company_keywords" label="Company Keywords (Include)" placeholder="e.g., SaaS, Cloud, AI" />
        <TextArrayInput field="company_not_keywords" label="Company Keywords (Exclude)" placeholder="e.g., Consulting, Agency" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Min Revenue</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={filters.min_revenue}
              onChange={(e) => updateFilters({ ...filters, min_revenue: e.target.value })}
            >
              <option value="">Select minimum revenue</option>
              {REVENUE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Max Revenue</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={filters.max_revenue}
              onChange={(e) => updateFilters({ ...filters, max_revenue: e.target.value })}
            >
              <option value="">Select maximum revenue</option>
              {REVENUE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <CheckboxGroup field="funding" label="Funding Round" options={FUNDING_ROUNDS} />
      </CardContent>
    </Card>
  );
}
