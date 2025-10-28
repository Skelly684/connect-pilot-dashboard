import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, Users, ChevronDown, ChevronUp, ExternalLink, Trash2, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/pages/Calendar';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/apiFetch';

interface EventCardProps {
  event: CalendarEvent;
  onEventDeleted?: () => void;
}

export const EventCard = ({ event, onEventDeleted }: EventCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const formatEventTime = (dateTimeString: string) => {
    try {
      const date = parseISO(dateTimeString);
      return format(date, 'MMM dd, h:mm a');
    } catch {
      return dateTimeString;
    }
  };

  const openInGoogleCalendar = () => {
    window.open(`https://calendar.google.com/calendar/u/0/r/eventedit/${event.id}`, '_blank');
  };

  const handleReschedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open in Google Calendar for rescheduling
    window.open(`https://calendar.google.com/calendar/u/0/r/eventedit/${event.id}`, '_blank');
    toast({
      title: "Opening in Google Calendar",
      description: "You can reschedule this event in Google Calendar.",
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${event.summary}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await apiFetch(`/api/calendar/events/${event.id}`, {
        method: 'DELETE',
      });

      toast({
        title: "Event Deleted",
        description: `"${event.summary}" has been removed from your calendar.`,
      });

      // Call the callback to refresh events list
      if (onEventDeleted) {
        onEventDeleted();
      }
    } catch (error) {
      console.error('Delete event error:', error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Main content - always visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{event.summary}</h4>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatEventTime(event.start.dateTime)}
              </div>
              {event.attendees && event.attendees.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {event.attendees.length}
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {formatEventTime(event.start.dateTime)}
          </Badge>
        </div>
      </div>

      {/* Expanded content with slide-down animation */}
      <div 
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          maxHeight: isExpanded ? '500px' : '0',
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div className="px-4 pb-4 space-y-4 border-t">
          {/* Notes */}
          {event.description && (
            <div className="pt-4">
              <p className="text-sm text-muted-foreground font-medium mb-1">Notes</p>
              <p className="text-sm">{event.description}</p>
            </div>
          )}

          {/* Time details */}
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Time
            </p>
            <p className="text-sm">
              {formatEventTime(event.start.dateTime)} - {formatEventTime(event.end.dateTime)}
            </p>
          </div>

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Attendees
              </p>
              <div className="space-y-1">
                {event.attendees.map((attendee, idx) => (
                  <p key={idx} className="text-sm">
                    {attendee.displayName || attendee.email}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={openInGoogleCalendar}
              className="flex-1 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open in Calendar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReschedule}
              className="hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting}
              className="hover:shadow-lg hover:shadow-destructive/30 transition-all duration-300"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
