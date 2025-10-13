import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Lead {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  title?: string;
  jobTitle?: string;
  companyName?: string;
  company?: string;
  email?: string;
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  workPhone?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  source?: string;
}

interface NaturalLanguageLeadSearchProps {
  onSaveLeads?: (leads: Lead[]) => Promise<boolean | void>;
}

export const NaturalLanguageLeadSearch = ({ onSaveLeads }: NaturalLanguageLeadSearchProps) => {
  const [prompt, setPrompt] = useState("");
  const [leadCount, setLeadCount] = useState(50);
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastCount, setLastCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [placeholder, setPlaceholder] = useState("e.g., ");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const ROWS_PER_PAGE = 50;

  useEffect(() => {
    const examples = [
      "Finance Manager in USA",
      "Lawyer in UK",
      "Software CEO in Dubai",
      "Real Estate Agent in Canada",
      "Marketing Director in Singapore",
      "Tech Founder in Germany"
    ];

    let i = 0;
    let j = 0;
    let current = "";
    let deleting = false;
    let timeoutId: NodeJS.Timeout;

    function typeLoop() {
      const el = textareaRef.current;
      if (!el || document.activeElement === el) {
        timeoutId = setTimeout(typeLoop, 1000);
        return;
      }

      if (!deleting && j < examples[i].length) {
        current += examples[i][j++];
      } else if (deleting && j > 0) {
        current = current.slice(0, --j);
      } else if (!deleting && j === examples[i].length) {
        deleting = true;
        timeoutId = setTimeout(typeLoop, 1500);
        return;
      } else if (deleting && j === 0) {
        deleting = false;
        i = (i + 1) % examples.length;
      }

      setPlaceholder(`e.g., ${current}`);
      timeoutId = setTimeout(typeLoop, deleting ? 40 : 80);
    }

    typeLoop();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const getLeadName = (lead: Lead): string => {
    return lead.fullName || 
      [lead.firstName, lead.lastName].filter(Boolean).join(" ") || 
      lead.name || 
      "";
  };

  const getLeadTitle = (lead: Lead): string => {
    return lead.title || lead.jobTitle || "";
  };

  const getLeadCompany = (lead: Lead): string => {
    return lead.companyName || lead.company || "";
  };

  const getLeadEmail = (lead: Lead): string => {
    return lead.email || lead.workEmail || lead.personalEmail || "";
  };

  const getLeadPhone = (lead: Lead): string => {
    return lead.phone || lead.workPhone || "";
  };

  const getLeadLocation = (lead: Lead): string => {
    return lead.location || 
      [lead.city, lead.state, lead.country].filter(Boolean).join(", ") || 
      "";
  };

  const getLeadSource = (lead: Lead): string => {
    return lead.source || "";
  };

  const handleSearch = async () => {
    const trimmedPrompt = prompt.trim();
    
    if (!trimmedPrompt) {
      toast({
        title: "Prompt Required",
        description: "Please enter a search prompt.",
        variant: "destructive",
      });
      return;
    }

    // Clamp to allowed range
    const clampedCount = Math.max(10, Math.min(100, leadCount));

    setIsSearching(true);

    try {
      const response = await fetch("https://leads-automation-apel.onrender.com/api/scrape-leads-nl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: trimmedPrompt, count: clampedCount }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = (data && typeof data.error === "string") ? data.error : "Search failed.";
        throw new Error(errorMessage);
      }

      // Backend returns an array of lead objects
      const items = Array.isArray(data) ? data : [];
      
      setLeads(items);
      setLastPrompt(trimmedPrompt);
      setLastCount(clampedCount);
      setCurrentPage(1);

      if (items.length === 0) {
        toast({
          title: "No Results",
          description: "No leads matched. Try broadening the prompt (e.g., include multiple titles or a larger region).",
          variant: "default",
        });
      } else {
        // Automatically save leads to database for review
        let saveSuccess: boolean | void = false;
        let saveError = null;
        
        if (onSaveLeads) {
          try {
            console.log('💾 Attempting to save', items.length, 'leads to database...');
            saveSuccess = await onSaveLeads(items);
            console.log('💾 Save completed. Success:', saveSuccess);
          } catch (err) {
            console.error('💾 Save failed with error:', err);
            saveError = err;
          }
        } else {
          console.error('💾 CRITICAL: onSaveLeads function is not defined!');
        }
        
        if (saveSuccess) {
          toast({
            title: "Success!",
            description: `Found and saved ${items.length} lead(s) for review.`,
          });
        } else {
          toast({
            title: "Search Complete",
            description: saveError 
              ? `Found ${items.length} lead(s) but failed to save: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`
              : `Found ${items.length} lead(s) but save failed. Check console for details.`,
            variant: saveError ? "destructive" : "default",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Search Failed",
        description: err instanceof Error ? err.message : "Something went wrong while searching.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadCSV = () => {
    if (leads.length === 0) return;

    const headers = ["Name", "Title", "Company", "Email", "Phone", "Location", "Source"];
    const csvRows = [
      headers.join(","),
      ...leads.map(lead => [
        `"${getLeadName(lead).replace(/"/g, '""')}"`,
        `"${getLeadTitle(lead).replace(/"/g, '""')}"`,
        `"${getLeadCompany(lead).replace(/"/g, '""')}"`,
        `"${getLeadEmail(lead).replace(/"/g, '""')}"`,
        `"${getLeadPhone(lead).replace(/"/g, '""')}"`,
        `"${getLeadLocation(lead).replace(/"/g, '""')}"`,
        `"${getLeadSource(lead).replace(/"/g, '""')}"`,
      ].join(","))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(leads.length / ROWS_PER_PAGE);
  const paginatedLeads = leads.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Search className="h-5 w-5 mr-2 text-primary" />
          Natural-Language Lead Search
        </CardTitle>
        <CardDescription>
          Type what you want. We'll translate it into filters automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Search Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nlPrompt">Search prompt</Label>
              <Textarea
                id="nlPrompt"
                ref={textareaRef}
                placeholder={placeholder}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadCount">Number of leads</Label>
              <Input
                id="leadCount"
                type="number"
                min={10}
                max={100}
                step={10}
                value={leadCount}
                onChange={(e) => setLeadCount(Number(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Allowed range: 10–100.
              </p>
            </div>

            <Button
              id="btnSearch"
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full sm:w-auto"
            >
              {isSearching ? "Searching…" : "Search Leads"}
              <Search className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Results Section */}
          {leads.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Results — {leads.length} lead(s) for "{lastPrompt}"
                </p>
                <Button
                  onClick={handleDownloadCSV}
                  variant="outline"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLeads.map((lead, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{getLeadName(lead)}</TableCell>
                          <TableCell>{getLeadTitle(lead)}</TableCell>
                          <TableCell>{getLeadCompany(lead)}</TableCell>
                          <TableCell>{getLeadEmail(lead)}</TableCell>
                          <TableCell>{getLeadPhone(lead)}</TableCell>
                          <TableCell>{getLeadLocation(lead)}</TableCell>
                          <TableCell>{getLeadSource(lead)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State - Tips */}
          {leads.length === 0 && !isSearching && lastPrompt && (
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">No results found. Try these tips:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Broaden titles (e.g., CEO OR President).</li>
                  <li>Loosen geography (e.g., United States instead of a specific city).</li>
                  <li>Try adding a function/department word (e.g., Finance, Marketing).</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
