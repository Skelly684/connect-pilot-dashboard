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
      // Validate URL format first and normalize it
      const trimmed = url.trim().replace(/\/api$/, '');
      if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }

      // Build test URL - API_BASE_URL should NOT include '/api'
      const testUrl = `${trimmed || '/api'}/api/health?t=${Date.now()}`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      // Check status first
      if (response.status !== 200) {
        setConnectionStatus('error');
        setErrorMessage(`Error: ${response.status} ${response.statusText}`);
        return;
      }

      // Try to parse response
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (!contentType || !contentType.includes('application/json')) {
        // Try to handle non-JSON responses that might still contain JSON
        const responseText = await response.text();
        const trimmedText = responseText.trim();
        
        if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
          try {
            data = JSON.parse(trimmedText);
          } catch (parseError) {
            setConnectionStatus('error');
            setErrorMessage(`Response appears to be JSON but failed to parse. Response: ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`);
            return;
          }
        } else {
          setConnectionStatus('error');
          setErrorMessage(`Expected JSON response but received ${contentType || 'unknown content type'}. Response: ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`);
          return;
        }
      } else {
        // Parse JSON normally
        data = await response.json();
      }

      // Check if response indicates success
      if (data.ok === true) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
        setErrorMessage(`Health check failed: ${JSON.stringify(data)}`);
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