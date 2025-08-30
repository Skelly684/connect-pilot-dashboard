import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { Loader2, User, Clock, Phone, Mail } from "lucide-react";

interface LeadDetails {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  created_at?: string;
  notes?: string;
}

interface CallRecord {
  call_status: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  notes?: string;
}

interface EmailRecord {
  status: string;
  to_email: string;
  created_at: string;
  notes?: string;
}

interface ActivityData {
  lead: LeadDetails | null;
  calls: CallRecord[];
  emails: EmailRecord[];
}

export default function Activity() {
  const [leadId, setLeadId] = useState("");
  const [sinceDate, setSinceDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const { toast } = useToast();

  const loadActivity = async () => {
    if (!leadId.trim()) {
      toast({
        title: "Validation Error",
        description: "Lead ID is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const url = sinceDate 
        ? `/api/lead-activity/${encodeURIComponent(leadId)}?since=${encodeURIComponent(sinceDate)}`
        : `/api/lead-activity/${encodeURIComponent(leadId)}`;
      
      const response = await apiFetch(url);
      setActivityData(response);
      
      toast({
        title: "Activity Loaded",
        description: `Found ${response.calls?.length || 0} calls and ${response.emails?.length || 0} emails`,
      });
    } catch (error: any) {
      console.error('Failed to load activity:', error);
      setActivityData(null);
      toast({
        title: "Load Failed",
        description: error.message || "Failed to load lead activity",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lead Activity</h1>
        <p className="text-muted-foreground">View detailed call and email activity for leads.</p>
      </div>

      {/* Filter Row */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Load Lead Activity
          </CardTitle>
          <CardDescription>
            Enter a lead ID to view their activity timeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadId">Lead ID *</Label>
              <Input
                id="leadId"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                placeholder="Enter lead ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sinceDate">Since Date (optional)</Label>
              <Input
                id="sinceDate"
                type="datetime-local"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={loadActivity} 
                disabled={isLoading || !leadId.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load Activity"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {activityData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Lead Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityData.lead ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                    <p className="text-sm">{activityData.lead.name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="text-sm">{activityData.lead.email || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p className="text-sm">{activityData.lead.phone || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Company</Label>
                    <p className="text-sm">{activityData.lead.company || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant="secondary" className="text-xs">
                      {activityData.lead.status || "unknown"}
                    </Badge>
                  </div>
                  {activityData.lead.created_at && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                      <p className="text-sm">{formatDateTime(activityData.lead.created_at)}</p>
                    </div>
                  )}
                  {activityData.lead.notes && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                      <p className="text-sm">{activityData.lead.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No lead details available</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calls Table */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Calls ({activityData.calls?.length || 0})
                </h4>
                {activityData.calls && activityData.calls.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Ended</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityData.calls.map((call, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {call.call_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDateTime(call.started_at)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {call.ended_at ? formatDateTime(call.ended_at) : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDuration(call.duration_seconds)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {call.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-sm">No calls found</p>
                )}
              </div>

              {/* Emails Table */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Emails ({activityData.emails?.length || 0})
                </h4>
                {activityData.emails && activityData.emails.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityData.emails.map((email, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {email.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {email.to_email}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDateTime(email.created_at)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {email.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-sm">No emails found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!activityData && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Enter a lead ID and click "Load Activity" to view timeline</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}