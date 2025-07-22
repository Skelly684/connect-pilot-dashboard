
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Send, CheckCircle, TrendingUp } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useMemo } from "react";

export const DashboardOverview = () => {
  const { leads, isLoading } = useLeads();
  
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
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600">Monitor your lead generation and outreach performance</p>
        {isLoading && <p className="text-sm text-gray-500">Loading data...</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
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
              {leads.slice(0, 4).map((lead, index) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{lead.first_name} {lead.last_name}</p>
                    <p className="text-sm text-gray-600">{lead.company_name} - {lead.status}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Generate New Leads</p>
                <p className="text-xs text-gray-500">Search for prospects using our filters</p>
              </div>
              <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center">
                <Send className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Start Outreach Campaign</p>
                <p className="text-xs text-gray-500">Send personalized messages to leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
