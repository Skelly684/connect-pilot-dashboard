
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';

interface Lead {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  job_title?: string;
  headline?: string;
  company?: string;
  companyName?: string;
  email?: string;
  emailAddress?: string;
  phone?: string;
  location?: string;
  rawAddress?: string;
  stateName?: string;
  cityName?: string;
  countryName?: string;
  status?: string;
  contactPhoneNumbers?: Array<{ sanitizedNumber?: string; rawNumber?: string }>;
  last_call_status?: string;
  next_call_at?: string | null;
  call_attempts?: number;
}

export const useLeads = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addNotification } = useNotifications();

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateLeadStatus = async (leadIds: string[], newStatus: string) => {
    try {
      // Get current lead data to track status changes and for backend API
      const { data: currentLeads } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds);

      const updates: any = { status: newStatus };
      
      if (newStatus === 'accepted') {
        updates.accepted_at = new Date().toISOString();
        updates.reviewed_at = new Date().toISOString();
      } else if (newStatus === 'rejected') {
        updates.reviewed_at = new Date().toISOString();
      } else if (newStatus === 'sent_for_contact') {
        updates.sent_for_contact_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('leads')
        .update(updates)
        .in('id', leadIds);

      if (error) throw error;

      // Create notifications for status changes (except "new" or "contacted")
      if (currentLeads && newStatus !== 'new' && newStatus !== 'contacted') {
        currentLeads.forEach(lead => {
          const leadName = lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Lead';
          addNotification(leadName, lead.id, lead.status || 'unknown', newStatus);
        });
      }

      // Automatically send accepted leads to FastAPI backend
      if (newStatus === 'accepted' && currentLeads) {
        try {
          // Format leads for FastAPI backend
          const formattedLeads = currentLeads.map(lead => ({
            id: lead.id,
            first_name: lead.first_name || '',
            last_name: lead.last_name || '',
            company_name: lead.company_name || lead.company || '',
            phone: lead.phone || (lead.contact_phone_numbers ? 
              JSON.parse(lead.contact_phone_numbers as string)[0]?.rawNumber || 
              JSON.parse(lead.contact_phone_numbers as string)[0]?.sanitizedNumber : ''),
            email_address: lead.email_address || lead.email || '',
            campaign_id: lead.campaign_id || undefined
          }));

          const payload = {
            leads: formattedLeads,
            emailTemplateId: undefined // optional
          };

          console.log("Sending to FastAPI backend:", `${API_BASE_URL}${API_ENDPOINTS.ACCEPTED_LEADS}`, payload);

          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ACCEPTED_LEADS}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`FastAPI backend returned ${response.status}: ${response.statusText}`);
          }

          const responseData = await response.json();
          console.log("FastAPI backend response:", responseData);
          
          toast({
            title: "Success",
            description: `Accepted ${leadIds.length} lead(s) and sent to backend`,
          });
        } catch (backendError) {
          console.error('Error sending leads to FastAPI backend:', backendError);
          toast({
            title: "Warning",
            description: "Leads accepted but failed to send to backend",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: `Updated ${leadIds.length} lead(s) status to ${newStatus.replace('_', ' ')}`,
        });
      }

      await fetchLeads(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
      return false;
    }
  };

  const sendAcceptedLeadsToBackend = async (acceptedLeads: any[], campaignId?: string) => {
    try {
      // Prepare the leads data for the backend
      const leadsData = acceptedLeads.map(lead => ({
        id: lead.id,
        name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        firstName: lead.first_name,
        lastName: lead.last_name,
        jobTitle: lead.job_title,
        company: lead.company || lead.company_name,
        email: lead.email || lead.email_address,
        phone: lead.phone,
        location: lead.location,
        headline: lead.headline,
        status: lead.status
      }));

      console.log("Sending accepted leads to backend:", leadsData);

      const { data, error } = await supabase.functions.invoke('process-leads', {
        body: {
          leads: leadsData,
          emailTemplateId: campaignId
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to process leads');
      }

      console.log("Backend response:", data);

      // Update the leads status to 'sent_for_contact'
      const leadIds = acceptedLeads.map(lead => lead.id);
      await updateLeadStatus(leadIds, 'sent_for_contact');

      toast({
        title: "Success",
        description: `Sent ${acceptedLeads.length} leads to backend for outreach`,
      });

      return true;
    } catch (error) {
      console.error('Error sending leads to backend:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send leads to backend",
        variant: "destructive",
      });
      return false;
    }
  };

  const saveLeads = async (newLeads: Lead[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save leads",
          variant: "destructive",
        });
        return false;
      }

      const leadsToInsert = newLeads.map(lead => ({
        user_id: user.id,
        name: lead.name,
        first_name: lead.firstName,
        last_name: lead.lastName,
        job_title: lead.jobTitle || lead.job_title,
        headline: lead.headline,
        company: lead.company || lead.companyName,
        company_name: lead.companyName,
        email: lead.email || lead.emailAddress,
        email_address: lead.emailAddress,
        phone: lead.phone,
        location: lead.location || lead.rawAddress,
        raw_address: lead.rawAddress,
        state_name: lead.stateName,
        city_name: lead.cityName,
        country_name: lead.countryName,
        status: 'pending_review', // Set new leads to pending_review instead of new
        contact_phone_numbers: lead.contactPhoneNumbers ? JSON.stringify(lead.contactPhoneNumbers) : null,
      }));

      const { error } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Saved ${newLeads.length} leads to database for review`,
      });

      await fetchLeads(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error saving leads:', error);
      toast({
        title: "Error",
        description: "Failed to save leads to database",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteLeads = async (leadIds: string[]) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${leadIds.length} lead(s)`,
      });

      await fetchLeads(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({
        title: "Error",
        description: "Failed to delete leads",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteAllLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "All leads have been deleted",
      });

      await fetchLeads(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error deleting all leads:', error);
      toast({
        title: "Error",
        description: "Failed to delete all leads",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return {
    leads,
    isLoading,
    fetchLeads,
    saveLeads,
    deleteLeads,
    deleteAllLeads,
    updateLeadStatus,
    sendAcceptedLeadsToBackend,
  };
};
