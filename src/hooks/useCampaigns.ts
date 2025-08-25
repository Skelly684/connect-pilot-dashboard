import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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
  email_template?: EmailTemplate;
}

export interface EmailTemplate {
  id: string;
  user_id: string | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          email_template:email_templates(*)
        `)
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

  const createCampaign = async (campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'email_template'>) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
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

  const setDefaultCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      await fetchCampaigns();
      toast({
        title: "Success",
        description: "Default campaign updated successfully",
      });
    } catch (error) {
      console.error('Error setting default campaign:', error);
      toast({
        title: "Error",
        description: "Failed to set default campaign",
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
    isLoading,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createEmailTemplate,
    updateEmailTemplate,
    setDefaultCampaign,
    getDefaultCampaign,
  };
};