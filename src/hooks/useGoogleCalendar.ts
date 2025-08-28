import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

  const getHeaders = useCallback(() => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    };
  }, [user?.id]);

  const startGoogleAuth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/auth/google/start', {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Google OAuth');
      }

      const data = await response.json();
      
      // Open popup window
      const popup = window.open(
        data.auth_url,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          // Verify connection after popup closes
          fetchEvents();
        }
      }, 1000);

      return popup;
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getHeaders, toast]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/list', {
        method: 'GET',
        headers: getHeaders(),
      });

      if (response.status === 401) {
        setIsConnected(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.items || []);
      setIsConnected(true);
    } catch (error) {
      console.error('Fetch events error:', error);
      setIsConnected(false);
      toast({
        title: "Error",
        description: "Failed to fetch calendar events. Please try reconnecting.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getHeaders, toast]);

  const createQuickEvent = useCallback(async (eventData: QuickBookData) => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/quick-add', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const data = await response.json();
      
      toast({
        title: "Event Created",
        description: "Your calendar event has been successfully created.",
        variant: "default",
      });

      // Refresh events list
      await fetchEvents();
      
      return data;
    } catch (error) {
      console.error('Create event error:', error);
      toast({
        title: "Error",
        description: "Failed to create calendar event. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getHeaders, toast, fetchEvents]);

  return {
    events,
    isConnected,
    loading,
    startGoogleAuth,
    fetchEvents,
    createQuickEvent,
  };
};