import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink, Unlink, RefreshCw, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiBase } from "@/utils/apiBase";

export const SettingsPage = () => {
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  async function fetchStatus() {
    if (!user) return;
    
    setChecking(true);
    try {
      const base = apiBase();
      const url = `${base}/oauth/status?user_id=${user.id}`;
      const res = await fetch(url);
      const j = await res.json();
      console.log("status url", url, j);
      setGoogleConnected(!!j.connected);
    } catch (e) {
      console.error("status error", e);
      setGoogleConnected(false);
    } finally {
      setChecking(false);
    }
  }

  async function pollUntilConnected(timeoutMs = 120000, intervalMs = 1500) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      await fetchStatus();
      if (googleConnected === true) return;
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  useEffect(() => { 
    fetchStatus(); 
  }, [user]);

  async function handleConnectGoogle() {
    if (!user) return;
    
    try {
      const base = apiBase();
      const url = `${base}/api/google/oauth/start?user_id=${user.id}`; // 307 -> Google
      window.open(url, "_blank", "noopener,noreferrer,width=480,height=720");
      // After popup, poll the backend until it sees tokens
      await pollUntilConnected();
    } catch (e) {
      console.error("connect error", e);
    }
  }

  async function handleDisconnect() {
    if (!user) return;

    try {
      const base = apiBase();
      await fetch(`${base}/oauth/google/disconnect?user_id=${user.id}`, { method: "POST" });
      toast({
        title: "Success",
        description: "Google account disconnected successfully"
      });
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Google account", 
        variant: "destructive"
      });
    } finally {
      fetchStatus();
    }
  }

  const testCalendar = async () => {
    if (!user) return;

    try {
      const base = apiBase();
      const response = await fetch(`${base}/calendar/list?user_id=${user.id}`);

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
              {googleConnected === null || checking ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Checking...
                </Badge>
              ) : googleConnected === true ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">Not Connected</Badge>
              )}
              <Button 
                size="sm"
                variant="ghost"
                onClick={fetchStatus}
                disabled={checking}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleConnectGoogle}
              disabled={googleConnected === true}
              variant="default"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Google
            </Button>
            <Button 
              onClick={handleDisconnect}
              disabled={googleConnected !== true}
              variant="secondary"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
            <Button 
              onClick={testCalendar}
              disabled={googleConnected !== true}
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