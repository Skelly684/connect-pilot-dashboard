import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SelfLeadForm } from "@/components/selfLeads/SelfLeadForm";
import { SelfLeadPreview } from "@/components/selfLeads/SelfLeadPreview";
import { SelfLeadsRecentTable } from "@/components/selfLeads/SelfLeadsRecentTable";
import { CsvUpload } from "@/components/selfLeads/CsvUpload";

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
      <div className="min-h-screen flex w-full">
        <AppSidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            <header className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Self-Generated Leads</h1>
                  <p className="text-gray-600 mt-1">
                    Manually add a lead. Choose Accept to save only, or Accept & Contact to start calls/emails.
                  </p>
                </div>
                <SidebarTrigger className="md:hidden" />
              </div>
            </header>

            {/* CSV Upload Section */}
            <div className="mb-6">
              <CsvUpload />
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

            {/* Recent Leads Table */}
            <div className="mt-8">
              <SelfLeadsRecentTable />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}