import { useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns';
import { CalendarEvent } from '@/pages/Calendar';

interface CalendarWeekViewProps {
  events: CalendarEvent[];
}

export const CalendarWeekView = ({ events }: CalendarWeekViewProps) => {
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      try {
        const eventDate = parseISO(event.start.dateTime);
        return isSameDay(eventDate, day);
      } catch {
        return false;
      }
    });
  };

  const formatEventTime = (dateTimeString: string) => {
    try {
      const date = parseISO(dateTimeString);
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Week header */}
      <div className="grid grid-cols-7 bg-muted/50">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="p-2 text-center border-r last:border-r-0">
            <div className="text-xs text-muted-foreground font-medium">
              {format(day, 'EEE')}
            </div>
            <div className="text-lg font-bold">
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7">
        {weekDays.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[200px] p-2 border-r border-b last:border-r-0 ${
                isToday ? 'bg-primary/5' : ''
              }`}
            >
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="text-xs p-2 rounded bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    <div className="font-medium truncate">{event.summary}</div>
                    <div className="text-muted-foreground">
                      {formatEventTime(event.start.dateTime)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
