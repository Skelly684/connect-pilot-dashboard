import { CalendarIcon, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { appConfig } from '@/lib/appConfig';

interface CalendarHeaderProps {
  googleConnected: boolean | null;
  googleLoading: boolean;
  onRefresh: () => void;
}

export const CalendarHeader = ({ googleConnected, googleLoading, onRefresh }: CalendarHeaderProps) => {
  const StatusBadge = () => {
    if (googleConnected === null) return <Badge variant="secondary">Checking...</Badge>;
    if (googleLoading) return <Badge variant="secondary">Connecting...</Badge>;
    
    const variant = googleConnected ? 'default' : 'destructive';
    const text = googleConnected ? 'Connected' : 'Not Connected';
    
    return <Badge variant={variant} className={googleConnected ? 'animate-pulse' : ''}>{text}</Badge>;
  };

  return (
    <div className="relative overflow-hidden rounded-lg p-6 mb-6">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse" 
           style={{ 
             background: 'linear-gradient(135deg, hsl(262 83% 58% / 0.2) 0%, hsl(220 83% 58% / 0.2) 50%, hsl(262 83% 58% / 0.2) 100%)',
             backgroundSize: '200% 200%',
             animation: googleConnected ? 'gradient-shift 3s ease infinite' : 'none'
           }} 
      />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
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
              onClick={onRefresh}
              disabled={googleLoading}
              className="hover:shadow-lg hover:shadow-primary/50 transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${googleLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
};
