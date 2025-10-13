import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Campaign, useCampaigns } from '@/hooks/useCampaigns';
import { useToast } from '@/hooks/use-toast';

interface BasicInfoTabProps {
  campaign: Campaign;
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
}

export const BasicInfoTab = ({ campaign, onUpdateCampaign }: BasicInfoTabProps) => {
  const [name, setName] = useState(campaign.name);
  const [fromEmail, setFromEmail] = useState(campaign.from_email);
  const [fromName, setFromName] = useState(campaign.from_name);
  const [emailDailyCap, setEmailDailyCap] = useState(campaign.email_daily_cap);
  const [timezone, setTimezone] = useState(campaign.timezone || 'America/New_York');
  const [isActive, setIsActive] = useState(campaign.is_active);
  const [isDefault, setIsDefault] = useState(campaign.is_default);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { setDefaultCampaign } = useCampaigns();

  // Update local state when campaign changes
  useEffect(() => {
    setName(campaign.name);
    setFromEmail(campaign.from_email);
    setFromName(campaign.from_name);
    setEmailDailyCap(campaign.email_daily_cap);
    setTimezone(campaign.timezone || 'America/New_York');
    setIsActive(campaign.is_active);
    setIsDefault(campaign.is_default || false);
  }, [campaign]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Campaign name is required",
        variant: "destructive",
      });
      return;
    }

    if (!fromEmail.trim()) {
      toast({
        title: "Error", 
        description: "From email is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Handle basic campaign updates
      await onUpdateCampaign(campaign.id, {
        name: name.trim(),
        from_email: fromEmail.trim(),
        from_name: fromName.trim(),
        email_daily_cap: emailDailyCap,
        timezone: timezone,
        is_active: isActive,
      });

      // Handle default campaign setting separately if it changed
      if (isDefault !== campaign.is_default) {
        await setDefaultCampaign(campaign.id, isDefault);
      }

      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = 
    name !== campaign.name ||
    fromEmail !== campaign.from_email ||
    fromName !== campaign.from_name ||
    emailDailyCap !== campaign.email_daily_cap ||
    timezone !== (campaign.timezone || 'America/New_York') ||
    isActive !== campaign.is_active ||
    isDefault !== campaign.is_default; // Check if default status changed

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter campaign name"
              />
            </div>
            <div>
              <Label htmlFor="email-daily-cap">Daily Email Limit</Label>
              <Input
                id="email-daily-cap"
                type="number"
                min="1"
                max="1000"
                value={emailDailyCap}
                onChange={(e) => setEmailDailyCap(parseInt(e.target.value) || 150)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/London">GMT/BST (London)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">EST/EDT (New York)</SelectItem>
                <SelectItem value="America/Chicago">CST/CDT (Chicago)</SelectItem>
                <SelectItem value="America/Denver">MST/MDT (Denver)</SelectItem>
                <SelectItem value="America/Los_Angeles">PST/PDT (Los Angeles)</SelectItem>
                <SelectItem value="Europe/Paris">CET/CEST (Paris)</SelectItem>
                <SelectItem value="Europe/Berlin">CET/CEST (Berlin)</SelectItem>
                <SelectItem value="Asia/Tokyo">JST (Tokyo)</SelectItem>
                <SelectItem value="Asia/Shanghai">CST (Shanghai)</SelectItem>
                <SelectItem value="Australia/Sydney">AEDT (Sydney)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Used for scheduling emails and determining daily caps
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure how your emails appear to recipients
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from-email">From Email</Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="from-name">From Name</Label>
              <Input
                id="from-name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Your Name | Company"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Status */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is-active">Campaign Active</Label>
              <p className="text-sm text-muted-foreground">
                Whether this campaign is currently running and processing leads
              </p>
            </div>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is-default">Default Campaign</Label>
              <p className="text-sm text-muted-foreground">
                Use this campaign for new leads by default
              </p>
            </div>
            <Switch
              id="is-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>
        </CardContent>
      </Card>

      {/* Campaign Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>
              <span className="ml-2">{new Date(campaign.created_at).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="ml-2">{new Date(campaign.updated_at).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Campaign ID:</span>
              <span className="ml-2 font-mono text-xs">{campaign.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isLoading || !hasChanges}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};