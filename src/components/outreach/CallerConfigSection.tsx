import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Eye } from 'lucide-react';

export interface CallerConfig {
  opening_script: string;
  goal: 'qualify' | 'book_meeting' | 'live_transfer';
  tone: 'friendly' | 'professional' | 'casual' | 'high_energy';
  disclose_ai: boolean;
  max_duration_sec: number;
  qualify_questions: string[];
  objections: Array<{ objection: string; response: string }>;
  booking_link?: string;
  transfer_number?: string;
  voicemail_script?: string;
  not_interested_policy: 'mark_do_not_contact' | 'send_followup_email' | 'none';
  disclaimer?: string;
}

interface CallerConfigSectionProps {
  config: CallerConfig;
  onChange: (config: CallerConfig) => void;
}

export const CallerConfigSection = ({ config, onChange }: CallerConfigSectionProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sample lead for preview
  const sampleLead = {
    first_name: 'John',
    last_name: 'Smith',
    company_name: 'TechCorp Inc.',
    job_title: 'Marketing Director'
  };

  const replaceVariables = (text: string, lead: any) => {
    return text
      .replace(/\{first_name\}/g, lead.first_name || '[First Name]')
      .replace(/\{last_name\}/g, lead.last_name || '[Last Name]')
      .replace(/\{company_name\}/g, lead.company_name || '[Company]')
      .replace(/\{job_title\}/g, lead.job_title || '[Job Title]');
  };

  const validateConfig = (newConfig: CallerConfig) => {
    const newErrors: Record<string, string> = {};

    if (newConfig.max_duration_sec < 30 || newConfig.max_duration_sec > 900) {
      newErrors.max_duration_sec = 'Duration must be between 30 and 900 seconds';
    }

    if (newConfig.transfer_number && !/^\+\d{7,15}$/.test(newConfig.transfer_number)) {
      newErrors.transfer_number = 'Transfer number must be in E.164 format (+1234567890)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateConfig = (updates: Partial<CallerConfig>) => {
    const newConfig = { ...config, ...updates };
    validateConfig(newConfig);
    onChange(newConfig);
  };

  const addQualificationQuestion = () => {
    updateConfig({
      qualify_questions: [...config.qualify_questions, '']
    });
  };

  const updateQualificationQuestion = (index: number, value: string) => {
    const newQuestions = [...config.qualify_questions];
    newQuestions[index] = value;
    updateConfig({ qualify_questions: newQuestions });
  };

  const removeQualificationQuestion = (index: number) => {
    const newQuestions = config.qualify_questions.filter((_, i) => i !== index);
    updateConfig({ qualify_questions: newQuestions });
  };

  const addObjection = () => {
    updateConfig({
      objections: [...config.objections, { objection: '', response: '' }]
    });
  };

  const updateObjection = (index: number, field: 'objection' | 'response', value: string) => {
    const newObjections = [...config.objections];
    newObjections[index] = { ...newObjections[index], [field]: value };
    updateConfig({ objections: newObjections });
  };

  const removeObjection = (index: number) => {
    const newObjections = config.objections.filter((_, i) => i !== index);
    updateConfig({ objections: newObjections });
  };

  return (
    <div className="space-y-6">
      {/* Opening Script */}
      <div>
        <Label htmlFor="opening-script">Opening Script</Label>
        <Textarea
          id="opening-script"
          value={config.opening_script}
          onChange={(e) => updateConfig({ opening_script: e.target.value })}
          placeholder="Hi {first_name}, this is Scott from PSN..."
          rows={4}
          className="mt-1"
        />
        {config.opening_script && (
          <div className="mt-2 p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Live Preview</span>
            </div>
            <div className="text-sm p-2 bg-background rounded border whitespace-pre-wrap">
              {replaceVariables(config.opening_script, sampleLead)}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Primary Goal */}
        <div>
          <Label htmlFor="goal">Primary Goal</Label>
          <Select value={config.goal} onValueChange={(value: CallerConfig['goal']) => updateConfig({ goal: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qualify">Qualify Lead</SelectItem>
              <SelectItem value="book_meeting">Book Meeting</SelectItem>
              <SelectItem value="live_transfer">Live Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tone */}
        <div>
          <Label htmlFor="tone">Tone</Label>
          <Select value={config.tone} onValueChange={(value: CallerConfig['tone']) => updateConfig({ tone: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="high_energy">High Energy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* AI Disclosure */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="disclose-ai">Disclose AI?</Label>
            <p className="text-sm text-muted-foreground">Should the caller mention it's AI?</p>
          </div>
          <Switch
            id="disclose-ai"
            checked={config.disclose_ai}
            onCheckedChange={(checked) => updateConfig({ disclose_ai: checked })}
          />
        </div>

        {/* Max Duration */}
        <div>
          <Label htmlFor="max-duration">Max Call Duration (seconds)</Label>
          <Input
            id="max-duration"
            type="number"
            min="30"
            max="900"
            value={config.max_duration_sec}
            onChange={(e) => updateConfig({ max_duration_sec: parseInt(e.target.value) || 30 })}
            className={errors.max_duration_sec ? 'border-destructive' : ''}
          />
          {errors.max_duration_sec && (
            <p className="text-sm text-destructive mt-1">{errors.max_duration_sec}</p>
          )}
        </div>
      </div>

      {/* Qualification Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Qualification Questions</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={addQualificationQuestion}
              disabled={config.goal === 'live_transfer'}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>
          {config.goal === 'live_transfer' && (
            <p className="text-sm text-muted-foreground">
              Qualification questions are disabled for live transfer calls
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {config.qualify_questions.map((question, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => updateQualificationQuestion(index, e.target.value)}
                placeholder="Are you involved in partnerships at {company_name}?"
                disabled={config.goal === 'live_transfer'}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeQualificationQuestion(index)}
                disabled={config.goal === 'live_transfer'}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {config.qualify_questions.length === 0 && config.goal !== 'live_transfer' && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No qualification questions added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Objection Handling */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Objection → Response</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={addObjection}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Objection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.objections.map((obj, index) => (
            <Card key={index} className="border-l-4 border-l-orange-400">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Objection {index + 1}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeObjection(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label>Objection</Label>
                  <Input
                    value={obj.objection}
                    onChange={(e) => updateObjection(index, 'objection', e.target.value)}
                    placeholder="Not a good time"
                  />
                </div>
                <div>
                  <Label>Response</Label>
                  <Textarea
                    value={obj.response}
                    onChange={(e) => updateObjection(index, 'response', e.target.value)}
                    placeholder="No problem—30 seconds for context and I'll email details?"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          {config.objections.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No objection responses added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Conditional Fields */}
      {config.goal === 'book_meeting' && (
        <div>
          <Label htmlFor="booking-link">Meeting Booking Link</Label>
          <Input
            id="booking-link"
            type="url"
            value={config.booking_link || ''}
            onChange={(e) => updateConfig({ booking_link: e.target.value })}
            placeholder="https://cal.com/psn/intro"
          />
        </div>
      )}

      {config.goal === 'live_transfer' && (
        <div>
          <Label htmlFor="transfer-number">Live Transfer Number (E.164 format)</Label>
          <Input
            id="transfer-number"
            value={config.transfer_number || ''}
            onChange={(e) => updateConfig({ transfer_number: e.target.value })}
            placeholder="+442012345678"
            className={errors.transfer_number ? 'border-destructive' : ''}
          />
          {errors.transfer_number && (
            <p className="text-sm text-destructive mt-1">{errors.transfer_number}</p>
          )}
        </div>
      )}

      {/* Voicemail Script */}
      <div>
        <Label htmlFor="voicemail-script">Voicemail Script (Optional)</Label>
        <Textarea
          id="voicemail-script"
          value={config.voicemail_script || ''}
          onChange={(e) => updateConfig({ voicemail_script: e.target.value })}
          placeholder="Sorry I missed you—this is Scott at PSN..."
          rows={3}
        />
      </div>

      {/* Not Interested Policy */}
      <div>
        <Label htmlFor="not-interested-policy">If Not Interested → What to do?</Label>
        <Select 
          value={config.not_interested_policy} 
          onValueChange={(value: CallerConfig['not_interested_policy']) => updateConfig({ not_interested_policy: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mark_do_not_contact">Mark as Do Not Contact</SelectItem>
            <SelectItem value="send_followup_email">Send Follow-up Email</SelectItem>
            <SelectItem value="none">No Action</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compliance Disclaimer */}
      <div>
        <Label htmlFor="disclaimer">Compliance/Disclosure Line (Optional)</Label>
        <Textarea
          id="disclaimer"
          value={config.disclaimer || ''}
          onChange={(e) => updateConfig({ disclaimer: e.target.value })}
          placeholder="This call may be recorded for quality."
          rows={2}
        />
      </div>
    </div>
  );
};