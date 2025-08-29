import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Link, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { appConfig } from "@/lib/appConfig";

export const SettingsPage = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState("");
  const [testedUrl, setTestedUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Load saved API base URL from app config
    const config = appConfig.getConfig();
    setApiBaseUrl(config.api_base_url);
  }, []);

  const validateConnection = async (url: string) => {
    setIsValidating(true);
    setConnectionStatus('unknown');
    setErrorMessage("");
    setTestedUrl(url);
    
    try {
      // Validate URL format first
      const trimmed = url.trim();
      if (trimmed !== '/api' && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }

      // Test the health endpoint with cache busting and redirect manual
      const testUrl = trimmed === '/api' ? `/api/health?t=${Date.now()}` : `${trimmed}/api/health?t=${Date.now()}`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        credentials: 'omit',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check status first
      if (response.status !== 200) {
        setConnectionStatus('error');
        setErrorMessage(`Error: ${response.status} ${response.statusText}`);
        return;
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Parse JSON and show success
        await response.json();
        setConnectionStatus('connected');
      } else {
        // Not JSON, read text and show first 300 characters
        const responseText = await response.text();
        const truncatedText = responseText.substring(0, 300);
        setConnectionStatus('error');
        setErrorMessage(`Expected JSON response but received ${contentType || 'unknown content type'}. Response: ${truncatedText}${responseText.length > 300 ? '...' : ''}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    try {
      appConfig.setApiBaseUrl(apiBaseUrl);
      
      toast({
        title: "Settings Saved",
        description: "API base URL has been updated successfully.",
      });

      // Test the connection with the new URL
      validateConnection(apiBaseUrl);
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Invalid URL format",
        variant: "destructive",
      });
    }
  };

  const handleTest = () => {
    validateConnection(apiBaseUrl.trim());
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your application settings and integrations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure the backend API URL for calendar and other integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">API Base URL</Label>
            <Input
              id="api-url"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://your-ngrok-url.ngrok-free.app or /api"
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Use "/api" for same-origin requests or your full ngrok/server URL
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleTest} disabled={isValidating} variant="outline">
              {isValidating ? "Testing..." : "Test Connection"}
            </Button>
            <Button onClick={handleSave} disabled={!apiBaseUrl.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
            {getStatusBadge()}
          </div>

          {connectionStatus === 'error' && errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div>Connection failed: {errorMessage}</div>
                {testedUrl && (
                  <div className="text-xs mt-1 font-mono">Tested URL: {testedUrl === '/api' ? '/api/health' : `${testedUrl}/api/health`}</div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Examples:</h4>
            <div className="space-y-1 text-sm text-muted-foreground font-mono">
              <div>• Same origin: <code>/api</code></div>
              <div>• Ngrok: <code>https://abc123.ngrok-free.app</code></div>
              <div>• Local dev: <code>http://localhost:8000</code></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};