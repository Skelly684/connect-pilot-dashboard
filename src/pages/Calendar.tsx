import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Clock, Users, Plus, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import { appConfig } from '@/lib/appConfig';
import { apiFetch, ApiError } from '@/lib/apiFetch';
import { ApiStatusBanner } from '@/components/calendar/ApiStatusBanner';
import { GoogleCalendarDiagnostics } from '@/components/integrations/GoogleCalendarDiagnostics';


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
        title: formData.summary,
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

      toast({
        title: "Event Created",
        description: "Your calendar event has been successfully created.",
        variant: "default",
      });

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

  const formatEventTime = (dateTimeString: string) => {
    try {
      const date = parseISO(dateTimeString);
      return format(date, 'MMM dd, h:mm a');
    } catch {
      return dateTimeString;
    }
  };

  // Status badge component
  const StatusBadge = () => {
    if (googleConnected === null) return <Badge variant="secondary">Checking...</Badge>;
    if (googleLoading) return <Badge variant="secondary">Connecting...</Badge>;
    
    const variant = googleConnected ? 'default' : 'destructive';
    const text = googleConnected ? 'Connected' : 'Not Connected';
    
    return <Badge variant={variant}>{text}</Badge>;
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
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold">Google Calendar</h1>
                    <p className="text-muted-foreground">Connect your Google account to view and book follow-ups.</p>
                    {process.env.NODE_ENV !== 'production' && (
                      <p className="text-xs text-muted-foreground mt-1">API: <code className="font-mono">{appConfig.getApiBaseUrl()}</code></p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge />
                  {googleConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={googleLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${googleLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  )}
                </div>
              </div>

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
                      {googleEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No upcoming events.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {googleEvents.slice(0, 10).map((event) => (
                            <div key={event.id} className="border rounded-lg p-4 space-y-2">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium">{event.summary}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {formatEventTime(event.start.dateTime)}
                                </Badge>
                              </div>
                              
                              {event.description && (
                                <p className="text-sm text-muted-foreground">
                                  {event.description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatEventTime(event.start.dateTime)} - {formatEventTime(event.end.dateTime)}
                                </div>
                                
                                {event.attendees && event.attendees.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Book Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Quick Book
                      </CardTitle>
                      <CardDescription>Schedule a new calendar event</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleQuickBook} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="summary">Title *</Label>
                          <Input
                            id="summary"
                            value={formData.summary}
                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                            placeholder="Meeting title"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Notes</Label>
                          <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Meeting notes or agenda"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startDateTime">Start Time *</Label>
                            <Input
                              id="startDateTime"
                              type="datetime-local"
                              value={formData.startDateTime}
                              onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="endDateTime">End Time *</Label>
                            <Input
                              id="endDateTime"
                              type="datetime-local"
                              value={formData.endDateTime}
                              onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attendeeEmail">Attendee Email (optional)</Label>
                          <Input
                            id="attendeeEmail"
                            type="email"
                            value={formData.attendeeEmail}
                            onChange={(e) => setFormData({ ...formData, attendeeEmail: e.target.value })}
                            placeholder="attendee@example.com"
                          />
                        </div>

                        <Separator />

                        <Button type="submit" className="w-full" disabled={loading || !googleConnected}>
                          {loading ? 'Creating Event...' : 'Create Event'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
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