import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { Loader2 } from "lucide-react";

export function HealthCheckButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleHealthCheck = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/health');
      const data = await response.json();
      
      setResult(data);
      toast({
        title: "Health Check Success",
        description: "API is responsive",
      });
    } catch (error: any) {
      toast({
        title: "Health Check Failed",
        description: error.message || "Failed to reach API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleHealthCheck}
        disabled={isLoading}
        variant="outline"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Checking...
          </>
        ) : (
          'Health Check'
        )}
      </Button>
      
      {result && (
        <div className="bg-muted p-4 rounded-md">
          <p className="font-semibold mb-2">API Response:</p>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}