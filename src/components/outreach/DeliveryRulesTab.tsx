import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { Campaign, EmailTemplate, EmailStep, DeliveryRules, useCampaigns } from '@/hooks/useCampaigns';
import { useToast } from '@/hooks/use-toast';

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
}

export const DeliveryRulesTab = ({ campaign, onUpdateCampaign, emailSteps: propEmailSteps, onUpdateEmailSteps }: DeliveryRulesTabProps) => {
  const { emailTemplates, fetchEmailSteps, saveEmailSteps } = useCampaigns();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSteps, setEmailStepsState] = useState<EmailStepForm[]>(propEmailSteps || []);

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

  // Load email steps on mount (only if not provided as props)
  useEffect(() => {
    if (propEmailSteps) {
      setEmailStepsState(propEmailSteps);
      return;
    }

    const loadEmailSteps = async () => {
      try {
        const steps = await fetchEmailSteps(campaign.id);
        const formSteps: EmailStepForm[] = steps.map(step => ({
          step_number: step.step_number,
          template_id: step.template_id,
          send_at: step.send_at,
          send_offset_minutes: step.send_offset_minutes,
          is_active: step.is_active,
          when_to_send: step.send_at ? 'exact' : 'delay',
        }));
        setEmailSteps(formSteps);
      } catch (error) {
        console.error('Error loading email steps:', error);
      }
    };

    if (campaign.id !== 'new') {
      loadEmailSteps();
    }
  }, [campaign.id, fetchEmailSteps, propEmailSteps]);

  // Get available templates for campaign
  const availableTemplates = emailTemplates.filter(
    template => template.campaign_id === null || template.campaign_id === campaign.id
  );

  const handleSaveRules = async () => {
    setIsLoading(true);
    try {
      // Update campaign with delivery rules
      await onUpdateCampaign(campaign.id, {
        delivery_rules: deliveryRules,
      });

      // Save email steps if email is enabled
      if (deliveryRules.use_email && campaign.id !== 'new') {
        const stepsToSave = emailSteps.map(step => ({
          step_number: step.step_number,
          template_id: step.template_id,
          send_at: step.when_to_send === 'exact' ? step.send_at : null,
          send_offset_minutes: step.when_to_send === 'delay' ? step.send_offset_minutes : null,
          is_active: step.is_active,
        }));

        await saveEmailSteps(campaign.id, stepsToSave);
      }

      toast({
        title: "Success",
        description: "Delivery rules saved successfully",
      });
    } catch (error) {
      console.error('Error saving rules:', error);
    }
    setIsLoading(false);
  };

  const addEmailStep = () => {
    if (emailSteps.length >= 5) return;
    
    const newStep: EmailStepForm = {
      step_number: emailSteps.length + 1,
      template_id: null,
      send_at: null,
      send_offset_minutes: null,
      is_active: true,
      when_to_send: 'delay',
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
    
    // Clear the other timing field when switching
    if (updates.when_to_send === 'exact') {
      newSteps[index].send_offset_minutes = null;
    } else if (updates.when_to_send === 'delay') {
      newSteps[index].send_at = null;
    }
    
    setEmailSteps(newSteps);
  };

  const isValidStep = (step: EmailStepForm) => {
    if (!step.template_id) return false;
    if (step.when_to_send === 'exact' && !step.send_at) return false;
    if (step.when_to_send === 'delay' && (!step.send_offset_minutes || step.send_offset_minutes <= 0)) return false;
    return true;
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
              onCheckedChange={(checked) => setDeliveryRules(prev => ({ ...prev, use_calls: checked }))}
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
              onCheckedChange={(checked) => setDeliveryRules(prev => ({ ...prev, use_email: checked }))}
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
                  onChange={(e) => setDeliveryRules(prev => ({
                    ...prev,
                    call: { ...prev.call, max_attempts: parseInt(e.target.value) || 1 }
                  }))}
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
                  onChange={(e) => setDeliveryRules(prev => ({
                    ...prev,
                    call: { ...prev.call, retry_minutes: parseInt(e.target.value) || 5 }
                  }))}
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
                  onChange={(e) => setDeliveryRules(prev => ({
                    ...prev,
                    call: { ...prev.call, window_start: parseInt(e.target.value) || 0 }
                  }))}
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
                  onChange={(e) => setDeliveryRules(prev => ({
                    ...prev,
                    call: { ...prev.call, window_end: parseInt(e.target.value) || 1 }
                  }))}
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
                onCheckedChange={(checked) => setDeliveryRules(prev => ({
                  ...prev,
                  email: { ...prev.email, send_initial: checked }
                }))}
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
                    <div>
                      <Label>Template</Label>
                      <Select
                        value={step.template_id || ''}
                        onValueChange={(value) => updateEmailStep(index, { template_id: value || null })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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
                          value={step.send_at || ''}
                          onChange={(e) => updateEmailStep(index, { send_at: e.target.value || null })}
                        />
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
        <Button onClick={handleSaveRules} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Delivery Rules'}
        </Button>
      </div>
    </div>
  );
};