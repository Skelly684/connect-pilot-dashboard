import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Clock, MapPin, Users, Plus, RefreshCw } from 'lucide-react';
import { useGoogleCalendar, type QuickBookData } from '@/hooks/useGoogleCalendar';
import { format, parseISO } from 'date-fns';

const Calendar = () => {
  const { events, isConnected, loading, startGoogleAuth, fetchEvents, createQuickEvent } = useGoogleCalendar();
  
  // Quick booking form state
  const [formData, setFormData] = useState({
    summary: '',
    startDateTime: '',
    endDateTime: '',
    attendeeEmail: '',
  });

  // Check connection status on mount
  useEffect(() => {
    if (isConnected === null) {
      fetchEvents();
    }
  }, [isConnected, fetchEvents]);

  const handleConnect = async () => {
    await startGoogleAuth();
  };

  const handleQuickBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.summary || !formData.startDateTime || !formData.endDateTime) {
      return;
    }

    const eventData: QuickBookData = {
      summary: formData.summary,
      description: 'Booked from Dashboard',
      start: {
        dateTime: new Date(formData.startDateTime).toISOString(),
      },
      end: {
        dateTime: new Date(formData.endDateTime).toISOString(),
      },
    };

    if (formData.attendeeEmail) {
      eventData.attendees = [{ email: formData.attendeeEmail }];
    }

    try {
      await createQuickEvent(eventData);
      // Reset form
      setFormData({
        summary: '',
        startDateTime: '',
        endDateTime: '',
        attendeeEmail: '',
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const formatEventTime = (dateTimeString: string) => {
    try {
      const date = parseISO(dateTimeString);
      return format(date, 'MMM dd, h:mm a');
    } catch {
      return dateTimeString;
    }
  };

  // Connection status component
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 mb-6">
      <Badge variant={isConnected ? "default" : "secondary"}>
        {isConnected ? "Connected" : "Not Connected"}
      </Badge>
      {isConnected && (
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEvents}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      )}
    </div>
  );

  // If not connected, show connection card
  if (isConnected === false) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Google Calendar</h1>
        </div>
        
        <ConnectionStatus />

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CalendarIcon className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>
              Connect your Google account to view and book follow-ups.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleConnect} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Google Calendar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CalendarIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Google Calendar</h1>
      </div>

      <ConnectionStatus />

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
            {loading && events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading events...
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming events found
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
    </div>
  );
};

export default Calendar;