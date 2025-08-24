import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, Save, Eye, Mail, Phone } from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewCampaignDialog = ({ open, onOpenChange }: NewCampaignDialogProps) => {
  const { createCampaign, createEmailTemplate } = useCampaigns();
  const [isLoading, setIsLoading] = useState(false);
  
  // Campaign basic info
  const [campaignName, setCampaignName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('Scott | PSN');
  
  // Email template
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Caller script
  const [callerPrompt, setCallerPrompt] = useState('Hi, this is Scott from PSN…');
  
  // Delivery settings
  const [emailDailyCap, setEmailDailyCap] = useState(150);
  const [callWindowStart, setCallWindowStart] = useState(9);
  const [callWindowEnd, setCallWindowEnd] = useState(18);
  const [maxCallRetries, setMaxCallRetries] = useState(3);
  
  // Sample lead for preview
  const sampleLead = {
    first_name: 'John',
    last_name: 'Smith',
    company_name: 'TechCorp Inc.',
    job_title: 'Marketing Director'
  };

  const replaceVariables = (text: string, lead: any) => {
    return text
      .replace(/{{first_name}}/g, lead.first_name || '[First Name]')
      .replace(/{{last_name}}/g, lead.last_name || '[Last Name]')
      .replace(/{{company_name}}/g, lead.company_name || '[Company]')
      .replace(/{{job_title}}/g, lead.job_title || '[Job Title]');
  };

  const handleSave = async () => {
    // Validation
    if (!campaignName.trim()) {
      alert('Campaign name is required');
      return;
    }
    
    if (!emailSubject.trim() && !callerPrompt.trim()) {
      alert('Please provide either an email template or caller script');
      return;
    }
    
    setIsLoading(true);
    try {
      let emailTemplateId = null;
      
      // Create email template if provided
      if (emailSubject.trim() && emailBody.trim()) {
        const template = await createEmailTemplate({
          user_id: null,
          name: `${campaignName} - Email Template`,
          subject: emailSubject,
          body: emailBody,
          is_active: true
        });
        emailTemplateId = template.id;
      }
      
      // Create campaign
      await createCampaign({
        user_id: null,
        name: campaignName,
        from_email: fromEmail,
        from_name: fromName,
        email_template_id: emailTemplateId,
        email_daily_cap: emailDailyCap,
        caller_prompt: callerPrompt.trim() || 'Hi, this is Scott from PSN…',
        call_window_start: callWindowStart,
        call_window_end: callWindowEnd,
        max_call_retries: maxCallRetries,
        retry_minutes: 30,
        is_active: false
      });
      
      // Reset form
      setCampaignName('');
      setFromEmail('');
      setFromName('Scott | PSN');
      setEmailSubject('');
      setEmailBody('');
      setCallerPrompt('Hi, this is Scott from PSN…');
      setEmailDailyCap(150);
      setCallWindowStart(9);
      setCallWindowEnd(18);
      setMaxCallRetries(3);
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Set up your outreach campaign with email and calling capabilities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Campaign Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Q1 Sales Outreach"
              />
            </div>
            <div>
              <Label htmlFor="from-email">From Email</Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="scott@example.com"
              />
            </div>
          </div>

          <Tabs defaultValue="messaging" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="messaging">Messaging</TabsTrigger>
              <TabsTrigger value="delivery">Delivery & Rules</TabsTrigger>
            </TabsList>
            
            <TabsContent value="messaging" className="space-y-4">
              {/* Email Template Section */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Email Template</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Email Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="email-subject">Subject Line</Label>
                        <Input
                          id="email-subject"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Quick question about {{company_name}}"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email-body">Email Body</Label>
                        <Textarea
                          id="email-body"
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Hi {{first_name}}, I noticed that {{company_name}} is..."
                          rows={6}
                        />
                      </div>
                      {emailSubject && emailBody && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4" />
                            <span className="text-sm font-medium">Live Preview</span>
                          </div>
                          <div className="text-sm space-y-2">
                            <div>
                              <strong>Subject:</strong> {replaceVariables(emailSubject, sampleLead)}
                            </div>
                            <div>
                              <strong>Body:</strong>
                              <div className="whitespace-pre-wrap mt-1 p-2 bg-background rounded border">
                                {replaceVariables(emailBody, sampleLead)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
              
              {/* Caller Script Section */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Caller Script</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Call Script Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="caller-prompt">Opening Script</Label>
                        <Textarea
                          id="caller-prompt"
                          value={callerPrompt}
                          onChange={(e) => setCallerPrompt(e.target.value)}
                          placeholder="Hi {{first_name}}, this is Scott from PSN. I noticed {{company_name}} is..."
                          rows={4}
                        />
                      </div>
                      {callerPrompt && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4" />
                            <span className="text-sm font-medium">Live Preview</span>
                          </div>
                          <div className="text-sm">
                            <div className="whitespace-pre-wrap p-2 bg-background rounded border">
                              {replaceVariables(callerPrompt, sampleLead)}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>
            
            <TabsContent value="delivery" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email-cap">Daily Email Cap</Label>
                  <Input
                    id="email-cap"
                    type="number"
                    value={emailDailyCap}
                    onChange={(e) => setEmailDailyCap(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="max-retries">Max Call Retries</Label>
                  <Input
                    id="max-retries"
                    type="number"
                    value={maxCallRetries}
                    onChange={(e) => setMaxCallRetries(parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="call-start">Call Window Start (24h)</Label>
                  <Input
                    id="call-start"
                    type="number"
                    min="0"
                    max="23"
                    value={callWindowStart}
                    onChange={(e) => setCallWindowStart(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="call-end">Call Window End (24h)</Label>
                  <Input
                    id="call-end"
                    type="number"
                    min="0"
                    max="23"
                    value={callWindowEnd}
                    onChange={(e) => setCallWindowEnd(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};