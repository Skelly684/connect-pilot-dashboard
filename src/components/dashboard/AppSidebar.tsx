
import { Home, Users, Send, Settings, BarChart3, Zap } from "lucide-react";
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
  { id: "outreach", title: "Outreach Center", icon: Send },
  { id: "analytics", title: "Analytics", icon: BarChart3 },
  { id: "integrations", title: "Integrations", icon: Zap },
  { id: "settings", title: "Settings", icon: Settings },
];

export function AppSidebar({ activeTab, setActiveTab }: AppSidebarProps) {
  const { collapsed } = useSidebar();

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible>
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="bg-white border-r">
        <div className="p-4">
          <h2 className={`font-bold text-xl text-blue-600 ${collapsed ? "hidden" : "block"}`}>
            LeadGen Pro
          </h2>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "hidden" : "block"}>
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
                    {!collapsed && <span className="ml-3">{item.title}</span>}
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
