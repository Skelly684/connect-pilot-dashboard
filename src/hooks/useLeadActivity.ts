import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

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

export const useLeadActivity = (leadId: string | null) => {
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

  useEffect(() => {
    fetchLeadActivity();
  }, [leadId]);

  return {
    activity,
    isLoading,
    error,
    refetch: fetchLeadActivity,
  };
};