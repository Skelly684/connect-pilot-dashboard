
import { useState } from "react";
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LeadSearch } from "@/components/leads/LeadSearch";
import { LeadTable } from "@/components/leads/LeadTable";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { CRMIntegration } from "@/components/integrations/CRMIntegration";
import { OutreachCenter } from "@/components/outreach/OutreachCenter";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardOverview />;
      case "leads":
        return (
          <div className="space-y-6">
            <LeadSearch />
            <LeadTable />
          </div>
        );
      case "outreach":
        return <OutreachCenter />;
      case "integrations":
        return <CRMIntegration />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
