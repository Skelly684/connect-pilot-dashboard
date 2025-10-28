import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, AlertCircle, Loader2, List, Calendar as CalendarViewIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch, ApiError } from '@/lib/apiFetch';
import { ApiStatusBanner } from '@/components/calendar/ApiStatusBanner';
import { GoogleCalendarDiagnostics } from '@/components/integrations/GoogleCalendarDiagnostics';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { EventCard } from '@/components/calendar/EventCard';
import { QuickBookForm } from '@/components/calendar/QuickBookForm';
import { CalendarWeekView } from '@/components/calendar/CalendarWeekView';


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

const Calendar = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    startGoogleAuth, 
    events: googleEvents, 
    isConnected: googleConnected, 
    loading: googleLoading,
    errorMessage: calendarError,
    fetchEvents,
    checkConnectionStatus
  } = useGoogleCalendar();
  
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  // Quick booking form state
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    attendeeEmail: '',
  });

  // Health check
  const checkBackendHealth = useCallback(async () => {
    try {
      await apiFetch('/api/health');
      setBackendHealthy(true);
      setErrorMessage('');
      return true;
    } catch (error) {
      setBackendHealthy(false);
      const apiError = error as ApiError;
      setErrorMessage(`Backend unavailable. Tried: ${apiError.url} - ${apiError.message}`);
      return false;
    }
  }, []);

  // Listen for API config changes and refresh health check
  useEffect(() => {
    const handleConfigChange = () => {
      checkBackendHealth();
    };

    window.addEventListener('app-config-changed', handleConfigChange);
    return () => window.removeEventListener('app-config-changed', handleConfigChange);
  }, [checkBackendHealth]);

  // Handle query params from same-tab OAuth return
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const gcalParam = urlParams.get('gcal');
    
    if (gcalParam === 'connected') {
      // Clear URL param and check connection
      navigate('/calendar', { replace: true });
      toast({
        title: "Google Connected",
        description: "Successfully returned from Google OAuth",
      });
      checkConnectionStatus();
    } else if (gcalParam?.startsWith('error=')) {
      // Clear URL param and show error
      const errorMsg = gcalParam.slice('error='.length);
      navigate('/calendar', { replace: true });
      toast({
        title: "OAuth Error",
        description: errorMsg || 'Authentication failed',
        variant: "destructive",
      });
    }
  }, [location.search, navigate, toast, checkConnectionStatus]);

  // Initialize on mount and check connection status
  useEffect(() => {
    checkBackendHealth();
    checkConnectionStatus();
  }, [checkBackendHealth, checkConnectionStatus]);

  // Listen for window focus to refresh connection status
  useEffect(() => {
    const handleFocus = () => {
      checkConnectionStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkConnectionStatus]);

  // Connect to Google Calendar
  const handleConnect = () => {
    if (!backendHealthy) {
      toast({
        title: "Backend Unavailable",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    startGoogleAuth();
  };

  // Quick book event
  const handleQuickBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.summary || !formData.startDateTime || !formData.endDateTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const eventData = {
        calendarId: 'primary',
        summary: formData.summary,  // Use 'summary' instead of 'title' to match Google Calendar API
        description: formData.description,
        start: new Date(formData.startDateTime).toISOString(),
        end: new Date(formData.endDateTime).toISOString(),
        ...(formData.attendeeEmail && {
          attendees: [{ email: formData.attendeeEmail }]
        })
      };

      await apiFetch('/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });

      // Dynamic success toasts
      toast({
        title: "✅ Event Created",
        description: `Event '${formData.summary}' created successfully.`,
        variant: "default",
      });

      // Secondary toast for Google sync confirmation
      if (googleConnected) {
        setTimeout(() => {
          toast({
            title: "🔄 Synced to Google Calendar",
            description: "Your event is now visible in Google Calendar.",
            variant: "default",
          });
        }, 1000);
      }

      // Optimistically add event to list
      const newEvent: CalendarEvent = {
        id: `temp-${Date.now()}`,
        summary: formData.summary,
        description: formData.description,
        start: { dateTime: new Date(formData.startDateTime).toISOString() },
        end: { dateTime: new Date(formData.endDateTime).toISOString() },
        ...(formData.attendeeEmail && {
          attendees: [{ email: formData.attendeeEmail }]
        })
      };

      // Reset form
      setFormData({
        summary: '',
        description: '',
        startDateTime: '',
        endDateTime: '',
        attendeeEmail: '',
      });

      // Refresh events list to get actual event data
      setTimeout(() => fetchEvents(), 1000);
      
    } catch (error) {
      console.error('Create event error:', error);
      const apiError = error as ApiError;
      toast({
        title: "Error",
        description: `Failed to create event at ${apiError.url}: ${apiError.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh events
  const handleRefresh = async () => {
    await fetchEvents();
  };

  // Get display error message
  const displayError = calendarError || errorMessage;

  // Handle navigation from sidebar
  const handleTabChange = (tab: string) => {
    if (tab === "overview" || tab === "leads" || tab === "all-leads" || tab === "review-leads" || tab === "outreach" || tab === "integrations" || tab === "settings") {
      navigate("/dashboard", { state: { tab } });
    } else if (tab === "self-leads") {
      navigate("/self-leads");
    }
    // Stay on calendar if tab === "calendar"
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeTab="calendar" setActiveTab={handleTabChange} />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* API Status Banner */}
              <ApiStatusBanner />
              
              {/* Header with gradient */}
              <CalendarHeader
                googleConnected={googleConnected}
                googleLoading={googleLoading}
                onRefresh={handleRefresh}
              />

              {/* Error message */}
              {displayError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{displayError}</span>
                </div>
              )}

              {/* Content based on connection status */}
              {!googleConnected && backendHealthy && (
                <Card className="max-w-md mx-auto">
                  <CardHeader className="text-center">
                    <CalendarIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle>Google Calendar</CardTitle>
                    <CardDescription>
                      {calendarError?.includes('permissions') 
                        ? 'Permissions too narrow. Reconnect to grant Calendar access.'
                        : 'Connect your Google account to view and book follow-ups.'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button onClick={handleConnect} disabled={googleLoading || !backendHealthy} className="gap-2">
                      {googleLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting to Google...
                        </>
                      ) : calendarError?.includes('permissions') ? (
                        'Reconnect Google Calendar'
                      ) : (
                        'Connect Google Calendar'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {googleConnected && (
                <>
                  {/* View toggle */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                    >
                      <List className="h-4 w-4 mr-1" />
                      List View
                    </Button>
                    <Button
                      variant={viewMode === 'calendar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('calendar')}
                      className="hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                    >
                      <CalendarViewIcon className="h-4 w-4 mr-1" />
                      Calendar View
                    </Button>
                  </div>

                  {viewMode === 'list' ? (
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Upcoming Events */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Upcoming Events
                          </CardTitle>
                          <CardDescription>Next 10 events from your calendar</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {googleLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <span className="ml-2 text-muted-foreground">Loading events...</span>
                            </div>
                          ) : googleEvents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No upcoming events.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {googleEvents.slice(0, 10).map((event) => (
                                <EventCard 
                                  key={event.id} 
                                  event={event}
                                  onEventDeleted={handleRefresh}
                                />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Quick Book Form */}
                      <QuickBookForm
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={handleQuickBook}
                        loading={loading}
                        googleConnected={googleConnected}
                      />
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Week View</CardTitle>
                        <CardDescription>Your events organized by day</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CalendarWeekView events={googleEvents} />
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Add diagnostics component in dev mode */}
              {import.meta.env.DEV && (
                <div className="max-w-2xl mx-auto">
                  <GoogleCalendarDiagnostics />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Calendar;