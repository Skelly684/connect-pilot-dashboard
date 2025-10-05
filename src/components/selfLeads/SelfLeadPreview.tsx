import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, MapPin } from "lucide-react";

interface SelfLeadPreviewProps {
  formData: any;
}

export function SelfLeadPreview({ formData }: SelfLeadPreviewProps) {
  const getInitials = () => {
    const first = formData.first_name?.charAt(0)?.toUpperCase() || '';
    const last = formData.last_name?.charAt(0)?.toUpperCase() || '';
    return first + last || 'LL';
  };

  const getDisplayValue = (value: string) => {
    return value?.trim() || 'N/A';
  };

  const getFullName = () => {
    const first = formData.first_name?.trim() || '';
    const last = formData.last_name?.trim() || '';
    if (!first && !last) return 'N/A';
    return `${first} ${last}`.trim();
  };

  const getLocation = () => {
    const parts = [
      formData.city_name?.trim(),
      formData.state_name?.trim(), 
      formData.country_name?.trim()
    ].filter(part => part && part !== 'N/A');
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const getFirstPhone = () => {
    if (formData.contact_phone_numbers?.length > 0) {
      const phone = formData.contact_phone_numbers[0];
      return phone?.rawNumber?.trim() || 'N/A';
    }
    return 'N/A';
  };

  const getStatusBadge = () => {
    return (
      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-sm">
        pending review
      </Badge>
    );
  };

  return (
    <Card className="sticky top-6 bg-gradient-card border-border/50 shadow-elegant animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarFallback className="text-sm font-medium bg-gradient-primary text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-foreground">{getFullName()}</h3>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">
              {getDisplayValue(formData.job_title)}
            </p>
          </div>

          <div>
            <p className="font-medium text-foreground">{getDisplayValue(formData.company_name)}</p>
            {formData.department && formData.department !== 'N/A' && (
              <p className="text-sm text-muted-foreground">{formData.department}</p>
            )}
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Email:</span>
            <span className="text-foreground">{getDisplayValue(formData.email_address)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Phone:</span>
            <span className="text-foreground">{getFirstPhone()}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Location:</span>
            <span className="text-foreground">{getLocation()}</span>
          </div>
        </div>

        {/* Company Details */}
        <div className="space-y-2 pt-3 border-t border-border/30">
          <div className="text-xs font-medium text-primary uppercase tracking-wider">
            Company Details
          </div>
          
          {formData.industry && formData.industry !== 'N/A' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Industry:</span> <span className="text-foreground">{formData.industry}</span>
            </div>
          )}

          {formData.company_size && formData.company_size !== 'N/A' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Company Size:</span> <span className="text-foreground">{formData.company_size}</span>
            </div>
          )}

          {formData.seniority_level && formData.seniority_level !== 'N/A' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Seniority:</span> <span className="text-foreground">{formData.seniority_level}</span>
            </div>
          )}

          {formData.years_experience && formData.years_experience !== 'N/A' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Experience:</span> <span className="text-foreground">{formData.years_experience} years</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {formData.notes?.trim() && (
          <div className="space-y-2 pt-3 border-t border-border/30">
            <div className="text-xs font-medium text-primary uppercase tracking-wider">
              Notes
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {formData.notes}
            </p>
          </div>
        )}

        {/* Phone Numbers List */}
        {formData.contact_phone_numbers?.length > 1 && (
          <div className="space-y-2 pt-3 border-t border-border/30">
            <div className="text-xs font-medium text-primary uppercase tracking-wider">
              All Phone Numbers
            </div>
            {formData.contact_phone_numbers.map((phone: any, index: number) => (
              phone.rawNumber?.trim() && (
                <div key={index} className="text-sm text-foreground">
                  {index + 1}. {phone.rawNumber}
                </div>
              )
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}