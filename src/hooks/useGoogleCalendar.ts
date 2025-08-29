import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { appConfig } from '@/lib/appConfig';
import { apiFetch, ApiError, apiUrl } from '@/lib/apiFetch';

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
      const authStartUrl = `/auth/google/start?state=${encodeURIComponent('uid:409547ac-ed07-4550-a27f-66926515e2b9')}`;
      
      const authResponse = await fetch(apiUrl(authStartUrl), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-User-Id': USER_ID,
        },
      });

      if (!authResponse.ok) {
        throw new Error(`Failed to start OAuth: ${authResponse.status} ${authResponse.statusText}`);
      }

      const authData = await authResponse.json();
      
      if (!authData.auth_url) {
        throw new Error('No auth URL received from backend');
      }

      // Step 2: Open popup with auth URL
      const left = (window.screen.width / 2) - (260);
      const top = (window.screen.height / 2) - (320);
      const popup = window.open(
        authData.auth_url,
        'gcal_oauth',
        `width=520,height=640,left=${left},top=${top},noopener,noreferrer`
      );

      if (!popup) {
        setLoading(false);
        toast({
          title: "Popup Blocked",
          description: "Please allow popups and click again.",
          variant: "destructive",
        });
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
          const response = await fetch(apiUrl('/api/calendar/list'), {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
              'X-User-Id': USER_ID,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setIsConnected(true);
            setEvents(data.items || data.events || []);
            setLoading(false);
            
            const eventCount = (data.items || data.events || []).length;
            toast({
              title: "Google Connected",
              description: eventCount === 0 
                ? "Connected — no upcoming events" 
                : `Successfully connected! Found ${eventCount} events.`,
            });
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          setLoading(false);
          setIsConnected(false);
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
          toast({
            title: "Connection Timeout",
            description: "OAuth process timed out. Please try again.",
            variant: "destructive",
          });
          return;
        }

        try {
          // Poll calendar list endpoint for success
          const response = await fetch(apiUrl('/api/calendar/list'), {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
              'X-User-Id': USER_ID,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && (data.ok === true || data.items || data.events)) {
              clearInterval(pollInterval!);
              window.removeEventListener('message', handleMessage);
              popup.close();
              setIsConnected(true);
              setEvents(data.items || data.events || []);
              setLoading(false);
              
              const eventCount = (data.items || data.events || []).length;
              toast({
                title: "Google Connected",
                description: eventCount === 0 
                  ? "Connected — no upcoming events" 
                  : `Successfully connected! Found ${eventCount} events.`,
              });
              return;
            }
          } else if (response.status === 401) {
            // Handle 401 - not connected
            const errorData = await response.json().catch(() => ({}));
            if (errorData.detail && errorData.detail.includes('not connected')) {
              // Continue polling for a few more attempts
              if (attempts >= maxAttempts - 2) {
                clearInterval(pollInterval!);
                window.removeEventListener('message', handleMessage);
                popup.close();
                setLoading(false);
                setIsConnected(false);
                toast({
                  title: "Connection Failed",
                  description: "Google not connected. Click Reconnect to try again.",
                  variant: "destructive",
                });
                return;
              }
            }
          } else if (response.status === 403) {
            // Handle 403 - insufficient permissions
            clearInterval(pollInterval!);
            window.removeEventListener('message', handleMessage);
            popup.close();
            setLoading(false);
            setIsConnected(false);
            toast({
              title: "Insufficient Permissions",
              description: "Google permissions are too narrow. Click Reconnect to grant Calendar access.",
              variant: "destructive",
            });
            return;
          } else if (response.status >= 500) {
            // Handle 500+ server errors
            const errorText = await response.text().catch(() => 'Server error');
            clearInterval(pollInterval!);
            window.removeEventListener('message', handleMessage);
            popup.close();
            setLoading(false);
            setIsConnected(false);
            toast({
              title: "Server Error",
              description: `${errorText} (${apiUrl('/api/calendar/list')})`,
              variant: "destructive",
            });
            return;
          }
        } catch (error) {
          // Network error - stop polling after max attempts
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval!);
            window.removeEventListener('message', handleMessage);
            popup.close();
            setLoading(false);
            setIsConnected(false);
            const errorMessage = error instanceof Error ? error.message : 'Network error';
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
      const apiError = error as ApiError;
      const errorMessage = apiError?.message || (error instanceof Error ? error.message : "Failed to connect to Google Calendar");
      
      toast({
        title: "Connection Failed", 
        description: `${errorMessage} (${apiError?.url || 'Unknown URL'})`,
        variant: "destructive",
      });
      setLoading(false);
      setIsConnected(false);
    }
  }, [toast, fetchEvents]);

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