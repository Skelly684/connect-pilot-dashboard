import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Plus, Clock, Calendar, Filter } from "lucide-react";
import { useCallLogs, CallLog } from "@/hooks/useCallLogs";
import { formatRelativeTime } from "@/utils/timeUtils";

interface EnhancedCallActivityProps {
  leadId: string;
  leadName?: string;
}

const getCallStatusColor = (status: CallLog['call_status']) => {
  switch (status) {
    case 'queued':
      return 'bg-yellow-100 text-yellow-800';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'answered':
      return 'bg-green-100 text-green-800';
    case 'no-answer':
      return 'bg-orange-100 text-orange-800';
    case 'busy':
      return 'bg-red-100 text-red-800';
    case 'failed':
      return 'bg-gray-100 text-gray-800';
    case 'max-retries':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatCallStatus = (status: CallLog['call_status']) => {
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

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds === 0) return null;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'answered', label: 'Answered' },
  { value: 'no-answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'failed', label: 'Failed' },
  { value: 'max-retries', label: 'Max Retries' },
];

export const EnhancedCallActivity = ({ leadId, leadName }: EnhancedCallActivityProps) => {
  const { getCallLogsForLead, createCallLog, fetchCallLogs, isLoading } = useCallLogs();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCallStatus, setNewCallStatus] = useState<CallLog['call_status']>('queued');
  const [newCallNotes, setNewCallNotes] = useState('');
  const [newCallDuration, setNewCallDuration] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const callLogs = getCallLogsForLead(leadId);
  const ITEMS_PER_PAGE = 10;

  // Filter call logs
  const filteredLogs = statusFilter === 'all' 
    ? callLogs 
    : callLogs.filter(log => log.call_status === statusFilter);

  // Paginate call logs
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    fetchCallLogs();
  }, [leadId]);

  useEffect(() => {
    setCurrentPage(1); // Reset page when filter changes
  }, [statusFilter]);

  const handleAddCallLog = async () => {
    if (!newCallStatus) return;

    const duration = newCallDuration ? parseInt(newCallDuration) : undefined;
    const success = await createCallLog(leadId, newCallStatus, newCallNotes || undefined, duration);
    
    if (success) {
      setShowAddForm(false);
      setNewCallStatus('queued');
      setNewCallNotes('');
      setNewCallDuration('');
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm">Call Activity</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-7 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map(filter => (
                  <SelectItem key={filter.value} value={filter.value} className="text-xs">
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Call
            </Button>
          </div>
        </div>
        {leadName && (
          <CardDescription className="text-xs">
            Call history for {leadName} • {filteredLogs.length} call{filteredLogs.length !== 1 ? 's' : ''}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {showAddForm && (
          <div className="p-3 border rounded-md bg-gray-50 space-y-3">
            <h4 className="text-sm font-medium">Add Call Log</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">Status</label>
                <Select value={newCallStatus} onValueChange={(value: CallLog['call_status']) => setNewCallStatus(value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="no-answer">No Answer</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="max-retries">Max Retries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Duration (seconds)</label>
                <Input
                  type="number"
                  placeholder="Duration"
                  value={newCallDuration}
                  onChange={(e) => setNewCallDuration(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-gray-600">Notes (optional)</label>
              <Textarea
                placeholder="Call notes..."
                value={newCallNotes}
                onChange={(e) => setNewCallNotes(e.target.value)}
                className="text-xs resize-none"
                rows={2}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddCallLog} size="sm" className="text-xs">
                Add Call Log
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                size="sm"
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-4">
            <div className="text-xs text-gray-500">Loading call activity...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-xs text-gray-500">
              {statusFilter === 'all' 
                ? 'No call activity yet.' 
                : `No ${statusFilters.find(f => f.value === statusFilter)?.label.toLowerCase()} calls found.`
              }
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedLogs.map((log) => {
                const { relative, exact } = formatRelativeTime(log.created_at);
                
                return (
                  <div key={log.id} className="flex items-start gap-3 p-2 border rounded-md bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${getCallStatusColor(log.call_status)}`}>
                          {formatCallStatus(log.call_status)}
                        </Badge>
                        {log.call_duration && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDuration(log.call_duration)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1" title={exact}>
                        <Calendar className="h-3 w-3" />
                        {relative}
                      </div>
                      
                      {log.notes && (
                        <div className="text-xs text-gray-700 mt-1">
                          {log.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="text-xs h-7"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="text-xs h-7"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};