
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
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  
  const isSpecialUser = user?.email === 'scttskelly@gmail.com';

  const adminMenuItems = [
    { id: "admin", title: "Admin", icon: Shield },
  ];

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="bg-gradient-sidebar backdrop-blur-xl border-sidebar-border/50 shadow-lg">
        <div className="p-6 border-b border-sidebar-border/50">
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              {isSpecialUser && (
                <div className="absolute -inset-1.5 bg-purple-500/30 opacity-60 blur-xl -z-10"></div>
              )}
              <img 
                src={isSpecialUser ? "/assets/leadm8-logo.png" : "/lovable-uploads/7c5cb75c-bf84-4a68-9e78-2fd787db361e.png"}
                alt={isSpecialUser ? "LeadM8 Logo" : "PSN Logo"}
                className={`w-full h-full rounded-2xl ${isSpecialUser ? '' : 'shadow-primary'} transition-transform duration-300 hover:scale-105 relative z-10`}
                style={isSpecialUser ? { objectFit: 'contain', objectPosition: 'center' } : {}}
              />
              {!isSpecialUser && (
                <div className="absolute -inset-0.5 bg-gradient-primary rounded-2xl opacity-20 blur"></div>
              )}
            </div>
          </div>
          {!isCollapsed && (
            <div className="text-center mt-4 animate-fade-in">
              <h2 className={`text-lg font-semibold ${isSpecialUser ? 'font-russo italic bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 bg-clip-text text-transparent animate-pulse tracking-wider transform -skew-x-6 text-xl' : 'text-sidebar-foreground'}`}>
                {isSpecialUser ? 'NEXUS' : 'PSN Dashboard'}
              </h2>
              <p className="text-sm text-sidebar-foreground/70">Lead Management System</p>
            </div>
          )}
        </div>
        
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className={`${isCollapsed ? "hidden" : "block"} text-sidebar-foreground/60 font-medium text-xs uppercase tracking-wider mb-2`}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => (
                <SidebarMenuItem key={item.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full justify-start rounded-xl transition-all duration-300 group ${
                      activeTab === item.id
                        ? "bg-gradient-primary text-sidebar-primary-foreground shadow-primary font-medium transform scale-[1.02]"
                        : "hover:bg-sidebar-accent/50 text-sidebar-foreground hover:text-sidebar-foreground hover:transform hover:scale-[1.02]"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 transition-all duration-300 ${
                      activeTab === item.id ? "text-white" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                    }`} />
                    {!isCollapsed && (
                      <span className="ml-3 text-sm font-medium transition-all duration-300">
                        {item.title}
                      </span>
                    )}
                    {activeTab === item.id && !isCollapsed && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {isAdmin && (
          <SidebarGroup className="px-3 py-4 border-t border-sidebar-border/50">
            <SidebarGroupLabel className={`${isCollapsed ? "hidden" : "block"} text-sidebar-foreground/60 font-medium text-xs uppercase tracking-wider mb-2`}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full justify-start rounded-xl transition-all duration-300 group ${
                        activeTab === item.id
                          ? "bg-gradient-primary text-sidebar-primary-foreground shadow-primary font-medium transform scale-[1.02]"
                          : "hover:bg-sidebar-accent/50 text-sidebar-foreground hover:text-sidebar-foreground hover:transform hover:scale-[1.02]"
                      }`}
                    >
                      <item.icon className={`h-5 w-5 transition-all duration-300 ${
                        activeTab === item.id ? "text-white" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                      }`} />
                      {!isCollapsed && (
                        <span className="ml-3 text-sm font-medium transition-all duration-300">
                          {item.title}
                        </span>
                      )}
                      {activeTab === item.id && !isCollapsed && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
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
        <div className="p-4 border-t border-sidebar-border/50">
          {!isCollapsed && (
            <div className="text-center text-xs text-sidebar-foreground/50">
              {isSpecialUser ? (
                <>© 2025 LeadM<span className="text-purple-500 font-semibold">8</span> Nexus</>
              ) : (
                <>© {new Date().getFullYear()} PSN Dashboard</>
              )}
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
