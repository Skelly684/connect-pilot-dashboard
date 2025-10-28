import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Campaign, EmailTemplate, useCampaigns } from '@/hooks/useCampaigns';
import { TemplatePreview } from './TemplatePreview';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Info } from 'lucide-react';

interface MessagingTabProps {
  campaign: Campaign;
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  onUpdateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => Promise<void>;
  onCreateEmailTemplate: (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<EmailTemplate>;
  emailTemplates: EmailTemplate[];
}

interface EmailStep {
  id?: string;
  step_number: number;
  subject: string;
  body: string;
  send_offset_minutes: number;
}

export const MessagingTab = ({
  campaign,
  onUpdateCampaign,
  onUpdateEmailTemplate,
  onCreateEmailTemplate,
  emailTemplates
}: MessagingTabProps) => {
  const { saveEmailSteps } = useCampaigns();
  const [callerPrompt, setCallerPrompt] = useState(campaign.caller_prompt);
  const [emailSubject, setEmailSubject] = useState(campaign.email_template?.subject || '');
  const [emailBody, setEmailBody] = useState(campaign.email_template?.body || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(campaign.email_template_id || 'new');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSteps, setEmailSteps] = useState<EmailStep[]>([
    { step_number: 1, subject: '', body: '', send_offset_minutes: 0 }
  ]);

  // Load email steps for campaign
  useEffect(() => {
    const loadEmailSteps = async () => {
      if (campaign.id) {
        const { data: steps } = await supabase
          .from('campaign_email_steps')
          .select(`
            *,
            email_templates (
              id,
              subject,
              body
            )
          `)
          .eq('campaign_id', campaign.id)
          .order('step_number');
        
        if (steps && steps.length > 0) {
          setEmailSteps(steps.map((step: any) => ({
            id: step.id,
            step_number: step.step_number,
            subject: step.email_templates?.subject || '',
            body: step.email_templates?.body || '',
            send_offset_minutes: step.send_offset_minutes || 0
          })));
        }
      }
    };
    loadEmailSteps();
  }, [campaign.id]);

  // Update state when campaign data changes
  useEffect(() => {
    setCallerPrompt(campaign.caller_prompt);
    setEmailSubject(campaign.email_template?.subject || '');
    setEmailBody(campaign.email_template?.body || '');
    setSelectedTemplateId(campaign.email_template_id || 'new');
  }, [campaign]);

  const handleSaveMessaging = async () => {
    setIsLoading(true);
    try {
      // Update caller prompt
      await onUpdateCampaign(campaign.id, { caller_prompt: callerPrompt });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      // Create/update a template for EACH step
      const stepsToSave = await Promise.all(emailSteps.map(async (step) => {
        // Create a new template for this step
        const template = await onCreateEmailTemplate({
          name: `${campaign.name} - Step ${step.step_number}`,
          subject: step.subject,
          body: step.body,
          user_id: user.id,
          campaign_id: campaign.id,
          is_active: true
        });

        return {
          step_number: step.step_number,
          template_id: template.id,
          is_active: true,
          send_at: null,
          send_offset_minutes: step.send_offset_minutes,
        };
      }));

      // Save email steps with their respective templates
      await saveEmailSteps(campaign.id, stepsToSave);

      // Link the first step's template to the campaign (both fields for compatibility)
      if (stepsToSave.length > 0) {
        await onUpdateCampaign(campaign.id, { 
          email_template_id: stepsToSave[0].template_id,
          initial_template_id: stepsToSave[0].template_id  // Required for trigger to work
        });
      }
    } catch (error) {
      console.error('Error saving messaging:', error);
    }
    setIsLoading(false);
  };

  const addEmailStep = () => {
    setEmailSteps(prev => [...prev, {
      step_number: prev.length + 1,
      subject: '',
      body: '',
      send_offset_minutes: (prev.length) * 1440 // 1 day later for each step
    }]);
  };

  const removeEmailStep = (index: number) => {
    setEmailSteps(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // Renumber all steps sequentially after removal
      return filtered.map((step, i) => ({
        ...step,
        step_number: i + 1
      }));
    });
  };

  const updateEmailStep = (index: number, field: keyof EmailStep, value: string | number) => {
    setEmailSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    ));
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templateId === 'new') {
      setEmailSubject('');
      setEmailBody('');
    } else {
      const template = emailTemplates.find(t => t.id === templateId);
      if (template) {
        setEmailSubject(template.subject);
        setEmailBody(template.body);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Caller Script Section */}
      <Card>
        <CardHeader>
          <CardTitle>Caller Script (Intro/Prompt)</CardTitle>
          <p className="text-sm text-muted-foreground">
            This is the exact phrase your AI will open with.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={callerPrompt}
            onChange={(e) => setCallerPrompt(e.target.value)}
            placeholder="Hi, this is Scott from PSN…"
            className="min-h-[100px]"
          />
          
          <div className="text-sm text-muted-foreground">
            <p>Available tokens: {'{first_name}'}, {'{last_name}'}, {'{company}'}, {'{company_name}'}, {'{email}'}, {'{job_title}'}</p>
          </div>
          
          <TemplatePreview
            title="Caller Script Preview"
            content={callerPrompt}
          />
        </CardContent>
      </Card>

      {/* Email Sequence Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Sequence</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Set up your email sequence steps with subject and body for each step
              </p>
            </div>
            <Button onClick={addEmailStep} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Email replies are automatically tracked via Reply-To addresses (scott+lead_id@premiersportsnetwork.com). 
              When leads reply, their status updates to "replied" and sequences stop automatically.
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground">
            <p>Available tokens: {'{first_name}'}, {'{last_name}'}, {'{company}'}, {'{company_name}'}, {'{email}'}, {'{job_title}'}</p>
          </div>

          {emailSteps.map((step, index) => (
            <Card key={index} className="border border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step {step.step_number}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Send {step.send_offset_minutes === 0 ? 'immediately' : `after ${step.send_offset_minutes / 1440} days`}
                    </span>
                  </div>
                  {emailSteps.length > 1 && (
                    <Button 
                      onClick={() => removeEmailStep(index)} 
                      variant="ghost" 
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={step.subject}
                      onChange={(e) => updateEmailStep(index, 'subject', e.target.value)}
                      placeholder="Email subject..."
                    />
                  </div>
                  <div>
                    <Label>Send After (days)</Label>
                    <Input
                      type="number"
                      value={step.send_offset_minutes / 1440}
                      onChange={(e) => updateEmailStep(index, 'send_offset_minutes', parseInt(e.target.value || '0') * 1440)}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Body</Label>
                  <Textarea
                    value={step.body}
                    onChange={(e) => updateEmailStep(index, 'body', e.target.value)}
                    placeholder="Email body..."
                    rows={4}
                  />
                </div>

                <TemplatePreview
                  title={`Step ${step.step_number} Preview`}
                  content={`Subject: ${step.subject}\n\n${step.body}`}
                />
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveMessaging} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Messaging'}
        </Button>
      </div>
    </div>
  );
};