import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Eye } from 'lucide-react';
import { Campaign, EmailTemplate, EmailStep, DeliveryRules, useCampaigns } from '@/hooks/useCampaigns';
import { useToast } from '@/hooks/use-toast';
import { localDatetimeInputToUtcIso, utcIsoToLocalDatetimeInput } from '@/utils/datetime';

// Simple debounce utility
function debounce<F extends (...args: any[]) => void>(fn: F, wait = 300) {
  let timeout: NodeJS.Timeout | null = null;
  return function (this: any, ...args: Parameters<F>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  } as F;
}

interface DeliveryRulesTabProps {
  campaign: Campaign;
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  emailSteps?: EmailStepForm[];
  onUpdateEmailSteps?: (steps: EmailStepForm[]) => void;
}

interface EmailStepForm {
  step_number: number;
  template_id: string | null;
  send_at: string | null;
  send_offset_minutes: number | null;
  is_active: boolean;
  when_to_send: 'exact' | 'delay';
  // For new campaigns - inline template creation
  subject?: string;
  body?: string;
}

export const DeliveryRulesTab = ({ campaign, onUpdateCampaign, emailSteps: propEmailSteps, onUpdateEmailSteps }: DeliveryRulesTabProps) => {
  const { emailTemplates, fetchEmailSteps, saveEmailSteps } = useCampaigns();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSteps, setEmailStepsState] = useState<EmailStepForm[]>(propEmailSteps || []);
  
  // Create ref for debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use provided email steps or manage internal state
  const setEmailSteps = (steps: EmailStepForm[]) => {
    setEmailStepsState(steps);
    if (onUpdateEmailSteps) {
      onUpdateEmailSteps(steps);
    }
  };

  // Parse delivery rules from campaign or use defaults
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

  const [deliveryRules, setDeliveryRules] = useState<DeliveryRules>(
    campaign.delivery_rules ? { ...defaultRules, ...campaign.delivery_rules } : defaultRules
  );

  // Update delivery rules when campaign changes (but not for new campaigns to avoid infinite loops)
  useEffect(() => {
    // Skip for new campaigns - they manage their own state
    if (campaign.id === 'new') return;
    
    const rules = campaign.delivery_rules ? { ...defaultRules, ...campaign.delivery_rules } : defaultRules;
    setDeliveryRules(rules);
  }, [campaign.id, campaign.delivery_rules]);

  // Load email steps on mount (only if not provided as props)
  useEffect(() => {
    if (propEmailSteps) {
      setEmailStepsState(propEmailSteps);
      return;
    }

    const loadEmailSteps = async () => {
      try {
        const steps = await fetchEmailSteps(campaign.id);
        const formSteps: EmailStepForm[] = steps.map(step => {
          // Find the associated template to populate subject/body
          const template = emailTemplates.find(t => t.id === step.template_id);
          
          return {
            step_number: step.step_number,
            template_id: step.template_id,
            send_at: step.send_at,
            send_offset_minutes: step.send_offset_minutes,
            is_active: step.is_active,
            when_to_send: step.send_at ? 'exact' : 'delay',
            // Populate subject/body from template or campaign's email template
            subject: template?.subject || campaign.email_template?.subject || '',
            body: template?.body || campaign.email_template?.body || '',
          };
        });
        setEmailSteps(formSteps);
      } catch (error) {
        console.error('Error loading email steps:', error);
      }
    };

    if (campaign.id !== 'new') {
      loadEmailSteps();
    }
  }, [campaign.id, fetchEmailSteps, propEmailSteps, emailTemplates, campaign.email_template]);

  // Get available templates for campaign
  const availableTemplates = emailTemplates.filter(
    template => template.campaign_id === null || template.campaign_id === campaign.id
  );

  const handleSaveRulesImmediate = async () => {
    // For new campaigns, just update local state without showing success toast
    if (campaign.id === 'new') {
      await onUpdateCampaign(campaign.id, {
        delivery_rules: deliveryRules,
        call_window_start: deliveryRules.call.window_start,
        call_window_end: deliveryRules.call.window_end,
        max_call_retries: deliveryRules.call.max_attempts,
        retry_minutes: deliveryRules.call.retry_minutes,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Validate email steps for mutual exclusivity and completeness
      if (deliveryRules.use_email) {
        for (const s of emailSteps) {
          const mode = s.when_to_send;
          const hasExact = !!s.send_at;
          const hasDelay = typeof s.send_offset_minutes === 'number' && s.send_offset_minutes > 0;
          
          if (mode === 'exact' && (!hasExact || s.send_offset_minutes !== null)) {
            toast({
              title: "Validation Error",
              description: `Step ${s.step_number}: please set a valid exact 'Send At' time and ensure delay is not set.`,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          if (mode === 'delay' && (!hasDelay || s.send_at !== null)) {
            toast({
              title: "Validation Error",
              description: `Step ${s.step_number}: please set a valid delay in minutes and ensure exact time is not set.`,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }
      }

      // Update campaign with delivery rules and legacy fields for backward compatibility
      await onUpdateCampaign(campaign.id, {
        delivery_rules: deliveryRules,
        call_window_start: deliveryRules.call.window_start,
        call_window_end: deliveryRules.call.window_end,
        max_call_retries: deliveryRules.call.max_attempts,
        retry_minutes: deliveryRules.call.retry_minutes,
      });

      // Save email steps if email is enabled
      if (deliveryRules.use_email) {
        const stepsToSave = emailSteps.map(step => ({
          step_number: step.step_number,
          template_id: step.template_id || null,
          is_active: !!step.is_active,
          // Enforce mutual exclusivity: exactly one field is set, the other is null
          send_at: step.when_to_send === 'exact' ? (step.send_at || null) : null,
          send_offset_minutes: step.when_to_send === 'delay' ? (step.send_offset_minutes ?? null) : null,
        }));

        await saveEmailSteps(campaign.id, stepsToSave);
      }

      toast({
        title: "Success",
        description: "Delivery rules saved successfully",
      });
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save delivery rules",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  // Debounced version with 100ms delay (reduced for better responsiveness)
  const handleSaveRules = useCallback(() => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveRulesImmediate();
    }, 100);
  }, [handleSaveRulesImmediate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const addEmailStep = () => {
    if (emailSteps.length >= 5) return;
    
    const newStep: EmailStepForm = {
      step_number: emailSteps.length + 1,
      template_id: null,
      send_at: null,
      send_offset_minutes: null,
      is_active: true,
      when_to_send: 'delay',
      // Always include subject/body for inline editing
      subject: '',
      body: '',
    };
    
    setEmailSteps([...emailSteps, newStep]);
  };

  const removeEmailStep = (index: number) => {
    const newSteps = emailSteps.filter((_, i) => i !== index);
    // Renumber steps
    const renumberedSteps = newSteps.map((step, i) => ({
      ...step,
      step_number: i + 1,
    }));
    setEmailSteps(renumberedSteps);
  };

  const updateEmailStep = (index: number, updates: Partial<EmailStepForm>) => {
    const newSteps = [...emailSteps];
    newSteps[index] = { ...newSteps[index], ...updates };
    
    // Enforce mutual exclusivity: only one timing field can be set
    if (updates.when_to_send === 'exact') {
      newSteps[index].send_offset_minutes = null;
    } else if (updates.when_to_send === 'delay') {
      newSteps[index].send_at = null;
    }
    
    // Additional enforcement if updating send_at or send_offset_minutes directly
    if ('send_at' in updates && updates.send_at !== undefined) {
      newSteps[index].send_offset_minutes = null;
      newSteps[index].when_to_send = 'exact';
    }
    if ('send_offset_minutes' in updates && updates.send_offset_minutes !== null && updates.send_offset_minutes !== undefined) {
      newSteps[index].send_at = null;
      newSteps[index].when_to_send = 'delay';
    }
    
    setEmailSteps(newSteps);
  };

  const isValidStep = (step: EmailStepForm) => {
    // Always check subject and body since we're using inline editing
    if (!step.subject?.trim() || !step.body?.trim()) return false;
    if (step.when_to_send === 'exact' && !step.send_at) return false;
    if (step.when_to_send === 'delay' && (!step.send_offset_minutes || step.send_offset_minutes <= 0)) return false;
    return true;
  };

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

  return (
    <div className="space-y-6">
      {/* Delivery Options */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="use-calls">Use AI Caller</Label>
              <p className="text-sm text-muted-foreground">Enable automated phone calls for this campaign</p>
            </div>
            <Switch
              id="use-calls"
              checked={deliveryRules.use_calls}
              onCheckedChange={(checked) => {
                const newRules = { ...deliveryRules, use_calls: checked };
                setDeliveryRules(newRules);
                // Update parent immediately for new campaigns, auto-save for existing
                if (campaign.id === 'new') {
                  onUpdateCampaign(campaign.id, { delivery_rules: newRules });
                } else {
                  handleSaveRules();
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="use-email">Use Email Outreach</Label>
              <p className="text-sm text-muted-foreground">Enable email sequences for this campaign</p>
            </div>
            <Switch
              id="use-email"
              checked={deliveryRules.use_email}
              onCheckedChange={(checked) => {
                const newRules = { ...deliveryRules, use_email: checked };
                setDeliveryRules(newRules);
                // Update parent immediately for new campaigns, auto-save for existing
                if (campaign.id === 'new') {
                  onUpdateCampaign(campaign.id, { delivery_rules: newRules });
                } else {
                  handleSaveRules();
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Caller Settings */}
      {deliveryRules.use_calls && (
        <Card>
          <CardHeader>
            <CardTitle>Caller Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-attempts">Max Attempts</Label>
                <Input
                  id="max-attempts"
                  type="number"
                  min="1"
                  max="10"
                  value={deliveryRules.call.max_attempts}
                  onChange={(e) => {
                    setDeliveryRules(prev => ({
                      ...prev,
                      call: { ...prev.call, max_attempts: parseInt(e.target.value) || 1 }
                    }));
                    if (campaign.id !== 'new') {
                      handleSaveRules();
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="retry-minutes">Retry Minutes</Label>
                <Input
                  id="retry-minutes"
                  type="number"
                  min="5"
                  max="1440"
                  value={deliveryRules.call.retry_minutes}
                  onChange={(e) => {
                    setDeliveryRules(prev => ({
                      ...prev,
                      call: { ...prev.call, retry_minutes: parseInt(e.target.value) || 5 }
                    }));
                    if (campaign.id !== 'new') {
                      handleSaveRules();
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="window-start">Call Window Start Hour (0-23)</Label>
                <Input
                  id="window-start"
                  type="number"
                  min="0"
                  max="23"
                  value={deliveryRules.call.window_start}
                  onChange={(e) => {
                    setDeliveryRules(prev => ({
                      ...prev,
                      call: { ...prev.call, window_start: parseInt(e.target.value) || 0 }
                    }));
                    if (campaign.id !== 'new') {
                      handleSaveRules();
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="window-end">Call Window End Hour (1-24)</Label>
                <Input
                  id="window-end"
                  type="number"
                  min="1"
                  max="24"
                  value={deliveryRules.call.window_end}
                  onChange={(e) => {
                    setDeliveryRules(prev => ({
                      ...prev,
                      call: { ...prev.call, window_end: parseInt(e.target.value) || 1 }
                    }));
                    if (campaign.id !== 'new') {
                      handleSaveRules();
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Sequence */}
      {deliveryRules.use_email && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Email Sequence</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure up to 5 email steps in your sequence
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="send-initial">Send Initial Email Immediately</Label>
                <p className="text-sm text-muted-foreground">Send the first email as soon as the lead is due</p>
              </div>
              <Switch
                id="send-initial"
                checked={deliveryRules.email.send_initial}
                onCheckedChange={(checked) => {
                  setDeliveryRules(prev => ({
                    ...prev,
                    email: { ...prev.email, send_initial: checked }
                  }));
                  if (campaign.id !== 'new') {
                    handleSaveRules();
                  }
                }}
              />
            </div>

            {/* Email Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Email Steps</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEmailStep}
                  disabled={emailSteps.length >= 5}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Step ({emailSteps.length}/5)
                </Button>
              </div>

              {emailSteps.map((step, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Step {step.step_number}</Badge>
                        {!isValidStep(step) && (
                          <Badge variant="destructive">Incomplete</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={step.is_active}
                          onCheckedChange={(checked) => updateEmailStep(index, { is_active: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmailStep(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                   <CardContent className="space-y-4">
                      {/* Always show inline template creation */}
                      <div>
                        <Label>Subject Line</Label>
                        <Input
                          value={step.subject || ''}
                          onChange={(e) => updateEmailStep(index, { subject: e.target.value })}
                          placeholder="Quick question about {{company_name}}"
                        />
                      </div>
                      <div>
                        <Label>Email Body</Label>
                        <Textarea
                          value={step.body || ''}
                          onChange={(e) => updateEmailStep(index, { body: e.target.value })}
                          placeholder="Hi {{first_name}}, I noticed that {{company_name}} is..."
                          rows={4}
                        />
                      </div>
                      {step.subject && step.body && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4" />
                            <span className="text-sm font-medium">Live Preview</span>
                          </div>
                          <div className="text-sm space-y-2">
                            <div>
                              <strong>Subject:</strong> {replaceVariables(step.subject, sampleLead)}
                            </div>
                            <div>
                              <strong>Body:</strong>
                              <div className="whitespace-pre-wrap mt-1 p-2 bg-background rounded border">
                                {replaceVariables(step.body, sampleLead)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    <div>
                      <Label>When to Send</Label>
                      <RadioGroup
                        value={step.when_to_send}
                        onValueChange={(value: 'exact' | 'delay') => updateEmailStep(index, { when_to_send: value })}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="exact" id={`exact-${index}`} />
                          <Label htmlFor={`exact-${index}`}>At exact date/time</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="delay" id={`delay-${index}`} />
                          <Label htmlFor={`delay-${index}`}>After delay</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {step.when_to_send === 'exact' && (
                      <div>
                        <Label>Send At</Label>
                        <Input
                          type="datetime-local"
                          value={utcIsoToLocalDatetimeInput(step.send_at)}
                          onChange={(e) => updateEmailStep(index, { send_at: localDatetimeInputToUtcIso(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Times shown in your local timezone; saved in UTC
                        </p>
                      </div>
                    )}

                    {step.when_to_send === 'delay' && (
                      <div>
                        <Label>Delay (minutes)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={step.send_offset_minutes || ''}
                          onChange={(e) => updateEmailStep(index, { 
                            send_offset_minutes: parseInt(e.target.value) || null 
                          })}
                          placeholder="e.g., 1440 for 1 day"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {emailSteps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No email steps configured. Click "Add Step" to create your first email sequence step.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveRules} 
          disabled={isLoading}
          aria-busy={isLoading ? 'true' : 'false'}
        >
          {isLoading ? 'Saving...' : 'Save Delivery Rules'}
        </Button>
      </div>
    </div>
  );
};