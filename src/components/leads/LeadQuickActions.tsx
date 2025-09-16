import { Button } from "@/components/ui/button";
import { Mail, Phone, Eye } from "lucide-react";
import { copyToClipboard } from "@/utils/clipboard";
import { getBestPhone } from "@/utils/getBestPhone";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id?: number | string;
  name?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  email?: string;
  emailAddress?: string;
  email_address?: string;
  phone?: string;
  phone_number?: string;
  mobile?: string;
  mobile_number?: string;
  contactPhoneNumbers?: Array<{ sanitizedNumber?: string; rawNumber?: string }>;
  contact_phone_numbers?: string;
}

interface LeadQuickActionsProps {
  lead: Lead;
  onSendEmail?: (lead: Lead) => void;
  onCallLead?: (lead: Lead) => void;
  onViewActivity?: (leadId: string) => void;
  showViewActivity?: boolean;
}

export function LeadQuickActions({ 
  lead, 
  onSendEmail, 
  onCallLead, 
  onViewActivity,
  showViewActivity = false 
}: LeadQuickActionsProps) {
  const { toast } = useToast();
  
  // Extract email with preference order
  const email = (lead.email || lead.emailAddress || lead.email_address || "").trim();
  
  // Get best phone number
  const phone = getBestPhone(lead);
  
  const leadId = String(lead.id || "");

  const handleCopyEmail = async () => {
    if (!email) {
      toast({
        title: "No email available",
        description: "This lead doesn't have an email address",
        variant: "destructive",
      });
      return;
    }
    
    const success = await copyToClipboard(email);
    if (success) {
      toast({
        title: "Email copied",
        description: `Copied ${email} to clipboard`,
      });
    } else {
      toast({
        title: "Couldn't copy email",
        description: "Please try copying manually",
        variant: "destructive",
      });
    }
  };

  const handleCopyPhone = async () => {
    if (!phone) {
      toast({
        title: "No phone available",
        description: "This lead doesn't have a phone number",
        variant: "destructive",
      });
      return;
    }
    
    const success = await copyToClipboard(phone);
    if (success) {
      toast({
        title: "Phone copied",
        description: `Copied ${phone} to clipboard`,
      });
    } else {
      toast({
        title: "Couldn't copy phone",
        description: "Please try copying manually",
        variant: "destructive",
      });
    }
  };

  const handleEmailAction = () => {
    if (onSendEmail) {
      onSendEmail(lead);
    } else {
      handleCopyEmail();
    }
  };

  const handlePhoneAction = () => {
    if (onCallLead) {
      onCallLead(lead);
    } else {
      handleCopyPhone();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleEmailAction}
        disabled={!email}
        aria-label={onSendEmail ? "Send email" : "Copy email"}
        data-testid="copy-email"
        title={onSendEmail ? "Send email" : "Copy email to clipboard"}
      >
        <Mail className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePhoneAction}
        disabled={!phone}
        aria-label={onCallLead ? "Call now" : "Copy phone"}
        data-testid="copy-phone"
        title={onCallLead ? "Call now" : "Copy phone to clipboard"}
      >
        <Phone className="h-4 w-4" />
      </Button>

      {showViewActivity && onViewActivity && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewActivity(leadId)}
          aria-label="View activity"
          title="View lead activity"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}