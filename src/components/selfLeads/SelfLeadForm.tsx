import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { apiFetch } from "@/lib/apiFetch";

interface SelfLeadFormProps {
  formData: any;
  onFormDataChange: (updates: any) => void;
  onReset: () => void;
}

export function SelfLeadForm({ formData, onFormDataChange, onReset }: SelfLeadFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const { toast } = useToast();
  const { campaigns, getDefaultCampaign } = useCampaigns();
  const { user } = useAuth();
  
  // Auto-select default campaign
  useEffect(() => {
    const defaultCampaign = getDefaultCampaign();
    if (defaultCampaign && !formData.campaign_id) {
      onFormDataChange({ campaign_id: defaultCampaign.id });
    }
  }, [campaigns, formData.campaign_id, getDefaultCampaign, onFormDataChange]);

  const handleInputChange = (field: string, value: any) => {
    onFormDataChange({ [field]: value });
  };

  const addPhoneNumber = () => {
    const newPhone = { rawNumber: "" };
    onFormDataChange({ 
      contact_phone_numbers: [...formData.contact_phone_numbers, newPhone] 
    });
  };

  const updatePhoneNumber = (index: number, value: string) => {
    const updated = [...formData.contact_phone_numbers];
    updated[index] = { rawNumber: value };
    onFormDataChange({ contact_phone_numbers: updated });
  };

  const removePhoneNumber = (index: number) => {
    const updated = formData.contact_phone_numbers.filter((_: any, i: number) => i !== index);
    onFormDataChange({ contact_phone_numbers: updated });
  };

  const validateForm = () => {
    // Validate email is required
    if (!formData.email_address?.trim() || formData.email_address === 'N/A') {
      toast({
        title: "Validation Error",
        description: "Email address is required",
        variant: "destructive"
      });
      return false;
    }

    // Validate either first_name OR company_name is provided
    if ((!formData.first_name?.trim() || formData.first_name === 'N/A') && 
        (!formData.company_name?.trim() || formData.company_name === 'N/A')) {
      toast({
        title: "Validation Error",
        description: "Either first name or company name is required",
        variant: "destructive"
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email_address)) {
      toast({
        title: "Validation Error", 
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const buildLeadObject = () => {
    return {
      id: crypto.randomUUID(),
      user_id: user?.id,
      first_name: formData.first_name?.trim() || null,
      last_name: formData.last_name?.trim() || 'N/A',
      job_title: formData.job_title?.trim() || 'N/A',
      company_name: formData.company_name?.trim() || 'N/A',
      email_address: formData.email_address?.trim() || 'N/A',
      contact_phone_numbers: JSON.stringify(formData.contact_phone_numbers.filter((p: any) => p.rawNumber?.trim())),
      city_name: formData.city_name?.trim() || 'N/A',
      state_name: formData.state_name?.trim() || 'N/A',
      country_name: formData.country_name?.trim() || 'N/A',
      notes: formData.notes?.trim() || null,
      campaign_id: formData.campaign_id || null,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      call_attempts: 0,
      last_call_status: null,
      next_call_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      scraped_at: new Date().toISOString()
    };
  };

  const handleSaveAndAccept = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const leadObject = buildLeadObject();
      
      // Check for existing lead with same email
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email_address', leadObject.email_address)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingLead) {
        toast({
          title: "Duplicate Lead",
          description: "A lead with this email address already exists",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('leads')
        .insert([leadObject]);

      if (error) {
        // Handle duplicate email constraint violation
        if (error.code === '23505' && error.message?.includes('leads_user_email_unique')) {
          toast({
            title: "Duplicate Lead",
            description: "A lead with this email address already exists",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      // Send to FastAPI backend since this is an accepted lead
      try {
        // Get campaign details to include emailTemplateId
        let emailTemplateId: string | undefined = undefined;
        
        if (leadObject.campaign_id) {
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('email_template_id')
            .eq('id', leadObject.campaign_id)
            .single();
          
          emailTemplateId = campaign?.email_template_id || undefined;
        }

        const payload = {
          leads: [{
            id: leadObject.id,
            first_name: leadObject.first_name || '',
            last_name: leadObject.last_name || '',
            company_name: leadObject.company_name || '',
            email_address: leadObject.email_address || '',
            campaign_id: leadObject.campaign_id || undefined,
            // Add phone information for Vapi calls
            ...(formData.contact_phone_numbers?.length > 0 && {
              contact_phone_numbers: formData.contact_phone_numbers.filter((p: any) => p.rawNumber?.trim())
            }),
            ...(formData.phone && { phone: formData.phone })
          }],
          emailTemplateId: emailTemplateId
        };

        console.log("Sending self-generated lead to FastAPI backend:", `${API_BASE_URL}${API_ENDPOINTS.ACCEPTED_LEADS}`, payload);

        const responseData = await apiFetch(API_ENDPOINTS.ACCEPTED_LEADS, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        console.log("FastAPI backend response:", responseData);
        
        toast({
          title: "Success",
          description: "Lead accepted and sent to backend"
        });
      } catch (backendError) {
        console.error('Error sending lead to FastAPI backend:', backendError);
        toast({
          title: "Warning",
          description: "Lead saved but failed to send to backend",
          variant: "destructive"
        });
      }

      onReset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save lead",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAcceptAndContact = async () => {
    if (!validateForm()) return;

    setIsContacting(true);
    try {
      const leadObject = buildLeadObject();
      
      // Check for existing lead with same email
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email_address', leadObject.email_address)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingLead) {
        toast({
          title: "Duplicate Lead",
          description: "A lead with this email address already exists",
          variant: "destructive"
        });
        return;
      }
      
      // Save to database first
      const { error: saveError } = await supabase
        .from('leads')
        .insert([leadObject]);

      if (saveError) {
        // Handle duplicate email constraint violation
        if (saveError.code === '23505' && saveError.message?.includes('leads_user_email_unique')) {
          toast({
            title: "Duplicate Lead",
            description: "A lead with this email address already exists",
            variant: "destructive"
          });
          return;
        }
        throw saveError;
      }

      // Get campaign details to include emailTemplateId
      let emailTemplateId: string | undefined = undefined;
      
      if (formData.campaign_id) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('email_template_id')
          .eq('id', formData.campaign_id)
          .single();
        
        emailTemplateId = campaign?.email_template_id || undefined;
      }

      // Call the accept_leads data source
      const payload = {
        leads: [{
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
          email_address: formData.email_address || '',
          company_name: formData.company_name || '',
          campaign_id: formData.campaign_id || null,
          // Add phone information for Vapi calls
          ...(formData.contact_phone_numbers?.length > 0 && {
            contact_phone_numbers: formData.contact_phone_numbers.filter((p: any) => p.rawNumber?.trim())
          }),
          ...(formData.phone && { phone: formData.phone })
        }],
        emailTemplateId: emailTemplateId
      };

      const responseData = await apiFetch('/api/accepted-leads', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (responseData) {
        console.log("API response:", responseData);
        
        toast({
          title: "Success",
          description: "Lead saved & outreach queued."
        });
        
        onReset();
        // Optionally navigate to outreach center
        // window.location.href = "/outreach-center";
      } else {
        throw new Error("No response data received");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate contact",
        variant: "destructive"
      });
    } finally {
      setIsContacting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <div className="flex gap-2">
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter last name"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleInputChange('last_name', 'N/A')}
                >
                  N/A
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="email_address">Email Address *</Label>
            <Input
              id="email_address"
              type="email"
              value={formData.email_address}
              onChange={(e) => handleInputChange('email_address', e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div>
            <Label>Phone Numbers</Label>
            <div className="space-y-2">
              {formData.contact_phone_numbers.map((phone: any, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={phone.rawNumber}
                    onChange={(e) => updatePhoneNumber(index, e.target.value)}
                    placeholder="Enter phone number"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removePhoneNumber(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={addPhoneNumber}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Phone
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="job_title">Job Title</Label>
            <div className="flex gap-2">
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder="Enter job title"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleInputChange('job_title', 'N/A')}
              >
                N/A
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <div className="flex gap-2">
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Enter company name"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleInputChange('company_name', 'N/A')}
              >
                N/A
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="department">Department</Label>
            <Select value={formData.department || "none"} onValueChange={(value) => handleInputChange('department', value === 'none' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No selection</SelectItem>
                <SelectItem value="N/A">N/A</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Executive">Executive</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select value={formData.industry || "none"} onValueChange={(value) => handleInputChange('industry', value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No selection</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="company_size">Company Size</Label>
              <Select value={formData.company_size || "none"} onValueChange={(value) => handleInputChange('company_size', value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No selection</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-1000">201-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city_name">City</Label>
              <div className="flex gap-2">
                <Input
                  id="city_name"
                  value={formData.city_name}
                  onChange={(e) => handleInputChange('city_name', e.target.value)}
                  placeholder="Enter city"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleInputChange('city_name', 'N/A')}
                >
                  N/A
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="state_name">State</Label>
              <div className="flex gap-2">
                <Input
                  id="state_name"
                  value={formData.state_name}
                  onChange={(e) => handleInputChange('state_name', e.target.value)}
                  placeholder="Enter state"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleInputChange('state_name', 'N/A')}
                >
                  N/A
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="country_name">Country</Label>
              <div className="flex gap-2">
                <Input
                  id="country_name"
                  value={formData.country_name}
                  onChange={(e) => handleInputChange('country_name', e.target.value)}
                  placeholder="Enter country"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleInputChange('country_name', 'N/A')}
                >
                  N/A
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Optional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="seniority_level">Seniority Level</Label>
            <Select value={formData.seniority_level || "none"} onValueChange={(value) => handleInputChange('seniority_level', value === 'none' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select seniority level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No selection</SelectItem>
                <SelectItem value="N/A">N/A</SelectItem>
                <SelectItem value="Entry">Entry Level</SelectItem>
                <SelectItem value="Mid">Mid Level</SelectItem>
                <SelectItem value="Senior">Senior Level</SelectItem>
                <SelectItem value="Lead">Lead/Principal</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
                <SelectItem value="VP">VP</SelectItem>
                <SelectItem value="C-Level">C-Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="years_experience">Years of Experience</Label>
            <div className="flex gap-2">
              <Input
                id="years_experience"
                type="number"
                value={formData.years_experience}
                onChange={(e) => handleInputChange('years_experience', e.target.value)}
                placeholder="Enter years of experience"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleInputChange('years_experience', 'N/A')}
              >
                N/A
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="campaign_id">Campaign</Label>
            <Select value={formData.campaign_id || "none"} onValueChange={(value) => handleInputChange('campaign_id', value === 'none' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No campaign</SelectItem>
                {campaigns.filter(c => c.is_active).map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name} {campaign.is_default ? '(Default)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this lead..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={onReset}
              disabled={isSaving || isContacting}
            >
              Reset
            </Button>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveAndAccept}
                disabled={isSaving || isContacting}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save & Accept
              </Button>

              <Button
                variant="secondary"
                onClick={handleSaveAcceptAndContact}
                disabled={isSaving || isContacting}
              >
                {isContacting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save, Accept & Contact
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}