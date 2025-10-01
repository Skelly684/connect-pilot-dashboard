
import { Home, Users, Send, Settings, BarChart3, Zap, CheckSquare, Eye, Database, Plus, Calendar, Shield } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface AppSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: "overview", title: "Overview", icon: Home },
  { id: "leads", title: "Lead Generation", icon: Users },
  { id: "review-leads", title: "Review New Leads", icon: CheckSquare },
  { id: "all-leads", title: "All Leads", icon: Database },
  { id: "self-leads", title: "Self-Generated Leads", icon: Plus },
  { id: "outreach", title: "Outreach Center", icon: Send },
  { id: "calendar", title: "Calendar", icon: Calendar },
  { id: "integrations", title: "Integrations", icon: Zap },
  { id: "settings", title: "Settings", icon: Settings },
];

export function AppSidebar({ activeTab, setActiveTab }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { isAdmin } = useAdminCheck();

  const adminMenuItems = [
    { id: "admin", title: "Admin", icon: Shield },
  ];

  return (
    <Sidebar className={`${isCollapsed ? "w-14" : "w-72"} z-40`} collapsible="icon">
      <SidebarTrigger className="m-3 self-end hover:bg-sidebar-accent/20 rounded-xl transition-all duration-300" />
      
      <SidebarContent className="bg-gradient-sidebar backdrop-blur-2xl border-r border-sidebar-border shadow-2xl relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-60 pointer-events-none"></div>
        
        <div className="relative p-6 border-b border-sidebar-border/30">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-primary rounded-3xl opacity-75 group-hover:opacity-100 blur-lg transition-all duration-500 animate-pulse"></div>
              <img 
                src="/lovable-uploads/7c5cb75c-bf84-4a68-9e78-2fd787db361e.png" 
                alt="PSN Logo" 
                className="relative w-20 h-20 rounded-3xl shadow-glow transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
              />
            </div>
          </div>
          {!isCollapsed && (
            <div className="text-center mt-5 animate-fade-in">
              <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">PSN Dashboard</h2>
              <p className="text-sm text-sidebar-foreground/80 font-medium mt-1">Lead Management System</p>
            </div>
          )}
        </div>
        
        <SidebarGroup className="relative px-4 py-6">
          <SidebarGroupLabel className={`${isCollapsed ? "hidden" : "block"} text-sidebar-foreground/70 font-bold text-xs uppercase tracking-widest mb-4 px-2`}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item, index) => (
                <SidebarMenuItem key={item.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    className={`relative w-full justify-start rounded-2xl transition-all duration-500 group overflow-hidden ${
                      activeTab === item.id
                        ? "bg-gradient-primary text-white shadow-glow font-semibold transform scale-105"
                        : "hover:bg-sidebar-accent/30 text-sidebar-foreground hover:text-white hover:transform hover:scale-105 backdrop-blur-sm"
                    }`}
                  >
                    {activeTab === item.id && (
                      <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                    )}
                    <div className={`relative z-10 p-2 rounded-xl mr-3 transition-all duration-500 ${
                      activeTab === item.id 
                        ? "bg-white/20 shadow-lg" 
                        : "bg-sidebar-accent/10 group-hover:bg-sidebar-accent/30"
                    }`}>
                      <item.icon className={`h-5 w-5 transition-all duration-500 ${
                        activeTab === item.id ? "text-white" : "text-sidebar-foreground/80 group-hover:text-white"
                      }`} />
                    </div>
                    {!isCollapsed && (
                      <span className="relative z-10 text-sm font-semibold transition-all duration-500">
                        {item.title}
                      </span>
                    )}
                    {activeTab === item.id && !isCollapsed && (
                      <div className="ml-auto relative z-10">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-lg"></div>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {isAdmin && (
          <SidebarGroup className="relative px-4 py-6 border-t border-sidebar-border/30">
            <SidebarGroupLabel className={`${isCollapsed ? "hidden" : "block"} text-sidebar-foreground/70 font-bold text-xs uppercase tracking-widest mb-4 px-2`}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveTab(item.id)}
                      className={`relative w-full justify-start rounded-2xl transition-all duration-500 group overflow-hidden ${
                        activeTab === item.id
                          ? "bg-gradient-accent text-white shadow-glow font-semibold transform scale-105"
                          : "hover:bg-sidebar-accent/30 text-sidebar-foreground hover:text-white hover:transform hover:scale-105 backdrop-blur-sm"
                      }`}
                    >
                      {activeTab === item.id && (
                        <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                      )}
                      <div className={`relative z-10 p-2 rounded-xl mr-3 transition-all duration-500 ${
                        activeTab === item.id 
                          ? "bg-white/20 shadow-lg" 
                          : "bg-sidebar-accent/10 group-hover:bg-sidebar-accent/30"
                      }`}>
                        <item.icon className={`h-5 w-5 transition-all duration-500 ${
                          activeTab === item.id ? "text-white" : "text-sidebar-foreground/80 group-hover:text-white"
                        }`} />
                      </div>
                      {!isCollapsed && (
                        <span className="relative z-10 text-sm font-semibold transition-all duration-500">
                          {item.title}
                        </span>
                      )}
                      {activeTab === item.id && !isCollapsed && (
                        <div className="ml-auto relative z-10">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-lg"></div>
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Bottom spacing */}
        <div className="flex-1"></div>
        <div className="relative p-6 border-t border-sidebar-border/30">
          {!isCollapsed && (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-primary"></div>
                <div className="w-2 h-2 rounded-full bg-gradient-primary animate-pulse"></div>
                <div className="h-px flex-1 bg-gradient-primary"></div>
              </div>
              <div className="text-xs text-sidebar-foreground/60 font-medium">
                © {new Date().getFullYear()} PSN Dashboard
              </div>
              <div className="text-xs text-sidebar-foreground/40">
                Powered by AI
              </div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
