import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/config/api';
import { apiFetch } from '@/lib/apiFetch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface CallActivity {
  id: string;
  attempt_number: number;
  status: 'completed' | 'no-answer' | 'busy' | 'failed' | 'note';
  duration?: number;
  timestamp: string;
  recording_url?: string;
  notes?: string;
}

export interface EmailActivity {
  id: string;
  status: 'sent' | 'failed' | 'skipped';
  timestamp: string;
  subject: string;
  to: string;
}

export interface ReplyActivity {
  id: string;
  timestamp: string;
  subject: string;
  body: string;
  from: string;
}

export interface LeadActivityData {
  lead: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  calls: CallActivity[];
  emails: EmailActivity[];
  replies?: ReplyActivity[];
}

export const useLeadActivity = (leadId: string | null, enabled: boolean = true) => {
  const [activity, setActivity] = useState<LeadActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLeadActivity = async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get data from the last 7 days
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const sinceParam = since.toISOString();
      
      const data = await apiFetch(`/api/lead-activity/${leadId}?since=${sinceParam}`);
      
      setActivity(data);
    } catch (error) {
      console.error('Error fetching lead activity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch lead activity';
      setError(errorMessage);
      
      // Show toast but don't break the UI - use gentle error handling
      toast({
        title: "Activity Fetch Failed",
        description: "Unable to load recent activity. List remains functional.",
        variant: "destructive",
      });
      
      // Set empty activity state to prevent crashes
      setActivity({
        lead: {
          id: leadId,
          name: 'Unknown',
          email: '',
          phone: '',
          company: '',
        },
        calls: [],
        emails: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealtimeUpdate = useCallback((payload: any) => {
    if (!activity) return;

    const { eventType, new: newRecord, table } = payload;
    
    setActivity(prevActivity => {
      if (!prevActivity) return prevActivity;
      
      switch (table) {
        case 'call_logs':
          if (eventType === 'INSERT') {
            // Add new call log (newest first)
            const newCall: CallActivity = {
              id: newRecord.id,
              attempt_number: newRecord.attempt_number || 0,
              status: newRecord.call_status,
              duration: newRecord.duration_seconds,
              timestamp: newRecord.created_at,
              recording_url: newRecord.recording_url,
              notes: newRecord.notes,
            };
            
            // Insert at beginning for newest first ordering
            return {
              ...prevActivity,
              calls: [newCall, ...prevActivity.calls],
            };
          }
          break;
          
        case 'email_logs':
          if (eventType === 'INSERT') {
            // Add new email log (newest first)
            const newEmail: EmailActivity = {
              id: newRecord.id,
              status: newRecord.status,
              timestamp: newRecord.created_at,
              subject: newRecord.subject,
              to: newRecord.email_to,
            };
            
            // Insert at beginning for newest first ordering
            return {
              ...prevActivity,
              emails: [newEmail, ...prevActivity.emails],
            };
          }
          break;
          
        case 'leads':
          if (eventType === 'UPDATE' && newRecord.id === leadId) {
            // Update lead data
            return {
              ...prevActivity,
              lead: {
                ...prevActivity.lead,
                name: newRecord.name || prevActivity.lead.name,
                email: newRecord.email || newRecord.email_address || prevActivity.lead.email,
                phone: newRecord.phone || prevActivity.lead.phone,
                company: newRecord.company || newRecord.company_name || prevActivity.lead.company,
              },
            };
          }
          break;
      }
      
      return prevActivity;
    });
  }, [activity, leadId]);

  useEffect(() => {
    // Only fetch if enabled
    if (enabled) {
      fetchLeadActivity();
    }
  }, [leadId, enabled]);

  useEffect(() => {
    if (!leadId || !enabled) return;

    console.log(`Setting up realtime subscriptions for lead ${leadId}`);

    // Subscribe to realtime updates for this specific lead
    const channel = supabase
      .channel(`lead-activity-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `lead_id=eq.${leadId}`,
        },
        payload => {
          console.log('Call log update:', payload);
          handleRealtimeUpdate({ ...payload, table: 'call_logs' });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_logs',
          filter: `lead_id=eq.${leadId}`,
        },
        payload => {
          console.log('Email log update:', payload);
          handleRealtimeUpdate({ ...payload, table: 'email_logs' });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `id=eq.${leadId}`,
        },
        payload => {
          console.log('Lead update:', payload);
          handleRealtimeUpdate({ ...payload, table: 'leads' });
        }
      )
      .subscribe();

    // Cleanup function to remove the channel
    return () => {
      console.log(`Cleaning up realtime subscriptions for lead ${leadId}`);
      supabase.removeChannel(channel);
    };
  }, [leadId, handleRealtimeUpdate, enabled]);

  return {
    activity,
    isLoading,
    error,
    refetch: fetchLeadActivity,
  };
};