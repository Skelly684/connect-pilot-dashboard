import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CallLog {
  id: string;
  lead_id: string;
  call_status: 'queued' | 'scheduled' | 'answered' | 'no-answer' | 'busy' | 'failed' | 'max-retries';
  call_duration?: number;
  notes?: string;
  created_at: string;
}

export const useCallLogs = () => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchCallLogs = async (leadId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCallLogs((data || []) as CallLog[]);
    } catch (error) {
      console.error('Error fetching call logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch call logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCallLog = async (leadId: string, status: CallLog['call_status'], notes?: string, duration?: number) => {
    try {
      const { error } = await supabase
        .from('call_logs')
        .insert({
          lead_id: leadId,
          call_status: status,
          notes: notes || null,
          call_duration: duration || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Call log created successfully",
      });

      // Refresh call logs
      await fetchCallLogs();
      return true;
    } catch (error) {
      console.error('Error creating call log:', error);
      toast({
        title: "Error",
        description: "Failed to create call log",
        variant: "destructive",
      });
      return false;
    }
  };

  const getCallLogsForLead = (leadId: string): CallLog[] => {
    return callLogs.filter(log => log.lead_id === leadId);
  };

  const getLatestCallStatus = (leadId: string): CallLog['call_status'] | null => {
    const leadCallLogs = getCallLogsForLead(leadId);
    if (leadCallLogs.length === 0) return null;
    return leadCallLogs[0].call_status; // Already sorted by created_at desc
  };

  return {
    callLogs,
    isLoading,
    fetchCallLogs,
    createCallLog,
    getCallLogsForLead,
    getLatestCallStatus,
  };
};