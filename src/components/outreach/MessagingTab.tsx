import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Campaign, EmailTemplate } from '@/hooks/useCampaigns';
import { TemplatePreview } from './TemplatePreview';
import { supabase } from '@/integrations/supabase/client';

interface MessagingTabProps {
  campaign: Campaign;
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  onUpdateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => Promise<void>;
  onCreateEmailTemplate: (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<EmailTemplate>;
  emailTemplates: EmailTemplate[];
}

export const MessagingTab = ({
  campaign,
  onUpdateCampaign,
  onUpdateEmailTemplate,
  onCreateEmailTemplate,
  emailTemplates
}: MessagingTabProps) => {
  const [callerPrompt, setCallerPrompt] = useState(campaign.caller_prompt);
  const [emailSubject, setEmailSubject] = useState(campaign.email_template?.subject || '');
  const [emailBody, setEmailBody] = useState(campaign.email_template?.body || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(campaign.email_template_id || 'new');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveMessaging = async () => {
    setIsLoading(true);
    try {
      // Update caller prompt
      await onUpdateCampaign(campaign.id, { caller_prompt: callerPrompt });

      // Handle email template
      if (selectedTemplateId === 'new' || !campaign.email_template_id) {
        // Create new template - get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('User not authenticated');
          return;
        }
        
        const newTemplate = await onCreateEmailTemplate({
          name: `Campaign – ${campaign.name}`,
          subject: emailSubject,
          body: emailBody,
          user_id: user.id,
          campaign_id: campaign.id,
          is_active: true
        });
        
        // Link template to campaign
        await onUpdateCampaign(campaign.id, { email_template_id: newTemplate.id });
      } else {
        // Update existing template
        await onUpdateEmailTemplate(selectedTemplateId, {
          subject: emailSubject,
          body: emailBody
        });
      }
    } catch (error) {
      console.error('Error saving messaging:', error);
    }
    setIsLoading(false);
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
          
          <TemplatePreview
            title="Caller Script Preview"
            content={callerPrompt}
          />
        </CardContent>
      </Card>

      {/* Email Template Section */}
      <Card>
        <CardHeader>
          <CardTitle>Email Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="template-select">Template</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Create new inline</SelectItem>
                {emailTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          <div>
            <Label htmlFor="email-body">Body</Label>
            <Textarea
              id="email-body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Email body..."
              className="min-h-[200px]"
            />
          </div>

          <TemplatePreview
            title="Email Preview"
            content={`Subject: ${emailSubject}\n\n${emailBody}`}
          />
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