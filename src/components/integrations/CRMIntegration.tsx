
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Settings, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const integrations = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync leads and contacts with HubSpot CRM",
    status: "connected",
    logo: "🔶",
    syncEnabled: true,
    lastSync: "2 hours ago",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Connect with Salesforce Sales Cloud",
    status: "available",
    logo: "☁️",
    syncEnabled: false,
    lastSync: null,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sync with Pipedrive CRM platform",
    status: "available",
    logo: "🔵",
    syncEnabled: false,
    lastSync: null,
  },
];

export const CRMIntegration = () => {
  const [apiKey, setApiKey] = useState("");
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConnect = (integrationId: string) => {
    toast({
      title: "Integration Setup",
      description: "Please connect to Supabase to store CRM credentials securely.",
    });
  };

  const handleSync = (integrationId: string) => {
    toast({
      title: "Sync Started",
      description: "Your data is being synchronized with the CRM.",
    });
  };

  const handleToggleSync = (integrationId: string, enabled: boolean) => {
    toast({
      title: enabled ? "Auto-sync Enabled" : "Auto-sync Disabled",
      description: `Automatic synchronization has been ${enabled ? "enabled" : "disabled"}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
        <p className="text-gray-600">Connect with your favorite CRM and sales tools</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{integration.logo}</span>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </div>
                {integration.status === "connected" ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {integration.status === "connected" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`sync-${integration.id}`}>Auto-sync</Label>
                    <Switch
                      id={`sync-${integration.id}`}
                      checked={integration.syncEnabled}
                      onCheckedChange={(checked) => handleToggleSync(integration.id, checked)}
                    />
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Last sync: {integration.lastSync}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(integration.id)}
                    >
                      Sync Now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIntegration(integration.id)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`api-key-${integration.id}`}>API Key</Label>
                    <Input
                      id={`api-key-${integration.id}`}
                      type="password"
                      placeholder="Enter your API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleConnect(integration.id)}
                      className="flex-1"
                    >
                      Connect
                    </Button>
                    <Button variant="outline" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>Configure how data flows between systems</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <div className="text-sm text-gray-600">Every 4 hours</div>
            </div>
            <div className="space-y-2">
              <Label>Data Mapping</Label>
              <div className="text-sm text-gray-600">Standard field mapping</div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Advanced Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
