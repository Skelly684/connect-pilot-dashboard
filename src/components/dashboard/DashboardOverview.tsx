
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Send, CheckCircle, TrendingUp, Bell, X } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useMemo } from "react";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const DashboardOverview = () => {
  const { leads, isLoading } = useLeads();
  const { notifications, markAsRead, removeNotification } = useNotifications();
  
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const acceptedLeads = leads.filter(lead => lead.status === 'accepted').length;
    const contactedLeads = leads.filter(lead => lead.status === 'contacted' || lead.sent_for_contact_at).length;
    const newLeads = leads.filter(lead => lead.status === 'new').length;
    
    const responseRate = contactedLeads > 0 ? ((acceptedLeads / contactedLeads) * 100).toFixed(1) : '0';
    
    return [
      {
        title: "Total Leads",
        value: totalLeads.toLocaleString(),
        description: `${newLeads} new leads`,
        icon: Users,
        color: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        title: "Accepted Leads",
        value: acceptedLeads.toLocaleString(),
        description: `${Math.round((acceptedLeads / Math.max(totalLeads, 1)) * 100)}% acceptance rate`,
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-50",
      },
      {
        title: "Contacted",
        value: contactedLeads.toLocaleString(),
        description: `${Math.round((contactedLeads / Math.max(totalLeads, 1)) * 100)}% contacted`,
        icon: Send,
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
      {
        title: "Response Rate",
        value: `${responseRate}%`,
        description: `${contactedLeads} leads contacted`,
        icon: TrendingUp,
        color: "text-orange-600",
        bg: "bg-orange-50",
      },
    ];
  }, [leads]);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-foreground">Dashboard Overview</h2>
        <p className="text-gray-600 dark:text-foreground/90 text-base">Monitor your lead generation and outreach performance</p>
        {isLoading && <p className="text-sm text-gray-500 dark:text-foreground/70">Loading data...</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="stat-card border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground dark:text-foreground/80">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bg} dark:bg-primary/20`}>
                <stat.icon className={`h-4 w-4 ${stat.color} dark:text-primary`} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="stat-value text-3xl font-extrabold text-gray-900 dark:text-foreground">
                {stat.value}
              </div>
              <p className="text-xs text-gray-500 dark:text-foreground/70 mt-1 font-medium">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest lead generation and outreach activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-sm text-gray-500">Loading recent activity...</div>
              ) : leads.length === 0 ? (
                <div className="text-sm text-gray-500">No recent activity</div>
              ) : (
                leads.slice(0, 4).map((lead, index) => {
                  const displayName = lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown';
                  
                  let displayCompany = 'Unknown Company';
                  try {
                    if (typeof lead.company === 'string' && lead.company.startsWith('{')) {
                      const companyData = JSON.parse(lead.company);
                      displayCompany = companyData.companyName || companyData.name || 'Unknown Company';
                    } else if (typeof lead.company === 'object' && lead.company?.companyName) {
                      displayCompany = lead.company.companyName;
                    } else {
                      displayCompany = lead.company || lead.company_name || 'Unknown Company';
                    }
                  } catch (e) {
                    displayCompany = lead.company_name || 'Unknown Company';
                  }
                  
                  return (
                    <div 
                      key={lead.id || index} 
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-card rounded-lg transition-all duration-500 hover:bg-purple-100 dark:hover:bg-gradient-to-r dark:hover:from-purple-900/40 dark:hover:to-purple-800/30 dark:hover:shadow-[0_0_30px_hsl(262_100%_70%/0.4)] dark:hover:scale-[1.02] cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-foreground">{displayName}</p>
                        <p className="text-sm text-gray-600 dark:text-foreground/80">{displayCompany} - {lead.status || 'new'}</p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-foreground/70">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Latest Notifications
            </CardTitle>
            <CardDescription>Recent updates and alerts from your campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs text-gray-500 dark:text-foreground/60">Notifications will appear here when leads interact with your campaigns</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className={`p-3 rounded-lg border transition-all duration-500 ${notification.read ? 'bg-gray-50 dark:bg-card border-gray-200 dark:border-border' : 'bg-gradient-to-br from-purple-600/90 to-purple-700/90 dark:from-purple-600/80 dark:to-purple-800/80 border-purple-400/70 notification-pulse'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm ${notification.read ? 'text-gray-900 dark:text-foreground' : 'text-white'}`}>{notification.title}</p>
                          {!notification.read && <Badge variant="secondary" className="text-xs bg-purple-300 text-purple-900">New</Badge>}
                        </div>
                        <p className={`text-sm mt-1 ${notification.read ? 'text-gray-600 dark:text-foreground/80' : 'text-purple-100'}`}>{notification.message}</p>
                        <p className={`text-xs mt-1 ${notification.read ? 'text-gray-500 dark:text-foreground/60' : 'text-purple-200'}`}>
                          {notification.timestamp.toLocaleDateString()} at {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className={`text-xs p-1 h-6 ${notification.read ? '' : 'text-purple-200 hover:text-white hover:bg-purple-700/50'}`}
                          >
                            Mark read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                          className={`p-1 h-6 w-6 ${notification.read ? 'text-gray-500 hover:text-gray-700' : 'text-purple-200 hover:text-white hover:bg-purple-700/50'}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
