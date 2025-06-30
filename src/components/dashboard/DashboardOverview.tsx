
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Send, CheckCircle, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Total Leads",
    value: "2,847",
    description: "+12% from last month",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Outreach Sent",
    value: "1,234",
    description: "+8% from last month",
    icon: Send,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "Responses",
    value: "156",
    description: "12.6% response rate",
    icon: CheckCircle,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Conversion Rate",
    value: "4.2%",
    description: "+2.1% from last month",
    icon: TrendingUp,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

export const DashboardOverview = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600">Monitor your lead generation and outreach performance</p>
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
              {[
                { action: "New leads generated", count: "23 leads", time: "2 hours ago" },
                { action: "Email campaign sent", count: "156 emails", time: "4 hours ago" },
                { action: "CRM sync completed", count: "89 contacts", time: "6 hours ago" },
                { action: "Response received", count: "3 responses", time: "1 day ago" },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.count}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
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
