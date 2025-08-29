import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

const supabaseUrl = "https://zcgutkfkohonpqvwfukk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ3V0a2Zrb2hvbnBxdndmdWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjQ1NDQsImV4cCI6MjA2Njg0MDU0NH0.o-TqrNAurwz7JLJlKXsiK-4ELyhhlYb1BhCh-Ix9ZWs";

interface DiagnosticsData {
  hasRow: boolean;
  expires_at?: number;
  scope?: string;
  created_at?: string;
  updated_at?: string;
  current_time?: number;
  is_expired?: boolean;
  expires_in_seconds?: number;
  error?: string;
}

export function GoogleCalendarDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/google-oauth-diag`, {
        headers: {
          'X-User-Id': '409547ac-ed07-4550-a27f-66926515e2b9',
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });

      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      setDiagnostics({
        hasRow: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 0) return 'Expired';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Google Calendar Token Diagnostics
          <Button
            variant="outline"
            size="sm"
            onClick={runDiagnostics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Check Status'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {diagnostics && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Token Status:</span>
              <Badge variant={diagnostics.hasRow ? 'default' : 'destructive'}>
                {diagnostics.hasRow ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>

            {diagnostics.hasRow && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Expiration Status:</span>
                  <Badge variant={diagnostics.is_expired ? 'destructive' : 'default'}>
                    {diagnostics.is_expired ? 'Expired' : 'Valid'}
                  </Badge>
                </div>

                {diagnostics.expires_at && (
                  <div>
                    <span className="font-medium">Expires:</span>
                    <span className="ml-2">
                      {new Date(diagnostics.expires_at * 1000).toLocaleString()}
                      {diagnostics.expires_in_seconds !== undefined && (
                        <span className="ml-2 text-muted-foreground">
                          ({formatDuration(diagnostics.expires_in_seconds)})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {diagnostics.scope && (
                  <div>
                    <span className="font-medium">Scopes:</span>
                    <div className="ml-2 text-sm text-muted-foreground">
                      {diagnostics.scope.split(' ').map((scope) => (
                        <Badge key={scope} variant="outline" className="mr-1 mb-1">
                          {scope.replace('https://www.googleapis.com/auth/', '')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {diagnostics.created_at && (
                  <div>
                    <span className="font-medium">Connected:</span>
                    <span className="ml-2">{formatTimestamp(diagnostics.created_at)}</span>
                  </div>
                )}

                {diagnostics.updated_at && (
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <span className="ml-2">{formatTimestamp(diagnostics.updated_at)}</span>
                  </div>
                )}
              </>
            )}

            {diagnostics.error && (
              <div className="p-3 border border-destructive/20 rounded-md bg-destructive/5">
                <span className="font-medium text-destructive">Error:</span>
                <p className="text-sm text-destructive mt-1">{diagnostics.error}</p>
              </div>
            )}
          </div>
        )}

        {!diagnostics && (
          <p className="text-muted-foreground">
            Click "Check Status" to verify Google Calendar token storage.
          </p>
        )}
      </CardContent>
    </Card>
  );
}