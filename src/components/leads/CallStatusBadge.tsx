import { Badge } from "@/components/ui/badge";
import { useCallLogs, CallLog } from "@/hooks/useCallLogs";
import { useEffect } from "react";

interface CallStatusBadgeProps {
  leadId: string;
}

const getCallStatusColor = (status: CallLog['call_status']) => {
  switch (status) {
    case 'queued':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'answered':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'no-answer':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'busy':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'failed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatCallStatus = (status: CallLog['call_status']) => {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'answered':
      return 'Answered';
    case 'no-answer':
      return 'No Answer';
    case 'busy':
      return 'Busy';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
};

export const CallStatusBadge = ({ leadId }: CallStatusBadgeProps) => {
  const { getLatestCallStatus, fetchCallLogs } = useCallLogs();

  useEffect(() => {
    fetchCallLogs();
  }, [leadId]);

  const latestStatus = getLatestCallStatus(leadId);

  if (!latestStatus) {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className={`text-xs ${getCallStatusColor(latestStatus)}`}
    >
      {formatCallStatus(latestStatus)}
    </Badge>
  );
};