import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { appConfig } from '@/lib/appConfig';
import { apiFetch, ApiError } from '@/lib/apiFetch';

// Constant user ID for backend authentication
const USER_ID = "409547ac-ed07-4550-a27f-66926515e2b9";

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

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/calendar/list');
      setEvents(data.items || data.events || []);
      setIsConnected(true);
    } catch (error) {
      console.error('Fetch events error:', error);
      const apiError = error as ApiError;
      
      if (apiError.status === 401) {
        setIsConnected(false);
        return;
      }
      
      setIsConnected(false);
      toast({
        title: "Connection Error",
        description: `Failed to fetch events from ${apiError.url}: ${apiError.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const startGoogleAuth = useCallback(async () => {
    try {
      setLoading(true);
      
      // Step 1: Get auth URL from backend
      const baseUrl = appConfig.getApiBaseUrl();
      const authStartUrl = baseUrl === '/api' ? `/auth/google/start?state=uid:${USER_ID}` : `${baseUrl}/auth/google/start?state=uid:${USER_ID}`;
      
      const authResponse = await apiFetch(authStartUrl);
      
      if (!authResponse.auth_url) {
        throw new Error('No auth URL received from backend');
      }

      // Step 2: Open popup with auth URL
      const left = (window.screen.width / 2) - (260);
      const top = (window.screen.height / 2) - (320);
      const popup = window.open(
        authResponse.auth_url,
        'gcal_oauth',
        `width=520,height=640,left=${left},top=${top},noopener,noreferrer`
      );

      if (!popup) {
        // Popup blocked - show fallback link
        toast({
          title: "Popup Blocked",
          description: "Please allow popups and click again, or use the direct link below",
          variant: "destructive",
        });
        
        // Create and click a fallback link
        const fallbackLink = document.createElement('a');
        fallbackLink.href = authResponse.auth_url;
        fallbackLink.target = '_blank';
        fallbackLink.rel = 'noopener noreferrer';
        fallbackLink.textContent = 'Open Google OAuth';
        fallbackLink.click();
        return;
      }

      // Step 3: Show waiting UI and poll for completion
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds at 2s intervals
      
      const pollForCompletion = setInterval(async () => {
        attempts++;
        
        // Check if popup was closed manually
        if (popup.closed) {
          clearInterval(pollForCompletion);
          setLoading(false);
          return;
        }
        
        // Check if we've timed out
        if (attempts >= maxAttempts) {
          clearInterval(pollForCompletion);
          popup.close();
          setLoading(false);
          toast({
            title: "Connection Timeout",
            description: "OAuth process timed out. Please try again.",
            variant: "destructive",
          });
          return;
        }

        try {
          // Poll calendar list endpoint for success
          const listUrl = baseUrl === '/api' ? '/api/calendar/list' : `${baseUrl}/api/calendar/list`;
          const response = await apiFetch(listUrl);
          
          // Success condition: HTTP 200 with ok: true
          if (response && (response.ok === true || response.items || response.events)) {
            clearInterval(pollForCompletion);
            popup.close();
            setIsConnected(true);
            setEvents(response.items || response.events || []);
            setLoading(false);
            
            toast({
              title: "Google Connected",
              description: "Successfully connected to Google Calendar!",
            });
            return;
          }
        } catch (error) {
          const apiError = error as ApiError;
          
          // Handle specific error codes
          if (apiError.status === 401) {
            // Still not authenticated - continue polling
            return;
          }
          
          if (apiError.status >= 500) {
            // Server error - stop polling and show error
            clearInterval(pollForCompletion);
            popup.close();
            setLoading(false);
            toast({
              title: "Connection Error",
              description: `Server error from ${apiError.url}: ${apiError.message}`,
              variant: "destructive",
            });
            return;
          }
          
          // Other errors - continue polling for now
        }
      }, 2000);

    } catch (error) {
      console.error('Google auth error:', error);
      const apiError = error as ApiError;
      const errorMessage = apiError?.message || (error instanceof Error ? error.message : "Failed to connect to Google Calendar");
      const errorUrl = apiError?.url ? ` (${apiError.url})` : '';
      
      toast({
        title: "Connection Failed", 
        description: `${errorMessage}${errorUrl}`,
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [toast]);

  // Listen for API config changes
  useEffect(() => {
    const handleConfigChange = () => {
      // Refresh connection status when API config changes
      fetchEvents();
    };

    window.addEventListener('app-config-changed', handleConfigChange);
    return () => window.removeEventListener('app-config-changed', handleConfigChange);
  }, [fetchEvents]);

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
      const apiError = error as ApiError;
      toast({
        title: "Error",
        description: `Failed to create event at ${apiError.url}: ${apiError.message}`,
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
    startGoogleAuth,
    fetchEvents,
    createQuickEvent,
  };
};