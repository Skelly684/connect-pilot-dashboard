import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useEmailSequenceManager = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const stopSequenceForLead = async (leadId: string, reason = 'manual') => {
    setLoading(true);
    try {
      console.log(`Stopping email sequence for lead ${leadId}, reason: ${reason}`);
      
      const { data, error } = await supabase.functions.invoke('stop-email-sequence', {
        body: { lead_id: leadId, reason }
      });

      if (error) {
        console.error('Error stopping email sequence:', error);
        toast({
          title: 'Error',
          description: 'Failed to stop email sequence',
          variant: 'destructive'
        });
        return { success: false, error };
      }

      console.log('Email sequence stopped successfully:', data);
      toast({
        title: 'Success',
        description: `Email sequence stopped for lead (${reason})`
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error calling stop-email-sequence:', error);
      toast({
        title: 'Error',
        description: 'Failed to stop email sequence',
        variant: 'destructive'
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const processEmailReply = async (replyData: {
    lead_id: string;
    from_email: string;
    subject?: string;
    body_snippet?: string;
    reply_type?: string;
  }) => {
    setLoading(true);
    try {
      console.log('Processing email reply:', replyData);
      
      const { data, error } = await supabase.functions.invoke('process-email-replies', {
        body: replyData
      });

      if (error) {
        console.error('Error processing email reply:', error);
        return { success: false, error };
      }

      console.log('Email reply processed successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error calling process-email-replies:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const getDueEmailSteps = async (userId: string, limit = 50) => {
    setLoading(true);
    try {
      console.log(`Fetching due email steps for user ${userId}`);
      
      const { data, error } = await supabase.functions.invoke('get-due-email-steps', {
        body: { user_id: userId, limit }
      });

      if (error) {
        console.error('Error fetching due email steps:', error);
        return { success: false, error };
      }

      console.log('Due email steps fetched successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error calling get-due-email-steps:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    stopSequenceForLead,
    processEmailReply,
    getDueEmailSteps
  };
};