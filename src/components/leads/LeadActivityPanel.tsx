import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Clock, ExternalLink, PlayCircle, Reply } from "lucide-react";
import { useLeadActivity, CallActivity, EmailActivity, ReplyActivity } from "@/hooks/useLeadActivity";
import { formatRelativeTime } from "@/utils/timeUtils";

interface LeadActivityPanelProps {
  leadId: string;
  leadName?: string;
  enabled?: boolean;
}

const getCallStatusColor = (status?: CallActivity['status']): string => {
  if (!status) return 'bg-gray-100 text-gray-800';
  
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'no-answer':
      return 'bg-yellow-100 text-yellow-800';
    case 'busy':
      return 'bg-orange-100 text-orange-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'note':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getEmailStatusColor = (status?: EmailActivity['status']): string => {
  if (!status) return 'bg-gray-100 text-gray-800';
  
  switch (status) {
    case 'sent':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'skipped':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

export const LeadActivityPanel = ({ leadId, leadName, enabled = true }: LeadActivityPanelProps) => {
  const { activity, isLoading, error } = useLeadActivity(leadId, enabled);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Loading activity...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !activity) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {error || 'Unable to load recent activity'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestCall = activity.calls[0];
  const latestEmail = activity.emails[0];
  const latestReply = activity.replies?.[0];

  return (
    <div className="space-y-6">
      {/* Latest Activity Summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Latest Activity</span>
          </CardTitle>
          <CardDescription>
            Recent communication for {leadName || activity.lead.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Latest Call Status */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Latest Call</span>
              </div>
              {latestCall ? (
                <div className="space-y-1">
                  <Badge className={getCallStatusColor(latestCall.status)}>
                    {latestCall.status?.replace('-', ' ') || 'Unknown'}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {formatRelativeTime(latestCall.timestamp).relative}
                  </p>
                  {latestCall.duration && (
                    <p className="text-sm text-muted-foreground">
                      Duration: {formatDuration(latestCall.duration)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No calls yet</p>
              )}
            </div>

            {/* Latest Email Status */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Latest Email</span>
              </div>
              {latestEmail ? (
                <div className="space-y-1">
                  <Badge className={getEmailStatusColor(latestEmail.status)}>
                    {latestEmail.status || 'Unknown'}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {formatRelativeTime(latestEmail.timestamp).relative}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {latestEmail.subject}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No emails yet</p>
              )}
            </div>

            {/* Latest Reply Status */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Reply className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Latest Reply</span>
              </div>
              {latestReply ? (
                <div className="space-y-1">
                  <Badge className="bg-emerald-100 text-emerald-800">
                    Reply
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {formatRelativeTime(latestReply.timestamp).relative}
                  </p>
                  <p className="text-sm font-medium truncate">
                    {latestReply.subject || '(no subject)'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {latestReply.body?.length > 400 
                      ? `${latestReply.body.substring(0, 400)}...`
                      : latestReply.body
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    from {latestReply.from}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No replies yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Timeline */}
      {activity.calls.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <span>Call Timeline</span>
            </CardTitle>
            <CardDescription>
              {activity.calls.length} call attempt{activity.calls.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity.calls.map((call, index) => (
                <div key={call.id} className="flex items-start space-x-4 pb-4 border-b last:border-b-0">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {call.attempt_number}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge className={getCallStatusColor(call.status)}>
                        {call.status === 'note' ? 'Note' : (call.status?.replace('-', ' ') || 'Unknown')}
                      </Badge>
                      {call.duration && (
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(call.duration)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatRelativeTime(call.timestamp).exact}
                    </p>
                    {call.notes && call.status === 'note' && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        {call.notes}
                      </div>
                    )}
                    {call.recording_url && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 p-0 h-auto"
                        onClick={() => window.open(call.recording_url, '_blank')}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Play Recording
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email History */}
      {activity.emails.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Email History</span>
            </CardTitle>
            <CardDescription>
              {activity.emails.length} email{activity.emails.length !== 1 ? 's' : ''} sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity.emails.map((email, index) => (
                <div key={email.id} className="flex items-start space-x-4 pb-4 border-b last:border-b-0">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge className={getEmailStatusColor(email.status)}>
                        {email.status || 'Unknown'}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">
                      {email.subject}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      To: {email.to}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatRelativeTime(email.timestamp).exact}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Activity State */}
      {activity.calls.length === 0 && activity.emails.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No activity recorded yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Call and email activity will appear here once outreach begins.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};