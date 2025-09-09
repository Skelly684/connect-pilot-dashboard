
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Settings, CheckCircle, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { useCRMIntegrations } from "@/hooks/useCRMIntegrations";
import { formatDistanceToNow } from "date-fns";

const availableIntegrations = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync leads and contacts with HubSpot CRM",
    logo: "🔶",
    setupUrl: "https://app.hubspot.com/settings/api-keys"
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Connect with Salesforce Sales Cloud",
    logo: "☁️",
    setupUrl: "https://login.salesforce.com/"
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sync with Pipedrive CRM platform",
    logo: "🔵",
    setupUrl: "https://app.pipedrive.com/settings/api"
  },
];

export const CRMIntegration = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const { 
    integrations, 
    isLoading, 
    connectCRM, 
    syncLeads, 
    disconnectCRM, 
    toggleAutoSync 
  } = useCRMIntegrations();

  const handleConnect = async (provider: string) => {
    const apiKey = apiKeys[provider];
    if (!apiKey) {
      return;
    }

    const success = await connectCRM(provider, apiKey);
    if (success) {
      setApiKeys(prev => ({ ...prev, [provider]: "" }));
    }
  };

  const handleSync = async (integrationId: string) => {
    await syncLeads(integrationId);
  };

  const handleDisconnect = async (integrationId: string) => {
    await disconnectCRM(integrationId);
  };

  const handleToggleSync = async (integrationId: string, enabled: boolean) => {
    await toggleAutoSync(integrationId, enabled);
  };

  const getIntegrationStatus = (provider: string) => {
    return integrations.find(integration => 
      integration.provider === provider && integration.is_active
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">CRM Integrations</h2>
        <p className="text-muted-foreground">Connect with your favorite CRM and automatically sync replied leads</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {availableIntegrations.map((availableIntegration) => {
          const connectedIntegration = getIntegrationStatus(availableIntegration.id);
          
          return (
            <Card key={availableIntegration.id} className="border-0 shadow-sm bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{availableIntegration.logo}</span>
                    <div>
                      <CardTitle className="text-lg">{availableIntegration.name}</CardTitle>
                      <CardDescription>{availableIntegration.description}</CardDescription>
                    </div>
                  </div>
                  {connectedIntegration ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectedIntegration ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`sync-${connectedIntegration.id}`}>Auto-sync replied leads</Label>
                      <Switch
                        id={`sync-${connectedIntegration.id}`}
                        checked={connectedIntegration.auto_sync}
                        onCheckedChange={(checked) => handleToggleSync(connectedIntegration.id, checked)}
                        disabled={isLoading}
                      />
                    </div>
                    
                    {connectedIntegration.last_sync_at && (
                      <div className="text-sm text-muted-foreground">
                        Last sync: {formatDistanceToNow(new Date(connectedIntegration.last_sync_at), { addSuffix: true })}
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(connectedIntegration.id)}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Sync Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(connectedIntegration.id)}
                        disabled={isLoading}
                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`api-key-${availableIntegration.id}`}>API Key</Label>
                      <Input
                        id={`api-key-${availableIntegration.id}`}
                        type="password"
                        placeholder="Enter your API key"
                        value={apiKeys[availableIntegration.id] || ""}
                        onChange={(e) => setApiKeys(prev => ({ 
                          ...prev, 
                          [availableIntegration.id]: e.target.value 
                        }))}
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleConnect(availableIntegration.id)}
                        className="flex-1"
                        disabled={isLoading || !apiKeys[availableIntegration.id]}
                      >
                        {isLoading ? "Connecting..." : "Connect"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => window.open(availableIntegration.setupUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {integrations.length > 0 && (
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader>
            <CardTitle>Sync Settings</CardTitle>
            <CardDescription>Automatically sync replied leads to your connected CRMs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sync Trigger</Label>
                <div className="text-sm text-muted-foreground">When leads change status to "replied"</div>
              </div>
              <div className="space-y-2">
                <Label>Active Integrations</Label>
                <div className="text-sm text-muted-foreground">
                  {integrations.filter(i => i.is_active).length} of {integrations.length} connected
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                💡 Tip: Enable "Auto-sync replied leads" on individual integrations to automatically 
                send lead data when they reply to your outreach.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
