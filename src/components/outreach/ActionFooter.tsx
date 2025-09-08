import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Campaign } from '@/hooks/useCampaigns';
import { Mail, Phone, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ActionFooterProps {
  campaign: Campaign;
}

export const ActionFooter = ({ campaign }: ActionFooterProps) => {
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [showTestCall, setShowTestCall] = useState(false);
  const [showStartCampaign, setShowStartCampaign] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testName, setTestName] = useState('');
  const [testCompany, setTestCompany] = useState('');
  const [leadsJson, setLeadsJson] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTestEmail = async () => {
    if (!campaign?.email_template_id) {
      toast({
        title: "No Email Template",
        description: "Please configure an email template first",
        variant: "destructive",
      });
      return;
    }

    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: {
          emailTemplateId: campaign.email_template_id,
          testEmail: testEmail
        }
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: `Preview email sent to ${testEmail}`,
      });
      setShowTestEmail(false);
      setTestEmail('');
    } catch (error) {
      console.error('Test email error:', error);
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleTestCall = async () => {
    if (!campaign?.caller_prompt) {
      toast({
        title: "No Caller Script",
        description: "Please configure a caller script first",
        variant: "destructive",
      });
      return;
    }

    if (!testPhone || !testName) {
      toast({
        title: "Error",
        description: "Please enter phone number and name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-call', {
        body: {
          campaignId: campaign.id,
          testPhone: testPhone,
          testName: testName,
          testCompany: testCompany
        }
      });

      if (error) throw error;

      toast({
        title: "Test Call Initiated",
        description: `Test call initiated to ${testPhone}`,
      });
      setShowTestCall(false);
      setTestPhone('');
      setTestName('');
      setTestCompany('');
    } catch (error) {
      console.error('Test call error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate test call",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleStartCampaign = async () => {
    setIsLoading(true);
    try {
      let leads = [];
      
      if (leadsJson.trim()) {
        try {
          leads = JSON.parse(leadsJson);
        } catch (error) {
          toast({
            title: "Error",
            description: "Invalid JSON format for leads",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Call the accepted-leads API using Supabase function
      const { data, error } = await supabase.functions.invoke('accepted-leads', {
        body: {
          leads,
          campaignId: campaign.id
        }
      });

      if (error) {
        throw error;
      }


      toast({
        title: "Campaign Started",
        description: `Campaign started with ${leads.length} leads`,
      });
      
      setShowStartCampaign(false);
      setLeadsJson('');
    } catch (error) {
      console.error('Campaign start error:', error);
      toast({
        title: "Error",
        description: "Failed to start campaign",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="sticky bottom-0 bg-background border-t p-4 mt-6">
      {/* Campaign Status Summary */}
      <div className="mb-4 p-3 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Campaign Configuration</h4>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Emails: {campaign.email_template_id ? 'ON' : 'OFF'}</span>
            {campaign.email_template_id && campaign.email_template && (
              <Badge variant="outline" className="ml-2 text-xs">
                {campaign.email_template.subject}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>Calls: {campaign.caller_prompt ? 'ON' : 'OFF'}</span>
            {campaign.caller_prompt && (
              <Badge variant="outline" className="ml-2 text-xs">
                {campaign.caller_prompt.substring(0, 30)}...
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-4 justify-end">
        {/* Test Email */}
        <Dialog open={showTestEmail} onOpenChange={setShowTestEmail}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Test Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-email">Email Address</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                This will send a preview email using the current campaign template.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTestEmail(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTestEmail} disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Test'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Test Call */}
        <Dialog open={showTestCall} onOpenChange={setShowTestCall}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Phone className="h-4 w-4" />
              Test Call
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Call</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-phone">Phone Number</Label>
                <Input
                  id="test-phone"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label htmlFor="test-name">Contact Name</Label>
                <Input
                  id="test-name"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label htmlFor="test-company">Company (Optional)</Label>
                <Input
                  id="test-company"
                  value={testCompany}
                  onChange={(e) => setTestCompany(e.target.value)}
                  placeholder="TechCorp Inc."
                />
              </div>
              <p className="text-sm text-muted-foreground">
                This will trigger a test call using the current campaign script.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTestCall(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTestCall} disabled={isLoading}>
                  {isLoading ? 'Calling...' : 'Start Test Call'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Start Campaign */}
        <Dialog open={showStartCampaign} onOpenChange={setShowStartCampaign}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Play className="h-4 w-4" />
              Start Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Start Campaign: {campaign.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="leads-json">Leads (JSON Format)</Label>
                <Textarea
                  id="leads-json"
                  value={leadsJson}
                  onChange={(e) => setLeadsJson(e.target.value)}
                  placeholder="Enter leads JSON array or leave empty to use current selection from Leads page"
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Options:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Leave empty to use current selection from Leads page</li>
                  <li>Paste JSON array of leads for advanced usage</li>
                </ul>
                <p><strong>Expected format:</strong> [{"{'"}name: "John Smith", email: "john@example.com", ...{'}'}]</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowStartCampaign(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStartCampaign} disabled={isLoading}>
                  {isLoading ? 'Starting...' : 'Start Campaign'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};