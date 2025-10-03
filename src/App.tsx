
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Outreach from "./pages/Outreach";
import SelfLeads from "./pages/SelfLeads";
import Calendar from "./pages/Calendar";
import LeadDetail from "./pages/LeadDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/outreach" element={
              <ProtectedRoute>
                <Outreach />
              </ProtectedRoute>
            } />
            <Route path="/self-leads" element={
              <ProtectedRoute>
                <SelfLeads />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            } />
            <Route path="/lead/:id" element={
              <ProtectedRoute>
                <LeadDetail />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full bg-gray-50">
                    <AppSidebar activeTab="settings" setActiveTab={() => {}} />
                    <main className="flex-1 flex flex-col">
                      <DashboardHeader />
                      <div className="flex-1 p-6">
                        <div className="max-w-6xl mx-auto">
                          <SettingsPage />
                        </div>
                      </div>
                    </main>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </NotificationsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
