import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SelfLeadForm } from "@/components/selfLeads/SelfLeadForm";
import { SelfLeadPreview } from "@/components/selfLeads/SelfLeadPreview";
import { SelfLeadsRecentTable } from "@/components/selfLeads/SelfLeadsRecentTable";
import { CsvUpload } from "@/components/selfLeads/CsvUpload";
import { PendingExportsSection } from "@/components/selfLeads/PendingExportsSection";

export default function SelfLeads() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("self-leads");

  const handleTabChange = (tab: string) => {
    if (tab === "self-leads") {
      setActiveTab(tab);
    } else {
      // Navigate to dashboard with the selected tab
      navigate(`/dashboard?tab=${tab}`);
    }
  };
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    job_title: '',
    company_name: '',
    email_address: '',
    contact_phone_numbers: [],
    city_name: '',
    state_name: '',
    country_name: '',
    website_url: '',
    department: '',
    seniority_level: '',
    industry: '',
    company_size: '',
    years_experience: '',
    notes: '',
    campaign_id: ''
  });

  const handleFormDataChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      job_title: '',
      company_name: '',
      email_address: '',
      contact_phone_numbers: [],
      city_name: '',
      state_name: '',
      country_name: '',
      website_url: '',
      department: '',
      seniority_level: '',
      industry: '',
      company_size: '',
      years_experience: '',
      notes: '',
      campaign_id: ''
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-secondary">
        <AppSidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        <main className="flex-1 overflow-auto">
          <DashboardHeader />
          <div className="p-6 space-y-6 animate-fade-in">
            <div className="border-b border-border/30 pb-4 bg-gradient-card/50 backdrop-blur-sm rounded-lg p-6 shadow-elegant">
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Self-Generated Leads
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manually add a lead. Choose Accept to save only, or Accept & Contact to start calls/emails.
                </p>
              </div>
            </div>

            {/* CSV Upload Section - Top */}
            <div className="mb-6">
              <CsvUpload />
            </div>

            {/* Pending Exports Section */}
            <div className="mb-6">
              <PendingExportsSection />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Form Section */}
              <div className="lg:col-span-2">
                <SelfLeadForm 
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                  onReset={resetForm}
                />
              </div>

              {/* Preview Section */}
              <div className="lg:col-span-1">
                <SelfLeadPreview formData={formData} />
              </div>
            </div>

            {/* Accepted Leads Queue - Bottom */}
            <div className="mt-8">
              <SelfLeadsRecentTable />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}