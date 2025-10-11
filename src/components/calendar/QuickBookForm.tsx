import { useState } from 'react';
import { Plus, Clock, Users, Lightbulb, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { addMinutes, addHours, addDays, setHours, setMinutes, format } from 'date-fns';
import { MeetingTitleSuggestions } from './MeetingTitleSuggestions';

interface QuickBookFormProps {
  formData: {
    summary: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    attendeeEmail: string;
  };
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  googleConnected: boolean;
}

export const QuickBookForm = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  loading, 
  googleConnected 
}: QuickBookFormProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const applyTimeShortcut = (type: string) => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case '15min':
        start = now;
        end = addMinutes(now, 15);
        break;
      case '30min':
        start = now;
        end = addMinutes(now, 30);
        break;
      case '1hr':
        start = now;
        end = addHours(now, 1);
        break;
      case 'tomorrow':
        start = setMinutes(setHours(addDays(now, 1), 10), 0);
        end = addHours(start, 1);
        break;
      default:
        return;
    }

    setFormData({
      ...formData,
      startDateTime: format(start, "yyyy-MM-dd'T'HH:mm"),
      endDateTime: format(end, "yyyy-MM-dd'T'HH:mm"),
    });
  };

  const handleTitleSelect = (title: string) => {
    setFormData({ ...formData, summary: title });
    setShowSuggestions(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Book
          </CardTitle>
          <CardDescription>Schedule a new calendar event</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="summary" className="flex items-center gap-2">
                Title *
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setShowSuggestions(true)}
                >
                  <Lightbulb className="h-4 w-4 text-primary" />
                </Button>
              </Label>
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
                <Label htmlFor="startDateTime" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Start Time *
                </Label>
                <Input
                  id="startDateTime"
                  type="datetime-local"
                  value={formData.startDateTime}
                  onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDateTime" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  End Time *
                </Label>
                <Input
                  id="endDateTime"
                  type="datetime-local"
                  value={formData.endDateTime}
                  onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Time shortcuts */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick time shortcuts</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTimeShortcut('15min')}
                  className="text-xs"
                >
                  +15 min
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTimeShortcut('30min')}
                  className="text-xs"
                >
                  +30 min
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTimeShortcut('1hr')}
                  className="text-xs"
                >
                  +1 hr
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTimeShortcut('tomorrow')}
                  className="text-xs"
                >
                  Tomorrow 10 AM
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendeeEmail" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Attendee Email (optional)
              </Label>
              <Input
                id="attendeeEmail"
                type="email"
                value={formData.attendeeEmail}
                onChange={(e) => setFormData({ ...formData, attendeeEmail: e.target.value })}
                placeholder="attendee@example.com"
              />
            </div>

            <Separator />

            <Button 
              type="submit" 
              className="w-full hover:shadow-lg hover:shadow-primary/50 transition-all duration-300" 
              disabled={loading || !googleConnected}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Event...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <MeetingTitleSuggestions
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        onSelect={handleTitleSelect}
      />
    </>
  );
};
