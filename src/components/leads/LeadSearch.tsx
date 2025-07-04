import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const LeadSearch = () => {
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
    numberOfLeads: [100],
  });
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    
    console.log("Search filters:", filters);
    
    // Simulate search - replace with actual Apify integration
    setTimeout(() => {
      setIsSearching(false);
      toast({
        title: "Search Complete",
        description: "Found 147 matching leads. Results displayed below.",
      });
    }, 2000);
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
                max={5000}
                min={100}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>100 leads</span>
                <span>5000 leads</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center pt-4">
            <Button type="submit" disabled={isSearching} className="px-8 py-2 bg-blue-600 hover:bg-blue-700">
              {isSearching ? "Searching..." : "Search Leads"}
              <Search className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Active filters: {Object.entries(filters).filter(([key, value]) => {
                  if (key === 'yearsOfExperience') return value[0] > 0;
                  if (key === 'numberOfLeads') return value[0] > 100;
                  if (key === 'currentCompanyOnly') return value;
                  return value && value !== '';
                }).length}
              </span>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
