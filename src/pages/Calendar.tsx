import { useEffect, useState, useCallback } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Clock, Users, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import { appConfig } from '@/lib/appConfig';
import { apiFetch, ApiError } from '@/lib/apiFetch';
import { ApiStatusBanner } from '@/components/calendar/ApiStatusBanner';

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

const Calendar = () => {
  const { toast } = useToast();
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'not-connected' | 'loading' | 'error'>('unknown');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Quick booking form state
  const [formData, setFormData] = useState({
    summary: '',
    startDateTime: '',
    endDateTime: '',
    attendeeEmail: '',
  });

  const getUserId = () => {
    return USER_ID;
  };

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
      setConnectionStatus('error');
      return false;
    }
  }, []);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!backendHealthy) return;
    
    try {
      setConnectionStatus('loading');
      
      const data = await apiFetch('/api/calendar/list');
      setEvents(data.items || data.events || []);
      setConnectionStatus('connected');
      setErrorMessage('');
    } catch (error) {
      console.error('Connection check error:', error);
      const apiError = error as ApiError;
      
      if (apiError.status === 401 || apiError.status === 404) {
        setConnectionStatus('not-connected');
        setEvents([]);
        return;
      }
      
      setConnectionStatus('error');
      setErrorMessage(`Failed to fetch events from ${apiError.url}: ${apiError.message}`);
    }
  }, [backendHealthy]);

  // Listen for API config changes and refresh health check
  useEffect(() => {
    const handleConfigChange = () => {
      // Re-initialize when API config changes
      const initializeCalendar = async () => {
        try {
          const healthy = await checkBackendHealth();
          if (healthy) {
            await checkConnection();
          }
        } catch (error) {
          // Silently handle config change errors to avoid blocking UI
          console.error('Calendar config change error:', error);
        }
      };
      initializeCalendar();
    };

    window.addEventListener('app-config-changed', handleConfigChange);
    return () => window.removeEventListener('app-config-changed', handleConfigChange);
  }, [checkBackendHealth, checkConnection]);

  // Initialize on mount
  useEffect(() => {
    const initializeCalendar = async () => {
      try {
        const healthy = await checkBackendHealth();
        if (healthy) {
          await checkConnection();
        }
      } catch (error) {
        // Silently handle initialization errors to avoid blocking UI
        console.error('Calendar initialization error:', error);
      }
    };
    
    initializeCalendar();
  }, [checkBackendHealth, checkConnection]);

  // OAuth connect flow
  const handleConnect = async () => {
    if (!backendHealthy) {
      toast({
        title: "Backend Unavailable",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const baseUrl = appConfig.getApiBaseUrl();
      
      // Call auth start endpoint to get auth URL
      const authStartUrl = baseUrl === '/api' ? `/auth/google/start?state=uid:${USER_ID}` : `${baseUrl}/auth/google/start?state=uid:${USER_ID}`;
      
      const authResponse = await fetch(authStartUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
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
      const authUrl = authData.auth_url || authStartUrl; // fallback to direct URL

      const left = (window.screen.width / 2) - (520 / 2);
      const top = (window.screen.height / 2) - (700 / 2);
      const popup = window.open(
        authUrl,
        'google-auth',
        `width=520,height=700,left=${left},top=${top},scrollbars=yes,resizable=yes,noopener,noreferrer`
      );

      if (!popup) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups and try again, or we'll redirect you.",
          variant: "destructive",
        });
        // Fallback: redirect current tab
        setTimeout(() => {
          window.location.href = authUrl;
        }, 2000);
        return;
      }

      // Poll for completion every 2s for up to 60s
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds at 2s intervals
      
      const pollForCompletion = setInterval(async () => {
        attempts++;
        
        if (popup.closed) {
          clearInterval(pollForCompletion);
          toast({
            title: "Authentication Cancelled",
            description: "The popup was closed before authentication completed.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollForCompletion);
          popup.close();
          toast({
            title: "Timeout",
            description: "OAuth process timed out. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        try {
          // Poll calendar list endpoint
          const listUrl = baseUrl === '/api' ? `/api/calendar/list` : `${baseUrl}/api/calendar/list`;
          const response = await fetch(listUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
              'X-User-Id': USER_ID,
            },
          });
          
          if (response.status === 200) {
            const data = await response.json();
            if (data.items || data.events) {
              // Tokens are present, connected successfully
              popup.close();
              clearInterval(pollForCompletion);
              setLoading(false);
              toast({
                title: "Connected",
                description: "Successfully connected to Google Calendar!",
                variant: "default",
              });
              // Refresh events list
              await checkConnection();
            }
          }
        } catch (error) {
          // Continue polling - not connected yet
          console.log('Polling attempt failed, continuing...', error);
        }
      }, 2000);

    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: "Connection Failed", 
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      setLoading(false);
    }
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
        description: 'Booked from Dashboard',
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
        description: 'Booked from Dashboard',
        start: { dateTime: new Date(formData.startDateTime).toISOString() },
        end: { dateTime: new Date(formData.endDateTime).toISOString() },
        ...(formData.attendeeEmail && {
          attendees: [{ email: formData.attendeeEmail }]
        })
      };
      setEvents(prev => [newEvent, ...prev]);

      // Reset form
      setFormData({
        summary: '',
        startDateTime: '',
        endDateTime: '',
        attendeeEmail: '',
      });

      // Refresh events list to get actual event data
      setTimeout(() => checkConnection(), 1000);
      
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
    await checkConnection();
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
    const variant = connectionStatus === 'connected' ? 'default' : 
                   connectionStatus === 'loading' ? 'secondary' : 'destructive';
    const text = connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'loading' ? 'Loading...' :
                 connectionStatus === 'not-connected' ? 'Not Connected' : 'Error';
    
    return <Badge variant={variant}>{text}</Badge>;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar activeTab="calendar" setActiveTab={() => {}} />
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
                    <p className="text-xs text-muted-foreground mt-1">API: <code className="font-mono">{appConfig.getApiBaseUrl()}</code></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge />
                  {connectionStatus === 'connected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  )}
                </div>
              </div>

              {/* Error message */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              {/* Content based on connection status */}
              {connectionStatus === 'not-connected' && backendHealthy && (
                <Card className="max-w-md mx-auto">
                  <CardHeader className="text-center">
                    <CalendarIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle>Google Calendar</CardTitle>
                    <CardDescription>
                      Connect your Google account to view and book follow-ups.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button onClick={handleConnect} disabled={loading || !backendHealthy}>
                      {loading ? 'Connecting...' : 'Connect Google Calendar'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {connectionStatus === 'connected' && (
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
                      {events.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No upcoming events.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {events.map((event) => (
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

                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? 'Creating Event...' : 'Create Event'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
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