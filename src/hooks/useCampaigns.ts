import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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

export interface DeliveryRules {
  use_email: boolean;
  use_calls: boolean;
  call: {
    max_attempts: number;
    retry_minutes: number;
    window_start: number;
    window_end: number;
  };
  email: {
    send_initial: boolean;
  };
  caller?: CallerConfig;
}

export interface Campaign {
  id: string;
  user_id: string | null;
  name: string;
  from_email: string;
  from_name: string;
  email_template_id: string | null;
  email_daily_cap: number;
  caller_prompt: string;
  call_window_start: number;
  call_window_end: number;
  max_call_retries: number;
  retry_minutes: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  delivery_rules?: any; // Use any for JSON compatibility with Supabase
  email_template?: EmailTemplate;
}

export interface EmailStep {
  id?: string;
  campaign_id: string;
  step_number: number;
  template_id: string | null;
  send_at: string | null;
  send_offset_minutes: number | null;
  is_active: boolean;
}

export interface EmailTemplate {
  id: string;
  user_id: string | null;
  campaign_id: string | null;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailSteps, setEmailSteps] = useState<EmailStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          email_templates!campaigns_email_template_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Error fetching email templates:', error);
    }
  };

  const fetchEmailSteps = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_email_steps')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('step_number');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching email steps:', error);
      return [];
    }
  };

  const saveEmailSteps = async (campaignId: string, steps: Omit<EmailStep, 'id' | 'campaign_id'>[]) => {
    try {
      // Delete existing steps
      await supabase
        .from('campaign_email_steps')
        .delete()
        .eq('campaign_id', campaignId);

      // Insert new steps
      if (steps.length > 0) {
        const stepsWithCampaignId = steps.map(step => ({
          ...step,
          campaign_id: campaignId
        }));

        const { error } = await supabase
          .from('campaign_email_steps')
          .insert(stepsWithCampaignId);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Email steps saved successfully",
      });
    } catch (error) {
      console.error('Error saving email steps:', error);
      toast({
        title: "Error",
        description: "Failed to save email steps",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createCampaign = async (campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'email_template'>) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Ensure user_id is set to current user
      const campaignWithUser = {
        ...campaignData,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignWithUser)
        .select()
        .single();

      if (error) throw error;
      
      await fetchCampaigns();
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchCampaigns();
      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createEmailTemplate = async (templateData: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...templateData,
          is_active: false // Templates managed per campaign
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchEmailTemplates();
      return data;
    } catch (error) {
      console.error('Error creating email template:', error);
      toast({
        title: "Error",
        description: "Failed to create email template",
        variant: "destructive",
      });
      throw error;
    }
  };

  const setDefaultCampaign = async (id: string, isDefault: boolean = true) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ is_default: isDefault })
        .eq('id', id);

      if (error) throw error;
      
      await fetchCampaigns();
      toast({
        title: "Success",
        description: isDefault ? "Default campaign set successfully" : "Default campaign unset successfully",
      });
    } catch (error) {
      console.error('Error updating default campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update default campaign",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getDefaultCampaign = () => {
    return campaigns.find(c => c.is_default);
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchCampaigns();
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateEmailTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchEmailTemplates();
      await fetchCampaigns(); // Refresh campaigns to get updated template data
    } catch (error) {
      console.error('Error updating email template:', error);
      toast({
        title: "Error",
        description: "Failed to update email template",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCampaigns(), fetchEmailTemplates()]);
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  return {
    campaigns,
    emailTemplates,
    emailSteps,
    isLoading,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createEmailTemplate,
    updateEmailTemplate,
    setDefaultCampaign,
    getDefaultCampaign,
    fetchEmailSteps,
    saveEmailSteps,
  };
};