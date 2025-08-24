import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Campaign } from '@/hooks/useCampaigns';

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated: (campaign: Campaign) => void;
  createCampaign: (data: any) => Promise<Campaign>;
}

export const NewCampaignDialog = ({ open, onOpenChange, onCampaignCreated, createCampaign }: NewCampaignDialogProps) => {
  const [name, setName] = useState('');
  const [fromEmail, setFromEmail] = useState('scott@premiersportsnetwork.com');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setIsLoading(true);
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        from_email: fromEmail,
        from_name: 'Scott | PSN',
        email_template_id: null,
        email_daily_cap: 150,
        caller_prompt: 'Hi, this is Scott from PSN…',
        call_window_start: 9,
        call_window_end: 18,
        max_call_retries: 3,
        retry_minutes: 30,
        is_active: true,
        user_id: null
      });
      
      onCampaignCreated(campaign);
      setName('');
      setFromEmail('scott@premiersportsnetwork.com');
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q1 2024 Outreach"
            />
          </div>
          <div>
            <Label htmlFor="from-email">From Email</Label>
            <Input
              id="from-email"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
              {isLoading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};