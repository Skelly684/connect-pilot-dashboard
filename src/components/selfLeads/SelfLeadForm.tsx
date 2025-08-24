import { useState } from "react";
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

interface SelfLeadFormProps {
  formData: any;
  onFormDataChange: (updates: any) => void;
  onReset: () => void;
}

export function SelfLeadForm({ formData, onFormDataChange, onReset }: SelfLeadFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const { toast } = useToast();
  const { campaigns } = useCampaigns();
  const { user } = useAuth();

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
    if (!formData.first_name?.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive"
      });
      return false;
    }

    if (formData.email_address && formData.email_address !== 'N/A') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email_address)) {
        toast({
          title: "Validation Error", 
          description: "Please enter a valid email address",
          variant: "destructive"
        });
        return false;
      }
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
      
      const { error } = await supabase
        .from('leads')
        .insert([leadObject]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead accepted successfully"
      });

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
      
      // Save to database first
      const { error: saveError } = await supabase
        .from('leads')
        .insert([leadObject]);

      if (saveError) throw saveError;

      // Get campaign email template if selected
      const selectedCampaign = campaigns.find(c => c.id === formData.campaign_id);
      const emailTemplateId = selectedCampaign?.email_template_id || null;

      // Send to backend for processing
      const response = await fetch('/api/accepted-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leads: [leadObject],
          emailTemplateId: emailTemplateId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate contact');
      }

      toast({
        title: "Success",
        description: "Contact initiated successfully"
      });

      onReset();
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
              <Label htmlFor="first_name">First Name *</Label>
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
            <Label htmlFor="email_address">Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="email_address"
                type="email"
                value={formData.email_address}
                onChange={(e) => handleInputChange('email_address', e.target.value)}
                placeholder="Enter email address"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleInputChange('email_address', 'N/A')}
              >
                N/A
              </Button>
            </div>
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
            <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
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
              <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
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
              <Select value={formData.company_size} onValueChange={(value) => handleInputChange('company_size', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
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
            <Select value={formData.seniority_level} onValueChange={(value) => handleInputChange('seniority_level', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select seniority level" />
              </SelectTrigger>
              <SelectContent>
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
            <Select value={formData.campaign_id} onValueChange={(value) => handleInputChange('campaign_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No campaign</SelectItem>
                {campaigns.filter(c => c.is_active).map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
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