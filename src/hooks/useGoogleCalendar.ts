import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { appConfig } from '@/lib/appConfig';
import { apiFetch, apiUrl } from '@/lib/apiFetch';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface QuickBookData {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
  };
  end: {
    dateTime: string;
  };
  attendees?: Array<{
    email: string;
  }>;
}

export const useGoogleCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkConnectionStatus = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      const data = await apiFetch('/api/calendar/list');

      if (data) {
        setEvents(data.items || data.events || []);
        setIsConnected(true);
        return true;
      } else {
        setIsConnected(false);
        setEvents([]);
        setErrorMessage('Unable to connect to Google Calendar');
        return false;
      }
    } catch (error) {
      console.error('Check connection error:', error);
      setIsConnected(false);
      setEvents([]);
      setErrorMessage(`Failed to connect: ${error instanceof Error ? error.message : 'Network error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchEvents = useCallback(async () => {
    return await checkConnectionStatus();
  }, [checkConnectionStatus]);

  const startGoogleAuth = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      // Get current user ID from Supabase auth
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Get auth URL from new edge function
      const supabaseUrl = "https://zcgutkfkohonpqvwfukk.supabase.co";
      const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ3V0a2Zrb2hvbnBxdndmdWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjQ1NDQsImV4cCI6MjA2Njg0MDU0NH0.o-TqrNAurwz7JLJlKXsiK-4ELyhhlYb1BhCh-Ix9ZWs";
      
      const authResponse = await fetch(`${supabaseUrl}/functions/v1/google-oauth-start?return=/calendar`, {
        headers: {
          'X-User-Id': user.id,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });

      if (!authResponse.ok) {
        throw new Error(`Failed to start OAuth: ${authResponse.status} ${authResponse.statusText}`);
      }

      const authData = await authResponse.json();
      
      if (!authData.auth_url) {
        throw new Error('No auth URL received from backend');
      }

      // Step 2: Try to open popup with auth URL
      const left = (window.screen.width / 2) - (260);
      const top = (window.screen.height / 2) - (320);
      const popup = window.open(
        authData.auth_url,
        'gcal_oauth',
        `width=520,height=640,left=${left},top=${top},noopener,noreferrer`
      );

      if (!popup) {
        // Fallback to same-tab redirect if popup is blocked
        setLoading(false);
        toast({
          title: "Popup Blocked",
          description: "Redirecting to Google in this tab...",
          variant: "default",
        });
        window.location.href = authData.auth_url;
        return;
      }

      // Step 3: Set up postMessage listener for faster response
      let pollInterval: NodeJS.Timeout | null = null;
      
      const handleMessage = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        
        if (event.data === 'google_oauth_success') {
          if (pollInterval) clearInterval(pollInterval);
          popup.close();
          fetchAndRenderOnce();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.startsWith('google_oauth_error:')) {
          if (pollInterval) clearInterval(pollInterval);
          popup.close();
          setLoading(false);
          setIsConnected(false);
          const errorMsg = event.data.slice('google_oauth_error:'.length);
          setErrorMessage(`OAuth Error: ${errorMsg}`);
          toast({
            title: "OAuth Error",
            description: errorMsg,
            variant: "destructive",
          });
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Step 4: Poll for completion (fallback)
      let attempts = 0;
      const maxAttempts = 15; // 30 seconds at 2s intervals
      
      const fetchAndRenderOnce = async () => {
        try {
          const data = await apiFetch('/api/calendar/list');
          
          setIsConnected(true);
          setEvents(data.items || data.events || []);
          setLoading(false);
          setErrorMessage('');
          
          const eventCount = (data.items || data.events || []).length;
          toast({
            title: "Google Connected",
            description: eventCount === 0 
              ? "Connected — no upcoming events" 
              : `Successfully connected! Found ${eventCount} events.`,
          });
        } catch (error) {
          setLoading(false);
          setIsConnected(false);
          const errorMsg = error instanceof Error ? error.message : 'Connection failed';
          setErrorMessage(errorMsg);
          throw error;
        }
      };
      
      pollInterval = setInterval(async () => {
        attempts++;
        
        // Check if popup was closed manually
        if (popup.closed) {
          clearInterval(pollInterval!);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
          return;
        }
        
        // Check if we've timed out (30 seconds)
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval!);
          window.removeEventListener('message', handleMessage);
          popup.close();
          setLoading(false);
          setIsConnected(false);
          setErrorMessage('OAuth process timed out');
          toast({
            title: "Connection Timeout",
            description: "OAuth process timed out. Please try again.",
            variant: "destructive",
          });
          return;
        }

        try {
          // Poll calendar list endpoint for success
          const data = await apiFetch('/api/calendar/list');
          
          if (data && (data.ok === true || data.items || data.events)) {
            clearInterval(pollInterval!);
            window.removeEventListener('message', handleMessage);
            popup.close();
            setIsConnected(true);
            setEvents(data.items || data.events || []);
            setLoading(false);
            setErrorMessage('');
            
            const eventCount = (data.items || data.events || []).length;
            toast({
              title: "Google Connected",
              description: eventCount === 0 
                ? "Connected — no upcoming events" 
                : `Successfully connected! Found ${eventCount} events.`,
            });
            return;
          }
        } catch (error) {
          // Network error or API error - stop polling after max attempts
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval!);
            window.removeEventListener('message', handleMessage);
            popup.close();
            setLoading(false);
            setIsConnected(false);
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            setErrorMessage(`Network error: ${errorMessage}`);
            toast({
              title: "Network Error",
              description: `${errorMessage} (${apiUrl('/api/calendar/list')})`,
              variant: "destructive",
            });
            return;
          }
        }
      }, 2000);

    } catch (error) {
      console.error('Google auth error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to Google Calendar";
      
      setErrorMessage(`Connection failed: ${errorMessage}`);
      toast({
        title: "Connection Failed", 
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
      setIsConnected(false);
    }
  }, [toast]);

  // Listen for API config changes
  useEffect(() => {
    const handleConfigChange = () => {
      // Refresh connection status when API config changes
      checkConnectionStatus();
    };

    window.addEventListener('app-config-changed', handleConfigChange);
    return () => window.removeEventListener('app-config-changed', handleConfigChange);
  }, [checkConnectionStatus]);

  const createQuickEvent = useCallback(async (eventData: QuickBookData) => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
      
      toast({
        title: "Event Created",
        description: "Your calendar event has been successfully created.",
      });

      // Refresh events list
      await fetchEvents();
      
      return data;
    } catch (error) {
      console.error('Create event error:', error);
      toast({
        title: "Error",
        description: `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchEvents]);

  return {
    events,
    isConnected,
    loading,
    errorMessage,
    startGoogleAuth,
    fetchEvents,
    createQuickEvent,
    checkConnectionStatus,
  };
};