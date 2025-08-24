import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RecentLead {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  company_name: string;
  email_address: string;
  contact_phone_numbers: any;
  city_name: string;
  state_name: string;
  country_name: string;
  status: string;
  created_at: string;
}

export function SelfLeadsRecentTable() {
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchRecentLeads();
  }, [user]);

  const fetchRecentLeads = async () => {
    if (!user) return;

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .gte('created_at', twoDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentLeads(data || []);
    } catch (error) {
      console.error('Error fetching recent leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || 'LL';
  };

  const getFullName = (lead: RecentLead) => {
    const first = lead.first_name?.trim() || '';
    const last = lead.last_name?.trim() || '';
    return `${first} ${last}`.trim() || 'N/A';
  };

  const getLocation = (lead: RecentLead) => {
    const parts = [lead.city_name, lead.state_name, lead.country_name]
      .filter(part => part && part.trim() && part !== 'N/A');
    return parts.join(', ') || 'N/A';
  };

  const hasPhone = (lead: RecentLead) => {
    if (!lead.contact_phone_numbers) return false;
    try {
      const phones = typeof lead.contact_phone_numbers === 'string' 
        ? JSON.parse(lead.contact_phone_numbers)
        : lead.contact_phone_numbers;
      return Array.isArray(phones) && phones.length > 0 && phones.some(p => p.rawNumber?.trim());
    } catch {
      return false;
    }
  };

  const hasEmail = (lead: RecentLead) => {
    return lead.email_address && lead.email_address.trim() && lead.email_address !== 'N/A';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Self-Generated Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading recent leads...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentLeads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Self-Generated Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No recent leads found. Add your first lead above!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Self-Generated Leads</CardTitle>
        <p className="text-sm text-muted-foreground">
          Last 10 leads added in the past 48 hours
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Contact Options</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentLeads.map((lead) => (
              <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">
                        {getInitials(lead.first_name, lead.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{getFullName(lead)}</div>
                      {hasEmail(lead) && (
                        <div className="text-sm text-muted-foreground">
                          {lead.email_address}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {lead.job_title?.trim() && lead.job_title !== 'N/A' 
                      ? lead.job_title 
                      : 'N/A'
                    }
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {lead.company_name?.trim() && lead.company_name !== 'N/A'
                      ? lead.company_name
                      : 'N/A'
                    }
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {getLocation(lead)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className="bg-green-100 text-green-800 border-green-200"
                  >
                    accepted
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Phone 
                      className={`h-4 w-4 ${
                        hasPhone(lead) 
                          ? 'text-blue-600' 
                          : 'text-gray-300'
                      }`} 
                    />
                    <Mail 
                      className={`h-4 w-4 ${
                        hasEmail(lead) 
                          ? 'text-blue-600' 
                          : 'text-gray-300'
                      }`} 
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}