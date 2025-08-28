
import { Home, Users, Send, Settings, BarChart3, Zap, CheckSquare, Eye, Database, Plus, Calendar } from "lucide-react";
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

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="bg-white border-r">
        <div className="p-4">
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/7c5cb75c-bf84-4a68-9e78-2fd787db361e.png" 
              alt="PSN Logo" 
              className="w-20 h-20 rounded-full"
            />
          </div>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "hidden" : "block"}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full justify-start ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span className="ml-3">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
