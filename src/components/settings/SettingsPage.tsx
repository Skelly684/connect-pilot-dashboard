import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink, Unlink, RefreshCw, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const SettingsPage = () => {
  const [dsGoogleStatus, setDsGoogleStatus] = useState({ data: { connected: false }, loading: false });
  const { toast } = useToast();
  const { user } = useAuth();

  // Data source for Google OAuth status - using calendar endpoint since /oauth/status doesn't exist
  const runDsGoogleStatus = useCallback(async () => {
    if (!user) return;
    
    setDsGoogleStatus(prev => ({ ...prev, loading: true }));
    try {
      // Since /oauth/status doesn't exist, test connection by trying calendar API
      const backendUrl = import.meta.env.VITE_API_BASE || 'https://dafed33295c9.ngrok-free.app/api';
      const response = await fetch(`${backendUrl}/calendar/list`, {
        headers: {
          'X-User-Id': user.id,
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        }
      });

      if (response.ok) {
        const data = await response.json();
        // If calendar API works, Google is connected
        setDsGoogleStatus({ data: { connected: true }, loading: false });
      } else {
        console.error('Failed to check Google status:', response.status);
        setDsGoogleStatus({ data: { connected: false }, loading: false });
      }
    } catch (error) {
      console.error('Error checking Google status:', error);
      setDsGoogleStatus({ data: { connected: false }, loading: false });
    }
  }, [user]);

  useEffect(() => {
    // Run data source on page load
    if (user) {
      runDsGoogleStatus();
    }
  }, [user, runDsGoogleStatus]);

  // Handle window focus to refresh Google status after OAuth
  useEffect(() => {
    const handleFocus = () => {
      runDsGoogleStatus();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [runDsGoogleStatus]);

  const connectGoogle = () => {
    if (!user) return;
    
    const backendUrl = import.meta.env.VITE_API_BASE || 'https://dafed33295c9.ngrok-free.app/api';
    const authUrl = `${backendUrl}/google/oauth/start?user_id=${user.id}`;
    window.open(authUrl, 'google-auth', 'width=520,height=700,scrollbars=yes,resizable=yes');
    
    // Poll for connection status after opening OAuth window
    pollForConnection();
  };

  const pollForConnection = async () => {
    const maxAttempts = 40; // 2 minutes total
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      await runDsGoogleStatus();
      
      if (dsGoogleStatus.data.connected) {
        toast({
          title: "Success",
          description: "Google account connected successfully!",
        });
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(poll, 3000); // Poll every 3 seconds
      }
    };
    
    // Start polling after a short delay
    setTimeout(poll, 2000);
  };

  const disconnectGoogle = async () => {
    if (!user) return;

    try {
      const backendUrl = import.meta.env.VITE_API_BASE || 'https://dafed33295c9.ngrok-free.app/api';
      const response = await fetch(`${backendUrl}/oauth/google/disconnect`, {
        method: 'POST',
        headers: {
          'X-User-Id': user.id,
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        }
      });

      if (response.ok) {
        runDsGoogleStatus();
        toast({
          title: "Success",
          description: "Google account disconnected successfully"
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || errorData.detail || errorData.message || "Failed to disconnect Google account",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Google account", 
        variant: "destructive"
      });
    }
  };

  const testCalendar = async () => {
    if (!user) return;

    try {
      const backendUrl = import.meta.env.VITE_API_BASE || 'https://dafed33295c9.ngrok-free.app/api';
      const response = await fetch(`${backendUrl}/calendar/list`, {
        headers: {
          'X-User-Id': user.id,
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Calendar connection test successful"
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || errorData.detail || errorData.message || "Calendar test failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing calendar:', error);
      toast({
        title: "Error",
        description: "Failed to test calendar connection", 
        variant: "destructive"
      });
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your application settings and integrations.</p>
      </div>

      {/* Google Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Google Account
          </CardTitle>
          <CardDescription>
            Connecting allows sending emails from your mailbox and booking to your calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Google Status:</span>
              {dsGoogleStatus.loading ? (
                <Badge variant="secondary">Checking...</Badge>
              ) : dsGoogleStatus.data.connected ? (
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">Not Connected</Badge>
              )}
              <Button 
                size="sm"
                variant="ghost"
                onClick={runDsGoogleStatus}
                disabled={dsGoogleStatus.loading}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={connectGoogle}
              disabled={dsGoogleStatus.data.connected}
              variant="default"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Google
            </Button>
            <Button 
              onClick={disconnectGoogle}
              disabled={!dsGoogleStatus.data.connected}
              variant="secondary"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
            <Button 
              onClick={testCalendar}
              disabled={!dsGoogleStatus.data.connected}
              variant="outline"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Test Calendar
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};