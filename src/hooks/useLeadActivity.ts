import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/config/api';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface CallActivity {
  id: string;
  attempt_number: number;
  status: 'completed' | 'no-answer' | 'busy' | 'failed';
  duration?: number;
  timestamp: string;
  recording_url?: string;
}

export interface EmailActivity {
  id: string;
  status: 'sent' | 'failed' | 'skipped';
  timestamp: string;
  subject: string;
  to: string;
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
      const response = await fetch(`${API_BASE_URL}/api/lead-activity/${leadId}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch lead activity: ${response.statusText}`);
      }
      
      const data = await response.json();
      setActivity(data);
    } catch (error) {
      console.error('Error fetching lead activity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch lead activity';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
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
            // Add new call log
            const newCall: CallActivity = {
              id: newRecord.id,
              attempt_number: newRecord.attempt_number || 0,
              status: newRecord.call_status,
              duration: newRecord.duration_seconds,
              timestamp: newRecord.created_at,
              recording_url: newRecord.recording_url,
            };
            return {
              ...prevActivity,
              calls: [newCall, ...prevActivity.calls],
            };
          }
          break;
          
        case 'email_logs':
          if (eventType === 'INSERT') {
            // Add new email log
            const newEmail: EmailActivity = {
              id: newRecord.id,
              status: newRecord.status,
              timestamp: newRecord.created_at,
              subject: newRecord.subject,
              to: newRecord.email_to,
            };
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
                email: newRecord.email || prevActivity.lead.email,
                phone: newRecord.phone || prevActivity.lead.phone,
                company: newRecord.company || prevActivity.lead.company,
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

    // Subscribe to realtime updates
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
        payload => handleRealtimeUpdate({ ...payload, table: 'call_logs' })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_logs',
          filter: `lead_id=eq.${leadId}`,
        },
        payload => handleRealtimeUpdate({ ...payload, table: 'email_logs' })
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `id=eq.${leadId}`,
        },
        payload => handleRealtimeUpdate({ ...payload, table: 'leads' })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, handleRealtimeUpdate]);

  return {
    activity,
    isLoading,
    error,
    refetch: fetchLeadActivity,
  };
};