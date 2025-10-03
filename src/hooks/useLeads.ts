
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationsContext';
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
  
  // Auto-sync functionality for CRM integrations
  const triggerAutoSync = async () => {
    try {
      const { useCRMIntegrations } = await import('@/hooks/useCRMIntegrations');
      const { autoSyncRepliedLeads } = useCRMIntegrations();
      await autoSyncRepliedLeads();
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, last_reply_at, last_reply_from, last_reply_subject, last_reply_snippet')
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

  const updateLeadStatus = async (leadIds: string[], newStatus: string, campaignId?: string) => {
    console.log('🚀 useLeads.updateLeadStatus CALLED with:', { leadIds, newStatus, campaignId });
    try {
      // Get current lead data to track status changes and for backend API
      const { data: currentLeads } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds);

      console.log('📊 useLeads: Retrieved current leads:', currentLeads);

      const updates: any = { status: newStatus };
      
      if (newStatus === 'accepted') {
        updates.accepted_at = new Date().toISOString();
        updates.reviewed_at = new Date().toISOString();
        // Set campaign_id if provided
        if (campaignId) {
          updates.campaign_id = campaignId;
        }
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

      console.log('✅ useLeads: Status updated in database successfully');

      // Create notifications for ALL status changes
      if (currentLeads && currentLeads.length > 0) {
        console.log('📢 useLeads: Processing notifications for', currentLeads.length, 'leads, newStatus:', newStatus);
        currentLeads.forEach(lead => {
          const leadName = lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Lead';
          const oldStatus = lead.status || 'unknown';
          console.log(`📢 useLeads: Calling addNotification for "${leadName}" (${lead.id}) from "${oldStatus}" to "${newStatus}"`);
          addNotification(leadName, lead.id, oldStatus, newStatus);
          console.log('📢 useLeads: addNotification called successfully');
        });
      } else {
        console.log('⏭️ useLeads: Skipping notifications - newStatus:', newStatus, 'leadsCount:', currentLeads?.length);
      }

      // Trigger auto-sync to CRM when leads change to "replied" status
      if (newStatus === 'replied') {
        try {
          await triggerAutoSync();
        } catch (error) {
          console.error('Failed to trigger auto-sync for replied leads:', error);
        }
      }

      // Automatically send accepted leads to FastAPI backend
      if (newStatus === 'accepted' && currentLeads) {
        try {
          // Get campaign details to include emailTemplateId
          let emailTemplateId: string | undefined = undefined;
          const leadWithCampaign = currentLeads.find(lead => lead.campaign_id);
          
          if (leadWithCampaign?.campaign_id) {
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('email_template_id')
              .eq('id', leadWithCampaign.campaign_id)
              .single();
            
            emailTemplateId = campaign?.email_template_id || undefined;
          }

          // Format leads for FastAPI backend
          const formattedLeads = currentLeads.map(lead => ({
            id: lead.id,
            first_name: lead.first_name || '',
            last_name: lead.last_name || '',
            company_name: lead.company_name || lead.company || '',
            email_address: lead.email_address || lead.email || '',
            campaign_id: lead.campaign_id || undefined
          }));

          const payload = {
            leads: formattedLeads,
            emailTemplateId: emailTemplateId
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
      console.log('Starting saveLeads with:', newLeads.length, 'leads');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        toast({
          title: "Authentication Required",
          description: "Please log in to save leads",
          variant: "destructive",
        });
        return false;
      }

      console.log('User authenticated:', user.id);

      // Get existing email_address values for this user to avoid duplicates
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('email_address')
        .eq('user_id', user.id);

      const existingEmailAddresses = new Set(
        existingLeads?.map(lead => lead.email_address).filter(Boolean) || []
      );

      // Filter out leads with duplicate email_address values
      const uniqueLeads = newLeads.filter(lead => {
        const emailAddress = lead.emailAddress || lead.email;
        return emailAddress && !existingEmailAddresses.has(emailAddress);
      });

      if (uniqueLeads.length === 0) {
        toast({
          title: "No New Leads",
          description: "All leads already exist in your database",
          variant: "destructive",
        });
        return false;
      }

      const leadsToInsert = uniqueLeads.map(lead => ({
        user_id: user.id,
        name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || null,
        first_name: lead.firstName || null,
        last_name: lead.lastName || null,
        job_title: lead.jobTitle || lead.job_title || lead.headline || null,
        headline: lead.headline || null,
        company: lead.company || lead.companyName || null,
        company_name: lead.companyName || lead.company || null,
        email: lead.email || lead.emailAddress || null,
        email_address: lead.emailAddress || lead.email || null,
        phone: lead.phone || null,
        location: lead.location || lead.rawAddress || null,
        raw_address: lead.rawAddress || lead.location || null,
        state_name: lead.stateName || null,
        city_name: lead.cityName || null,
        country_name: lead.countryName || null,
        status: 'pending_review',
        contact_phone_numbers: lead.contactPhoneNumbers || null,
      }));

      console.log('Prepared leads for insert:', leadsToInsert);

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Successfully inserted leads:', data);

      const skippedCount = newLeads.length - uniqueLeads.length;
      let description = `Saved ${uniqueLeads.length} new leads to database for review`;
      if (skippedCount > 0) {
        description += `. Skipped ${skippedCount} duplicate leads.`;
      }

      toast({
        title: "Success",
        description,
      });

      await fetchLeads(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error saving leads:', error);
      toast({
        title: "Error",
        description: `Failed to save leads to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

    // Subscribe to realtime updates for lead status changes
    const channel = supabase
      .channel('leads_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('🔔 Realtime: Lead updated', payload);
          const oldLead = payload.old as any;
          const newLead = payload.new as any;
          
          // Check if status changed
          if (oldLead.status !== newLead.status) {
            console.log('🔔 Realtime: Status changed from', oldLead.status, 'to', newLead.status);
            const leadName = newLead.name || `${newLead.first_name || ''} ${newLead.last_name || ''}`.trim() || 'Unknown Lead';
            
            // Trigger notification for status change
            addNotification(leadName, newLead.id, oldLead.status, newLead.status);
            
            // Mark lead as unviewed for highlighting
            const unviewedLeads = JSON.parse(localStorage.getItem('psn-unviewed-leads') || '[]');
            if (!unviewedLeads.includes(newLead.id)) {
              unviewedLeads.push(newLead.id);
              localStorage.setItem('psn-unviewed-leads', JSON.stringify(unviewedLeads));
              console.log('💾 Realtime: Marked lead as unviewed:', newLead.id);
            }
            
            // Refresh leads to show updated data
            fetchLeads();
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification]);

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
