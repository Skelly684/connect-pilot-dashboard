import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface CampaignStatsProps {
  campaignId: string;
}

interface Stats {
  emailsSent: number;
  emailsFailed: number;
  callsCompleted: number;
  callsNoAnswer: number;
  callsBusy: number;
  callsFailed: number;
}

export const CampaignStats = ({ campaignId }: CampaignStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    emailsSent: 0,
    emailsFailed: 0,
    callsCompleted: 0,
    callsNoAnswer: 0,
    callsBusy: 0,
    callsFailed: 0,
  });
  const [timeframe, setTimeframe] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'all':
          startDate = new Date('1970-01-01');
          break;
      }

      // First get leads for this campaign
      const { data: campaignLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('campaign_id', campaignId);

      const leadIds = campaignLeads?.map(lead => lead.id) || [];

      if (leadIds.length === 0) {
        setStats({
          emailsSent: 0,
          emailsFailed: 0,
          callsCompleted: 0,
          callsNoAnswer: 0,
          callsBusy: 0,
          callsFailed: 0,
        });
        setIsLoading(false);
        return;
      }

      // Fetch email stats
      const { data: emailStats } = await supabase
        .from('email_logs')
        .select('status, lead_id')
        .gte('created_at', startDate.toISOString())
        .in('lead_id', leadIds);

      // Fetch call stats
      const { data: callStats } = await supabase
        .from('call_logs')
        .select('call_status, lead_id')
        .gte('created_at', startDate.toISOString())
        .in('lead_id', leadIds);

      // Process email stats
      const emailsSent = emailStats?.filter(e => e.status === 'sent').length || 0;
      const emailsFailed = emailStats?.filter(e => e.status === 'failed').length || 0;

      // Process call stats
      const callsCompleted = callStats?.filter(c => c.call_status === 'completed').length || 0;
      const callsNoAnswer = callStats?.filter(c => c.call_status === 'no-answer').length || 0;
      const callsBusy = callStats?.filter(c => c.call_status === 'busy').length || 0;
      const callsFailed = callStats?.filter(c => c.call_status === 'failed').length || 0;

      setStats({
        emailsSent,
        emailsFailed,
        callsCompleted,
        callsNoAnswer,
        callsBusy,
        callsFailed,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [campaignId, timeframe]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Campaign Performance</CardTitle>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading stats...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Email Stats */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Emails</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Sent:</span>
                  <span className="font-medium text-green-600">{stats.emailsSent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Failed:</span>
                  <span className="font-medium text-red-600">{stats.emailsFailed}</span>
                </div>
              </div>
            </div>

            {/* Call Stats */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Calls</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Completed:</span>
                  <span className="font-medium text-green-600">{stats.callsCompleted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>No Answer:</span>
                  <span className="font-medium text-yellow-600">{stats.callsNoAnswer}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">More Calls</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Busy:</span>
                  <span className="font-medium text-orange-600">{stats.callsBusy}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Failed:</span>
                  <span className="font-medium text-red-600">{stats.callsFailed}</span>
                </div>
              </div>
            </div>

            {/* Total Stats */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Totals</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total Emails:</span>
                  <span className="font-medium">{stats.emailsSent + stats.emailsFailed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Calls:</span>
                  <span className="font-medium">{stats.callsCompleted + stats.callsNoAnswer + stats.callsBusy + stats.callsFailed}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};