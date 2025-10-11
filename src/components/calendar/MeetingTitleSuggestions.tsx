import { Lightbulb, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MeetingTitleSuggestionsProps {
  open: boolean;
  onClose: () => void;
  onSelect: (title: string) => void;
}

export const MeetingTitleSuggestions = ({ open, onClose, onSelect }: MeetingTitleSuggestionsProps) => {
  // Mock suggestions - in real implementation, fetch from AI based on recent leads
  const suggestions = [
    'Follow-up Call - Lead Discussion',
    'Product Demo Meeting',
    'Quarterly Business Review',
    'Strategy Planning Session',
    'Client Check-in Call',
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            AI Meeting Suggestions
          </DialogTitle>
          <DialogDescription>
            Smart meeting title suggestions based on your recent activity
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {suggestions.map((suggestion, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
              onClick={() => onSelect(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          💡 Suggestions improve as you use the app
        </div>
      </DialogContent>
    </Dialog>
  );
};
