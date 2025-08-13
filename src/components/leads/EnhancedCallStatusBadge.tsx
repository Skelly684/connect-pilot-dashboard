import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useCallLogs, CallLog } from "@/hooks/useCallLogs";
import { formatRelativeTime } from "@/utils/timeUtils";
import { useEffect } from "react";

interface EnhancedCallStatusBadgeProps {
  leadId: string;
  lastCallStatus?: string;
  nextCallAt?: string | null;
  callAttempts?: number;
}

const getCallStatusColor = (status: CallLog['call_status'] | string) => {
  switch (status) {
    case 'queued':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'answered':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'no-answer':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'busy':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'failed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'max-retries':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatCallStatus = (status: CallLog['call_status'] | string) => {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'scheduled':
      return 'Scheduled';
    case 'answered':
      return 'Answered';
    case 'no-answer':
      return 'No Answer';
    case 'busy':
      return 'Busy';
    case 'failed':
      return 'Failed';
    case 'max-retries':
      return 'Max Retries';
    default:
      return status;
  }
};

export const EnhancedCallStatusBadge = ({ 
  leadId, 
  lastCallStatus, 
  nextCallAt, 
  callAttempts = 0 
}: EnhancedCallStatusBadgeProps) => {
  const { getLatestCallStatus, fetchCallLogs } = useCallLogs();

  useEffect(() => {
    if (!lastCallStatus) {
      fetchCallLogs();
    }
  }, [leadId, lastCallStatus]);

  // Priority: leads.last_call_status first, then latest from call_logs
  const displayStatus = lastCallStatus || getLatestCallStatus(leadId);
  const { relative: nextCallRelative, exact: nextCallExact } = nextCallAt 
    ? formatRelativeTime(nextCallAt) 
    : { relative: '', exact: '' };

  return (
    <div className="flex flex-col gap-1">
      {displayStatus && (
        <Badge 
          variant="outline" 
          className={`text-xs ${getCallStatusColor(displayStatus)}`}
        >
          {formatCallStatus(displayStatus)}
        </Badge>
      )}
      
      {nextCallAt && (
        <div className="flex items-center gap-1 text-xs text-blue-600" title={nextCallExact}>
          <Clock className="h-3 w-3" />
          <span>Next: {nextCallRelative}</span>
        </div>
      )}
      
      {callAttempts > 0 && (
        <div className="text-xs text-gray-500">
          {callAttempts} attempt{callAttempts !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};