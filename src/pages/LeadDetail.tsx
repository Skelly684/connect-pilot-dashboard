import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LeadActivityPanel } from '@/components/leads/LeadActivityPanel';
import { useLeads } from '@/hooks/useLeads';
import { useMemo, useEffect } from 'react';

const LeadDetail = () => {
  const { id: leadId } = useParams();
  const navigate = useNavigate();
  const { leads } = useLeads();

  const lead = useMemo(() => {
    return leads.find(l => l.id === leadId);
  }, [leads, leadId]);

  // Mark lead as viewed when page loads
  useEffect(() => {
    if (leadId) {
      console.log('👁️ LeadDetail: Marking lead as viewed:', leadId);
      const unviewedLeads = JSON.parse(localStorage.getItem('psn-unviewed-leads') || '[]');
      const filtered = unviewedLeads.filter((id: string) => id !== leadId);
      if (filtered.length !== unviewedLeads.length) {
        localStorage.setItem('psn-unviewed-leads', JSON.stringify(filtered));
      }
    }
  }, [leadId]);

  const handleTabChange = (tab: string) => {
    if (tab === "overview" || tab === "leads" || tab === "all-leads" || tab === "review-leads" || tab === "outreach" || tab === "integrations" || tab === "settings") {
      navigate("/dashboard", { state: { tab } });
    } else if (tab === "self-leads") {
      navigate("/self-leads");
    } else if (tab === "calendar") {
      navigate("/calendar");
    }
  };

  if (!leadId) {
    return <div>Invalid lead ID</div>;
  }

  const leadName = lead?.name || `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || 'Unknown Lead';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar activeTab="leads" setActiveTab={handleTabChange} />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/dashboard', { state: { tab: 'review-leads' } })}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Leads
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">Lead Activity</h1>
                  <p className="text-muted-foreground">Activity timeline for {leadName}</p>
                </div>
              </div>

              {/* Lead Info Card */}
              {lead && (
                <Card>
                  <CardHeader>
                    <CardTitle>{leadName}</CardTitle>
                    <CardDescription>
                      {lead.job_title && `${lead.job_title} • `}
                      {lead.company_name || lead.company || 'Unknown Company'} • 
                      Status: {lead.status?.replace('_', ' ') || 'new'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-muted-foreground">{lead.email || lead.email_address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-muted-foreground">{lead.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{lead.location || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Created</p>
                        <p className="text-muted-foreground">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Activity Panel */}
              <LeadActivityPanel 
                leadId={leadId} 
                leadName={leadName}
                enabled={true}
              />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default LeadDetail;