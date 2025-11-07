import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { ApifyLeadFilters } from "@/components/leads/ApifyLeadFilters";
import { useSearchLeadsExport } from "@/hooks/useSearchLeadsExport";
import { useToast } from "@/hooks/use-toast";

export default function ApifyLeads() {
  const [filters, setFilters] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const { createExport } = useSearchLeadsExport();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!filters.fetch_count || filters.fetch_count < 1) {
      toast({
        title: "Invalid Input",
        description: "Please specify the number of leads to fetch.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      await createExport(filters, filters.file_name || "apify_leads");
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            Apify Lead Generation
          </CardTitle>
          <CardDescription>
            Generate targeted lead lists using Apify's advanced filtering capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApifyLeadFilters onFiltersChange={setFilters} />
          
          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="lg"
              className="px-8"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Leads...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Leads
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
