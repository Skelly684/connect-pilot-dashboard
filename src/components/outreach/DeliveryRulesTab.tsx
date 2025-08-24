import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Campaign } from '@/hooks/useCampaigns';

interface DeliveryRulesTabProps {
  campaign: Campaign;
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
}

export const DeliveryRulesTab = ({ campaign, onUpdateCampaign }: DeliveryRulesTabProps) => {
  const [fromName, setFromName] = useState(campaign.from_name);
  const [fromEmail, setFromEmail] = useState(campaign.from_email);
  const [emailDailyCap, setEmailDailyCap] = useState(campaign.email_daily_cap);
  const [callWindowStart, setCallWindowStart] = useState(campaign.call_window_start);
  const [callWindowEnd, setCallWindowEnd] = useState(campaign.call_window_end);
  const [maxCallRetries, setMaxCallRetries] = useState(campaign.max_call_retries);
  const [retryMinutes, setRetryMinutes] = useState(campaign.retry_minutes);
  const [isActive, setIsActive] = useState(campaign.is_active);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveRules = async () => {
    setIsLoading(true);
    try {
      await onUpdateCampaign(campaign.id, {
        from_name: fromName,
        from_email: fromEmail,
        email_daily_cap: emailDailyCap,
        call_window_start: callWindowStart,
        call_window_end: callWindowEnd,
        max_call_retries: maxCallRetries,
        retry_minutes: retryMinutes,
        is_active: isActive,
      });
    } catch (error) {
      console.error('Error saving rules:', error);
    }
    setIsLoading(false);
  };

  const timeOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, '0')}:00`
  }));

  return (
    <div className="space-y-6">
      {/* From Identity */}
      <Card>
        <CardHeader>
          <CardTitle>From Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="from-name">From Name</Label>
            <Input
              id="from-name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Scott | PSN"
            />
          </div>

          <div>
            <Label htmlFor="from-email">From Email</Label>
            <Input
              id="from-email"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="scott@premiersportsnetwork.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email-cap">Daily Email Cap</Label>
            <Input
              id="email-cap"
              type="number"
              value={emailDailyCap}
              onChange={(e) => setEmailDailyCap(parseInt(e.target.value) || 0)}
              min="1"
              max="1000"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Maximum emails to send per day for this campaign
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Call Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Call Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="call-start">Call Window Start</Label>
              <Select value={callWindowStart.toString()} onValueChange={(value) => setCallWindowStart(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="call-end">Call Window End</Label>
              <Select value={callWindowEnd.toString()} onValueChange={(value) => setCallWindowEnd(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Local time of the callee
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-retries">Max Call Retries</Label>
              <Input
                id="max-retries"
                type="number"
                value={maxCallRetries}
                onChange={(e) => setMaxCallRetries(parseInt(e.target.value) || 0)}
                min="0"
                max="10"
              />
            </div>

            <div>
              <Label htmlFor="retry-minutes">Retry Interval (minutes)</Label>
              <Input
                id="retry-minutes"
                type="number"
                value={retryMinutes}
                onChange={(e) => setRetryMinutes(parseInt(e.target.value) || 0)}
                min="5"
                max="1440"
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
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="active-toggle"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active-toggle">
              {isActive ? 'Campaign is active' : 'Campaign is inactive'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveRules} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Rules'}
        </Button>
      </div>
    </div>
  );
};