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
      
      // Open popup directly to auth URL with user state
      const baseUrl = appConfig.getApiBaseUrl();
      const authUrl = baseUrl === '/api' ? `/auth/google/start?state=uid:${USER_ID}` : `${baseUrl}/auth/google/start?state=uid:${USER_ID}`;
      
      const left = (window.screen.width / 2) - (520 / 2);
      const top = (window.screen.height / 2) - (700 / 2);
      const popup = window.open(
        authUrl,
        'google-auth',
        `width=520,height=700,left=${left},top=${top},scrollbars=yes,resizable=yes,noopener,noreferrer`
      );

      if (!popup) {
        throw new Error('Popup blocked - please allow popups and try again');
      }

      // Poll for completion every 2s for up to 60s
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds at 2s intervals
      
      const pollForCompletion = setInterval(async () => {
        attempts++;
        
        if (popup.closed) {
          clearInterval(pollForCompletion);
          return;
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollForCompletion);
          popup.close();
          throw new Error('OAuth process timed out');
        }

        try {
          // Check if we have tokens by trying to fetch events
          await fetchEvents();
          if (isConnected) {
            popup.close();
            clearInterval(pollForCompletion);
            toast({
              title: "Connected",
              description: "Successfully connected to Google Calendar!",
            });
          }
        } catch (error) {
          // Continue polling - not connected yet
        }
      }, 2000);

      return popup;
    } catch (error) {
      console.error('Google auth error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to Google Calendar";
      toast({
        title: "Connection Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchEvents, isConnected]);

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