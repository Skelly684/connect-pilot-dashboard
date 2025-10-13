
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationsContext';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';

interface Lead {
  id?: string;
  // Database fields (new columns)
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  email_address?: string;
  email_status?: string;
  workEmail?: string;
  personalEmail?: string;
  job_title?: string;
  company_name?: string;
  company_website?: string;
  city_name?: string;
  state_name?: string;
  country_name?: string;
  phone?: string;
  linkedin_url?: string;
  seniority?: string;
  functional?: string;
  industry?: string;
  company_size?: string;
  // Legacy/API fields (kept for compatibility)
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  headline?: string;
  position?: string;
  company?: string;
  companyName?: string;
  companyWebsite?: string;
  orgName?: string;
  orgWebsite?: string;
  orgCity?: string;
  orgState?: string;
  orgCountry?: string;
  orgIndustry?: string;
  orgSize?: string;
  emailAddress?: string;
  emailStatus?: string;
  phoneNumber?: string;
  linkedinUrl?: string;
  linkedIn?: string;
  location?: string;
  rawAddress?: string;
  stateName?: string;
  cityName?: string;
  countryName?: string;
  companySize?: string;
  status?: string;
  contactPhoneNumbers?: Array<{ sanitizedNumber?: string; rawNumber?: string }>;
  last_call_status?: string;
  next_call_at?: string | null;
  call_attempts?: number;
  campaign_id?: string;
}

export const useLeads = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tempHighlightLeadId, setTempHighlightLeadId] = useState<string | null>(null);
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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check latest call status and update lead status if needed
      if (data) {
        const leadsToUpdate: string[] = [];
        for (const lead of data) {
          const { data: latestCall, error: callError } = await supabase
            .from('call_logs')
            .select('answered')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!callError && latestCall && (latestCall as any).answered === true && lead.status !== 'replied') {
            leadsToUpdate.push(lead.id);
          }
        }

        // Update leads to 'replied' status if they have answered calls
        if (leadsToUpdate.length > 0) {
          await supabase
            .from('leads')
            .update({ status: 'replied' })
            .in('id', leadsToUpdate);
        }

        // Refetch to get updated data
        const { data: updatedData } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        setLeads(updatedData || []);
      } else {
        setLeads([]);
      }
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
    console.log('🚀 useLeads.updateLeadStatus CALLED with:', { leadIds: leadIds.length, newStatus, campaignId });
    
    // Batch processing for large arrays (PostgreSQL has limits on IN clause size)
    const BATCH_SIZE = 500;
    const batches: string[][] = [];
    
    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      batches.push(leadIds.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Processing ${leadIds.length} leads in ${batches.length} batches`);
    
    try {
      let allCurrentLeads: any[] = [];
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batchIds = batches[batchIndex];
        console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} with ${batchIds.length} leads`);
        
        // Get current lead data for this batch
        const { data: batchLeads } = await supabase
          .from('leads')
          .select('*')
          .in('id', batchIds);

        if (batchLeads) {
          allCurrentLeads = [...allCurrentLeads, ...batchLeads];
        }

        const updates: any = { status: newStatus };
        
        if (newStatus === 'accepted') {
          updates.accepted_at = new Date().toISOString();
          updates.reviewed_at = new Date().toISOString();
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
          .in('id', batchIds);

        if (error) {
          console.error(`❌ Error in batch ${batchIndex + 1}:`, error);
          throw error;
        }
        
        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed`);
      }
      
      console.log('📊 useLeads: Retrieved total leads:', allCurrentLeads.length);

      console.log('✅ useLeads: All batches completed successfully');

      // Create notifications for status changes (limit to avoid overwhelming notifications)
      if (allCurrentLeads && allCurrentLeads.length > 0) {
        console.log('📢 useLeads: Processing notifications for', allCurrentLeads.length, 'leads, newStatus:', newStatus);
        // Only create notifications for the first 10 leads to avoid spam
        const leadsToNotify = allCurrentLeads.slice(0, 10);
        leadsToNotify.forEach(lead => {
          const leadName = lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Lead';
          const oldStatus = lead.status || 'unknown';
          console.log(`📢 useLeads: Calling addNotification for "${leadName}" (${lead.id}) from "${oldStatus}" to "${newStatus}"`);
          addNotification(leadName, lead.id, oldStatus, newStatus);
        });
        if (allCurrentLeads.length > 10) {
          console.log(`📢 useLeads: Skipped notifications for ${allCurrentLeads.length - 10} more leads`);
        }
      } else {
        console.log('⏭️ useLeads: Skipping notifications - no leads found');
      }

      // Trigger auto-sync to CRM when leads change to "replied" status
      if (newStatus === 'replied') {
        try {
          await triggerAutoSync();
        } catch (error) {
          console.error('Failed to trigger auto-sync for replied leads:', error);
        }
      }

      // Automatically send accepted leads to backend
      if (newStatus === 'accepted' && allCurrentLeads.length > 0) {
        try {
          // Get campaign details to include emailTemplateId
          let emailTemplateId: string | undefined = undefined;
          const leadWithCampaign = allCurrentLeads.find(lead => lead.campaign_id);
          
          if (leadWithCampaign?.campaign_id) {
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('email_template_id')
              .eq('id', leadWithCampaign.campaign_id)
              .single();
            
            emailTemplateId = campaign?.email_template_id || undefined;
          }

          // Format leads for backend
          const formattedLeads = allCurrentLeads.map(lead => ({
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
      // Check delivery rules to see if calls are enabled
      let shouldSendCalls = true; // Default to true if no campaign found
      if (campaignId) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('delivery_rules')
          .eq('id', campaignId)
          .single();
        
        if (campaign?.delivery_rules && typeof campaign.delivery_rules === 'object') {
          const deliveryRules = campaign.delivery_rules as any;
          shouldSendCalls = deliveryRules.use_calls !== false;
          console.log('📞 Campaign delivery_rules.use_calls:', shouldSendCalls);
        }
      }

      // Prepare the leads data for the backend
      const leadsData = acceptedLeads.map(lead => ({
        id: lead.id,
        name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        firstName: lead.first_name,
        lastName: lead.last_name,
        jobTitle: lead.job_title,
        company: lead.company || lead.company_name,
        email: lead.email || lead.email_address,
        // Only include phone if calls are enabled in campaign
        phone: shouldSendCalls ? lead.phone : null,
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
      console.log('🟣🟣🟣 saveLeads CALLED - START OF FUNCTION');
      console.log('🟢 saveLeads CALLED with:', newLeads.length, 'leads');
      console.log('🟢 First 3 lead samples:', newLeads.slice(0, 3));
      
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

      // Track emails we've seen in this batch to avoid internal duplicates
      const seenEmailsInBatch = new Set<string>();

      console.log('🟢 Existing email addresses in DB:', existingEmailAddresses.size);

      // Filter out leads with duplicate email_address values (both against DB and within batch)
      const uniqueLeads = newLeads.filter(lead => {
        // Extract email using all possible field variations (same as insertion logic)
        const emailAddress = lead.email || lead.emailAddress || lead.workEmail || lead.personalEmail;
        
        if (!emailAddress) {
          console.log('🔴 Lead rejected: no email', lead);
          return false;
        }
        if (existingEmailAddresses.has(emailAddress)) {
          console.log('🟡 Lead rejected: duplicate in DB', emailAddress);
          return false;
        }
        if (seenEmailsInBatch.has(emailAddress)) {
          console.log('🟡 Lead rejected: duplicate in batch', emailAddress);
          return false;
        }
        
        seenEmailsInBatch.add(emailAddress);
        return true;
      });

      console.log('🟢 Unique leads after filtering:', uniqueLeads.length, 'out of', newLeads.length);

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
        // Name fields (prioritize direct fields from backend)
        name: lead.name || `${lead.first_name || lead.firstName || ''} ${lead.last_name || lead.lastName || ''}`.trim() || null,
        first_name: lead.first_name || lead.firstName || null,
        last_name: lead.last_name || lead.lastName || null,
        // Email fields
        email: lead.email || lead.emailAddress || lead.workEmail || lead.personalEmail || null,
        email_address: lead.email || lead.emailAddress || lead.workEmail || lead.personalEmail || null,
        email_status: lead.email_status || lead.emailStatus || null,
        // Job & Company fields
        job_title: lead.job_title || lead.jobTitle || lead.position || lead.headline || null,
        company_name: lead.company_name || lead.companyName || lead.orgName || lead.company || null,
        company_website: lead.company_website || lead.companyWebsite || lead.orgWebsite || null,
        // Location fields
        city_name: lead.city_name || lead.cityName || lead.orgCity || null,
        state_name: lead.state_name || lead.stateName || lead.orgState || null,
        country_name: lead.country_name || lead.countryName || lead.orgCountry || null,
        // Contact fields
        phone: lead.phone || lead.phoneNumber || null,
        linkedin_url: lead.linkedin_url || lead.linkedinUrl || lead.linkedIn || null,
        // Additional enrichment fields
        seniority: lead.seniority || null,
        functional: lead.functional || null,
        industry: lead.industry || lead.orgIndustry || null,
        company_size: lead.company_size || lead.companySize || lead.orgSize || null,
        // Legacy fields (kept for compatibility)
        headline: lead.headline || null,
        company: lead.company || lead.companyName || null,
        location: lead.location || lead.rawAddress || null,
        raw_address: lead.rawAddress || lead.location || null,
        contact_phone_numbers: lead.contactPhoneNumbers || null,
        // Status
        status: 'new',
      }));

      console.log('🟢 Prepared', leadsToInsert.length, 'leads for insert');
      console.log('🟢 First prepared lead:', leadsToInsert[0]);

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();

      if (error) {
        console.error('🔴 Supabase insert error:', error);
        console.error('🔴 Error details:', JSON.stringify(error, null, 2));
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
    tempHighlightLeadId,
  };
};
