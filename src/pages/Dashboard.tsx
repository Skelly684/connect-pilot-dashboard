
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LeadSearch } from "@/components/leads/LeadSearch";
import { LeadTable } from "@/components/leads/LeadTable";
import { AllLeadsSection } from "@/components/leads/AllLeadsSection";
import { ReviewNewLeadsSection } from "@/components/leads/ReviewNewLeadsSection";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { CRMIntegration } from "@/components/integrations/CRMIntegration";
import { OutreachCenter } from "@/components/outreach/OutreachCenter";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { AdminPage } from "@/components/admin/AdminPage";
import { useLeads } from "@/hooks/useLeads";
import { useLeadReplyRealtime } from "@/hooks/useLeadReplyRealtime";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [replyLeadId, setReplyLeadId] = useState<string | null>(null);

  // Handle URL parameters for navigation from other pages
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handle reply detection from realtime
  const handleReplyDetected = (leadId: string) => {
    console.log('💜 Dashboard: Reply detected for lead', leadId);
    setReplyLeadId(leadId);
    
    // Mark as unviewed for purple pulse
    const unviewedLeads = JSON.parse(localStorage.getItem('psn-unviewed-leads') || '[]');
    if (!unviewedLeads.includes(leadId)) {
      unviewedLeads.push(leadId);
      localStorage.setItem('psn-unviewed-leads', JSON.stringify(unviewedLeads));
    }
    
    // Refresh leads to show updated status
    fetchLeads();
    
    // Clear after 30 seconds
    setTimeout(() => {
      setReplyLeadId(null);
    }, 30000);
  };

  // Set up realtime listener for replies
  useLeadReplyRealtime(user?.id, handleReplyDetected);

  // Handle tab changes with proper navigation
  const handleTabChange = (tab: string) => {
    if (tab === "self-leads") {
      navigate("/self-leads");
    } else if (tab === "calendar") {
      navigate("/calendar");
    } else {
      setActiveTab(tab);
    }
  };
  
  const { 
    leads, 
    isLoading: isLoadingLeads, 
    saveLeads, 
    deleteLeads, 
    deleteAllLeads,
    updateLeadStatus,
    sendAcceptedLeadsToBackend,
    fetchLeads,
    tempHighlightLeadId
  } = useLeads();

  const handleSearchResults = (results: any[]) => {
    console.log("Received search results:", results);
    setSearchResults(results);
  };

  const handleSearchStart = () => {
    setIsSearching(true);
    setSearchResults([]); // Clear previous search results
  };

  const handleSearchComplete = () => {
    setIsSearching(false);
  };

  const handleAcceptLeads = async (leadIds: string[], campaignId?: string) => {
    return await updateLeadStatus(leadIds, 'accepted', campaignId);
  };

  const handleRejectLeads = async (leadIds: string[]) => {
    return await updateLeadStatus(leadIds, 'rejected');
  };

  const handleSendAcceptedLeads = async (acceptedLeads: any[], campaignId?: string) => {
    return await sendAcceptedLeadsToBackend(acceptedLeads, campaignId);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardOverview />;
      case "leads":
        return (
          <div className="space-y-6">
            <LeadSearch 
              onResults={handleSearchResults}
              onSearchStart={handleSearchStart}
              onSearchComplete={handleSearchComplete}
              onSaveLeads={saveLeads}
            />
            <LeadTable 
              leads={activeTab === "leads" ? (isSearching ? searchResults : leads) : []} 
              isLoading={isSearching || isLoadingLeads}
              onDeleteLeads={deleteLeads}
              onDeleteAllLeads={deleteAllLeads}
              onUpdateLeadStatus={updateLeadStatus}
              onRefresh={fetchLeads}
              tempHighlightLeadId={replyLeadId || tempHighlightLeadId}
            />
          </div>
        );
      case "all-leads":
        return (
          <AllLeadsSection 
            leads={leads}
            isLoading={isLoadingLeads}
            onUpdateLeadStatus={updateLeadStatus}
            onDeleteLeads={deleteLeads}
            onDeleteAllLeads={deleteAllLeads}
            onRefresh={fetchLeads}
            tempHighlightLeadId={replyLeadId || tempHighlightLeadId}
          />
        );
      case "review-leads":
        return (
          <ReviewNewLeadsSection 
            leads={leads}
            isLoading={isLoadingLeads}
            onAcceptLeads={handleAcceptLeads}
            onRejectLeads={handleRejectLeads}
            onSendAcceptedLeads={handleSendAcceptedLeads}
            onRefresh={fetchLeads}
          />
        );
      case "outreach":
        return <OutreachCenter />;
      case "self-leads":
        navigate("/self-leads");
        return null;
      case "integrations":
        return <CRMIntegration />;
      case "settings":
        return <SettingsPage />;
      case "admin":
        return <AdminPage />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-secondary">
        <AppSidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        <main className="flex-1 flex flex-col overflow-auto">
          <DashboardHeader />
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto animate-fade-in">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
