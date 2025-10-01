
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Send, CheckCircle, TrendingUp, Bell, X } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useMemo } from "react";
import { useNotifications } from "@/hooks/useNotifications";
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
        bg: "bg-blue-50 dark:bg-blue-950/30",
      },
      {
        title: "Accepted Leads",
        value: acceptedLeads.toLocaleString(),
        description: `${Math.round((acceptedLeads / Math.max(totalLeads, 1)) * 100)}% acceptance rate`,
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-50 dark:bg-green-950/30",
      },
      {
        title: "Contacted",
        value: contactedLeads.toLocaleString(),
        description: `${Math.round((contactedLeads / Math.max(totalLeads, 1)) * 100)}% contacted`,
        icon: Send,
        color: "text-purple-600",
        bg: "bg-purple-50 dark:bg-purple-950/30",
      },
      {
        title: "Response Rate",
        value: `${responseRate}%`,
        description: `${contactedLeads} leads contacted`,
        icon: TrendingUp,
        color: "text-orange-600",
        bg: "bg-orange-50 dark:bg-orange-950/30",
      },
    ];
  }, [leads]);
  
  return (
    <div className="space-y-10 animate-fade-in">
      <div className="space-y-3">
        <h2 className="text-5xl font-black tracking-tight bg-gradient-primary bg-clip-text text-transparent">
          Dashboard Overview
        </h2>
        <p className="text-muted-foreground text-xl font-medium">Monitor your lead generation and outreach performance in real-time</p>
        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-4">
            <div className="h-5 w-5 animate-spin rounded-full border-3 border-primary border-t-transparent shadow-glow"></div>
            <span className="font-semibold">Loading data...</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="group relative overflow-hidden border-2 border-border/30 bg-gradient-card backdrop-blur-2xl shadow-2xl hover:shadow-glow transition-all duration-700 hover:scale-[1.05] hover:-translate-y-2 animate-scale-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {stat.title}
              </CardTitle>
              <div className={`relative p-4 rounded-3xl ${stat.bg} group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 shadow-lg`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-30 rounded-3xl blur-md transition-all duration-700"></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground via-primary to-accent bg-clip-text text-transparent">
                {stat.value}
              </div>
              <p className="text-sm text-muted-foreground font-semibold leading-tight">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-gradient-card backdrop-blur-xl shadow-elevated hover:shadow-glow transition-all duration-500">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              Recent Activity
            </CardTitle>
            <CardDescription className="text-muted-foreground">Latest lead generation and outreach activities</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Loading recent activity...
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No recent activity</p>
                </div>
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
                      className="group flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 border border-border/30 rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{displayName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">{displayCompany}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                            {lead.status || 'new'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-gradient-card backdrop-blur-xl shadow-elevated hover:shadow-glow transition-all duration-500">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Latest Notifications
            </CardTitle>
            <CardDescription className="text-muted-foreground">Recent updates and alerts from your campaigns</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs mt-1 opacity-70">Notifications will appear here when leads interact with your campaigns</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`group p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] ${
                      notification.read 
                        ? 'bg-muted/20 border-border/30 hover:bg-muted/30' 
                        : 'bg-primary/5 border-primary/20 hover:bg-primary/10 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm text-foreground truncate">{notification.title}</p>
                          {!notification.read && (
                            <Badge variant="secondary" className="text-xs px-2 py-0 bg-primary/20 text-primary border-0 shrink-0">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground/70 mt-2 font-medium">
                          {notification.timestamp.toLocaleDateString()} at {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-start gap-1 shrink-0">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs px-2 py-1 h-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                          >
                            Mark read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                          className="p-1 h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
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
