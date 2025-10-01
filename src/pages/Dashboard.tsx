
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

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle URL parameters for navigation from other pages
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
    fetchLeads
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
      <div className="min-h-screen flex w-full bg-gradient-secondary relative overflow-hidden">
        {/* Animated mesh background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-mesh opacity-40"></div>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '10s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s', animationDuration: '12s' }}></div>
        </div>
        
        <AppSidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        <main className="flex-1 flex flex-col relative z-10">
          <DashboardHeader />
          <div className="flex-1 p-8 lg:p-10 overflow-auto">
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
