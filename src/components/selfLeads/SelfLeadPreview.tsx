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
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        pending review
      </Badge>
    );
  };

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-sm font-medium">
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
              <h3 className="font-semibold text-lg">{getFullName()}</h3>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">
              {getDisplayValue(formData.job_title)}
            </p>
          </div>

          <div>
            <p className="font-medium">{getDisplayValue(formData.company_name)}</p>
            {formData.department && formData.department !== 'N/A' && (
              <p className="text-sm text-muted-foreground">{formData.department}</p>
            )}
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span>{getDisplayValue(formData.email_address)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Phone:</span>
            <span>{getFirstPhone()}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Location:</span>
            <span>{getLocation()}</span>
          </div>
        </div>

        {/* Company Details */}
        <div className="space-y-2 pt-3 border-t">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Company Details
          </div>
          
          {formData.industry && formData.industry !== 'N/A' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Industry:</span> {formData.industry}
            </div>
          )}

          {formData.company_size && formData.company_size !== 'N/A' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Company Size:</span> {formData.company_size}
            </div>
          )}

          {formData.seniority_level && formData.seniority_level !== 'N/A' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Seniority:</span> {formData.seniority_level}
            </div>
          )}

          {formData.years_experience && formData.years_experience !== 'N/A' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Experience:</span> {formData.years_experience} years
            </div>
          )}
        </div>

        {/* Notes */}
        {formData.notes?.trim() && (
          <div className="space-y-2 pt-3 border-t">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {formData.notes}
            </p>
          </div>
        )}

        {/* Phone Numbers List */}
        {formData.contact_phone_numbers?.length > 1 && (
          <div className="space-y-2 pt-3 border-t">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              All Phone Numbers
            </div>
            {formData.contact_phone_numbers.map((phone: any, index: number) => (
              phone.rawNumber?.trim() && (
                <div key={index} className="text-sm">
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