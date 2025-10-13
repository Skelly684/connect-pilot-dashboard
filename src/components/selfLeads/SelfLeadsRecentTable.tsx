import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Linkedin } from "lucide-react";
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
  // New scraper fields
  fullName?: string;
  email?: string;
  position?: string;
  orgName?: string;
  orgWebsite?: string;
  orgCountry?: string;
  linkedinUrl?: string;
  // Legacy fields
  first_name?: string;
  last_name?: string;
  job_title?: string;
  company_name?: string;
  email_address?: string;
  contact_phone_numbers?: any;
  city_name?: string;
  state_name?: string;
  country_name?: string;
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

  const getInitials = (lead: RecentLead) => {
    // Try new scraper field first
    if (lead.fullName) {
      const names = lead.fullName.split(' ');
      return names.map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'LL';
    }
    // Fallback to legacy fields
    const first = lead.first_name?.charAt(0)?.toUpperCase() || '';
    const last = lead.last_name?.charAt(0)?.toUpperCase() || '';
    return first + last || 'LL';
  };

  const getFullName = (lead: RecentLead) => {
    // Prioritize new scraper field
    if (lead.fullName) return lead.fullName;
    // Fallback to legacy fields
    const first = lead.first_name?.trim() || '';
    const last = lead.last_name?.trim() || '';
    return `${first} ${last}`.trim() || '—';
  };

  const getJobTitle = (lead: RecentLead) => {
    // Prioritize new scraper field
    return lead.position?.trim() || lead.job_title?.trim() || '—';
  };

  const getCompanyName = (lead: RecentLead) => {
    // Prioritize new scraper field
    return lead.orgName?.trim() || lead.company_name?.trim() || '—';
  };

  const getEmail = (lead: RecentLead) => {
    // New scraper field 'email' is prioritized
    return lead.email?.trim() || lead.email_address?.trim() || '—';
  };

  const getLocation = (lead: RecentLead) => {
    // Prioritize new scraper field (company country)
    if (lead.orgCountry?.trim()) return lead.orgCountry;
    // Fallback to legacy fields
    const parts = [lead.city_name, lead.state_name, lead.country_name]
      .filter(part => part && part.trim() && part !== 'N/A');
    return parts.join(', ') || '—';
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
    const email = getEmail(lead);
    return email && email !== '—' && email !== 'N/A';
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border/50 shadow-elegant animate-fade-in">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Self-Generated Leads</CardTitle>
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
      <Card className="bg-gradient-card border-border/50 shadow-elegant animate-fade-in">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Self-Generated Leads</CardTitle>
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
    <Card className="bg-gradient-card border-border/50 hover:shadow-elegant transition-all duration-500 animate-fade-in">
      <CardHeader>
        <CardTitle className="text-foreground">Recent Self-Generated Leads</CardTitle>
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
              <TableHead className="text-center">LinkedIn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentLeads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="cursor-pointer hover:bg-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-purple-500/10 dark:hover:to-pink-500/10 transition-all duration-500 dark:hover:shadow-[0_0_50px_hsl(262_100%_70%/0.6)]"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                      <AvatarFallback className="text-sm bg-gradient-primary text-white font-semibold">
                        {getInitials(lead)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground" title={getFullName(lead) === '—' ? 'Not provided' : getFullName(lead)}>
                        {getFullName(lead)}
                      </div>
                      {hasEmail(lead) && (
                        <div className="text-sm text-muted-foreground" title={getEmail(lead)}>
                          {getEmail(lead)}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground" title={getJobTitle(lead) === '—' ? 'Not provided' : getJobTitle(lead)}>
                    {getJobTitle(lead)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-foreground" title={getCompanyName(lead) === '—' ? 'Not provided' : getCompanyName(lead)}>
                    {getCompanyName(lead)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground" title={getLocation(lead) === '—' ? 'Not provided' : getLocation(lead)}>
                    {getLocation(lead)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className="bg-green-500/20 text-green-400 border-green-500/30 shadow-sm"
                  >
                    accepted
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Phone 
                      className={`h-4 w-4 transition-all duration-300 ${
                        hasPhone(lead) 
                          ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]' 
                          : 'text-muted-foreground/30'
                      }`} 
                    />
                    <Mail 
                      className={`h-4 w-4 transition-all duration-300 ${
                        hasEmail(lead) 
                          ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]' 
                          : 'text-muted-foreground/30'
                      }`} 
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {lead.linkedinUrl ? (
                    <a 
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="View LinkedIn profile"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center text-gray-300 dark:text-gray-600" title="No profile">
                      <Linkedin className="h-4 w-4" />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}