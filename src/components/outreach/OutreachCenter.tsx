
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Send, Play, Pause, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const campaigns = [
  {
    id: 1,
    name: "Q1 Outreach Campaign",
    type: "email",
    status: "active",
    sent: 156,
    opened: 89,
    replied: 23,
    leads: 45,
  },
  {
    id: 2,
    name: "Cold Call Campaign",
    type: "phone",
    status: "paused",
    sent: 78,
    connected: 34,
    interested: 12,
    leads: 28,
  },
];

export const OutreachCenter = () => {
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "email",
    subject: "",
    message: "",
  });
  const { toast } = useToast();

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Campaign Created",
      description: "Your outreach campaign has been created and is ready to launch.",
    });
    setNewCampaign({ name: "", type: "email", subject: "", message: "" });
  };

  const handleCampaignAction = (action: string, campaignId: number) => {
    toast({
      title: `Campaign ${action}`,
      description: `Campaign has been ${action.toLowerCase()}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Outreach Center</h2>
        <p className="text-gray-600">Manage your email and phone outreach campaigns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Active Campaigns</CardTitle>
            <CardDescription>Monitor and manage your outreach campaigns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedCampaign(campaign.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge
                      className={
                        campaign.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {campaign.status}
                    </Badge>
                    {campaign.type === "email" ? (
                      <Mail className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Phone className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="font-medium">{campaign.sent}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">
                      {campaign.type === "email" ? "Opened" : "Connected"}
                    </p>
                    <p className="font-medium">
                      {campaign.type === "email" ? campaign.opened : campaign.connected}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">
                      {campaign.type === "email" ? "Replied" : "Interested"}
                    </p>
                    <p className="font-medium">
                      {campaign.type === "email" ? campaign.replied : campaign.interested}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-sm text-gray-500">{campaign.leads} leads</span>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={campaign.status === "active" ? "outline" : "default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCampaignAction(
                          campaign.status === "active" ? "Paused" : "Started",
                          campaign.id
                        );
                      }}
                    >
                      {campaign.status === "active" ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Settings logic here
                      }}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
            <CardDescription>Set up a new outreach campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaignName">Campaign Name</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g., Q1 Sales Outreach"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Quick question about your marketing strategy"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({...newCampaign, subject: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message Template</Label>
                <Textarea
                  id="message"
                  placeholder="Hi there, I noticed that your company is..."
                  rows={6}
                  value={newCampaign.message}
                  onChange={(e) => setNewCampaign({...newCampaign, message: e.target.value})}
                  required
                />
                <p className="text-xs text-gray-500">
                  Use placeholders for personalization in your actual implementation
                </p>
              </div>

              <Button type="submit" className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
