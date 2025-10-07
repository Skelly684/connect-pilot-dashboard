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
import { useCampaigns, DeliveryRules } from '@/hooks/useCampaigns';
import { DeliveryRulesTab } from './DeliveryRulesTab';
import { CallerConfigSection, CallerConfig } from './CallerConfigSection';
import { supabase } from '@/integrations/supabase/client';

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewCampaignDialog = ({ open, onOpenChange }: NewCampaignDialogProps) => {
  const { createCampaign, createEmailTemplate, saveEmailSteps } = useCampaigns();
  const [isLoading, setIsLoading] = useState(false);
  
  // Campaign basic info
  const [campaignName, setCampaignName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('Scott | PSN');
  
  // Email template
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Caller configuration
  const defaultCallerConfig: CallerConfig = {
    opening_script: 'Hi, this is Scott from PSN…',
    goal: 'qualify',
    tone: 'professional',
    disclose_ai: false,
    max_duration_sec: 180,
    qualify_questions: [],
    objections: [],
    not_interested_policy: 'send_followup_email'
  };
  const [callerConfig, setCallerConfig] = useState<CallerConfig>(defaultCallerConfig);
  
  // Delivery rules with defaults
  const defaultRules: DeliveryRules = {
    use_email: true,
    use_calls: true,
    call: {
      max_attempts: 3,
      retry_minutes: 30,
      window_start: 9,
      window_end: 18,
    },
    email: {
      send_initial: true,
    },
  };
  
  const [deliveryRules, setDeliveryRules] = useState<DeliveryRules>(defaultRules);
  const [emailSteps, setEmailSteps] = useState<any[]>([]);
  
  // Legacy delivery settings for backwards compatibility
  const [emailDailyCap, setEmailDailyCap] = useState(150);
  
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
    
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to create a campaign');
        return;
      }

      let emailTemplateId = null;
      
      // Create email template if provided
      if (emailSubject.trim() && emailBody.trim()) {
        const template = await createEmailTemplate({
          user_id: user.id,
          campaign_id: null,
          name: `${campaignName} - Email Template`,
          subject: emailSubject,
          body: emailBody,
          is_active: true
        });
        emailTemplateId = template.id;
      }
      
      // Create campaign with delivery rules
      const newCampaign = await createCampaign({
        user_id: user.id,
        name: campaignName,
        from_email: fromEmail,
        from_name: fromName,
        email_template_id: emailTemplateId,
        initial_template_id: emailTemplateId, // Set initial_template_id for first email
        email_daily_cap: emailDailyCap,
        caller_prompt: callerConfig.opening_script.trim() || 'Hi, this is Scott from PSN…',
        call_window_start: deliveryRules.call.window_start,
        call_window_end: deliveryRules.call.window_end,
        max_call_retries: deliveryRules.call.max_attempts,
        retry_minutes: deliveryRules.call.retry_minutes,
        is_active: true,
        is_default: false,
        delivery_rules: {
          ...deliveryRules,
          caller: callerConfig
        }
      });

      // Save email steps if email is enabled and steps exist
      if (deliveryRules.use_email && emailSteps.length > 0) {
        const stepsToSave = [];
        
        for (const step of emailSteps) {
          let templateId = step.template_id;
          
          // For new campaigns with inline templates, create the template first
          if (!templateId && step.subject && step.body) {
            const template = await createEmailTemplate({
              user_id: user.id,
              campaign_id: newCampaign.id,
              name: `${campaignName} - Step ${step.step_number}`,
              subject: step.subject,
              body: step.body,
              is_active: true
            });
            templateId = template.id;
          }
          
          if (templateId) {
            stepsToSave.push({
              step_number: step.step_number,
              template_id: templateId,
              send_at: step.when_to_send === 'exact' ? step.send_at : null,
              send_offset_minutes: step.when_to_send === 'delay' ? step.send_offset_minutes : null,
              is_active: step.is_active,
            });
          }
        }

        if (stepsToSave.length > 0) {
          await saveEmailSteps(newCampaign.id, stepsToSave);
        }
      }
      
      // Reset form
      setCampaignName('');
      setFromEmail('');
      setFromName('Scott | PSN');
      setEmailSubject('');
      setEmailBody('');
      setCallerConfig(defaultCallerConfig);
      setEmailDailyCap(150);
      setDeliveryRules(defaultRules);
      setEmailSteps([]);
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock campaign for DeliveryRulesTab
  const mockCampaign = {
    id: 'new',
    user_id: null,
    name: campaignName,
    from_email: fromEmail,
    from_name: fromName,
    email_template_id: null,
    email_daily_cap: emailDailyCap,
    caller_prompt: callerConfig.opening_script,
    call_window_start: deliveryRules.call.window_start,
    call_window_end: deliveryRules.call.window_end,
    max_call_retries: deliveryRules.call.max_attempts,
    retry_minutes: deliveryRules.call.retry_minutes,
    is_active: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    delivery_rules: {
      ...deliveryRules,
      caller: callerConfig
    },
  };

  const handleUpdateMockCampaign = async (id: string, updates: any) => {
    if (updates.delivery_rules) {
      setDeliveryRules(updates.delivery_rules);
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
              
              {/* Caller Configuration Section */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Call Script Configuration</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">AI Caller Setup</CardTitle>
                      <CardDescription className="text-xs">
                        Configure your AI caller's behavior, goals, and responses
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CallerConfigSection
                        config={callerConfig}
                        onChange={setCallerConfig}
                      />
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>
            
            <TabsContent value="delivery" className="space-y-4">
              <DeliveryRulesTab
                campaign={mockCampaign as any}
                onUpdateCampaign={handleUpdateMockCampaign}
                emailSteps={emailSteps}
                onUpdateEmailSteps={setEmailSteps}
              />
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