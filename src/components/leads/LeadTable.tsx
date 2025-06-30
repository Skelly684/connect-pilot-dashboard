
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Mail, Phone, Eye, MoreHorizontal, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data - replace with actual data from API
const mockLeads = [
  {
    id: 1,
    name: "John Smith",
    jobTitle: "Marketing Director",
    company: "TechCorp Inc.",
    email: "john.smith@techcorp.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    status: "new",
    lastContact: null,
  },
  {
    id: 2,
    name: "Sarah Johnson",
    jobTitle: "VP of Sales",
    company: "Growth Solutions",
    email: "sarah.j@growthsol.com",
    phone: "+1 (555) 987-6543",
    location: "New York, NY",
    status: "contacted",
    lastContact: "2024-01-15",
  },
  {
    id: 3,
    name: "Michael Chen",
    jobTitle: "CEO",
    company: "StartupXYZ",
    email: "mike@startupxyz.io",
    phone: "+1 (555) 456-7890",
    location: "Austin, TX",
    status: "replied",
    lastContact: "2024-01-12",
  },
  {
    id: 4,
    name: "Emily Davis",
    jobTitle: "Head of Marketing",
    company: "InnovateCo",
    email: "emily.davis@innovate.co",
    phone: "+1 (555) 234-5678",
    location: "Seattle, WA",
    status: "qualified",
    lastContact: "2024-01-10",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-800";
    case "contacted":
      return "bg-yellow-100 text-yellow-800";
    case "replied":
      return "bg-green-100 text-green-800";
    case "qualified":
      return "bg-purple-100 text-purple-800";
    case "not_interested":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const LeadTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [leads] = useState(mockLeads);

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lead Database</CardTitle>
            <CardDescription>
              {filteredLeads.length} leads found • Click on any lead to view details
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`/avatars/${lead.id}.png`} />
                        <AvatarFallback>
                          {lead.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{lead.jobTitle}</TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell className="text-sm text-gray-500">{lead.location}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {lead.lastContact || "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white">
                          <DropdownMenuItem>Add to Campaign</DropdownMenuItem>
                          <DropdownMenuItem>Update Status</DropdownMenuItem>
                          <DropdownMenuItem>Add Note</DropdownMenuItem>
                          <DropdownMenuItem>Export Contact</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
