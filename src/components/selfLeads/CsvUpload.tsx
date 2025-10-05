import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CsvUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const { toast } = useToast();
  const { campaigns, getDefaultCampaign } = useCampaigns();
  const { user } = useAuth();

  const parsePhoneNumber = (phoneStr: string): any[] => {
    if (!phoneStr || phoneStr.trim() === '') return [];
    const phones = phoneStr.split(/[,;]/).map(p => p.trim()).filter(Boolean);
    return phones.map(phone => ({ rawNumber: phone }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // Validate campaign selection
    if (!selectedCampaignId) {
      toast({
        title: "Campaign Required",
        description: "Please select a campaign first, then upload your file again",
        variant: "destructive"
      });
      event.target.value = "";
      setFileName("");
      return;
    }

    setIsUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      if (jsonData.length === 0) {
        toast({
          title: "Empty File",
          description: "The CSV file contains no data",
          variant: "destructive"
        });
        return;
      }

      // Map CSV columns to lead fields
      const leads = jsonData.map((row: any) => {
        const email = row['EMAIL']?.trim() || '';
        const firstName = row['FIRST NAME']?.trim() || row['FIRST_NAME']?.trim() || '';
        const lastName = row['LAST NAME']?.trim() || row['LAST_NAME']?.trim() || 'N/A';
        const company = row['COMPANY']?.trim() || 'N/A';
        const jobTitle = row['JOB TITLE']?.trim() || row['JOB_TITLE']?.trim() || 'N/A';
        const department = row['DEPARTMENT']?.trim() || '';
        const phoneNumber = row['PHONE NUMBER']?.trim() || row['PHONE_NUMBER']?.trim() || '';
        const country = row['COUNTRY']?.trim() || '';
        const region = row['REGION']?.trim() || '';
        const leadSource = row['LEAD SOURCE']?.trim() || row['LEAD_SOURCE']?.trim() || '';

        // Build notes from extra fields
        const noteParts = [];
        if (department) noteParts.push(`Department: ${department}`);
        if (leadSource) noteParts.push(`Lead Source: ${leadSource}`);
        const notes = noteParts.length > 0 ? noteParts.join('\n') : null;

        return {
          id: crypto.randomUUID(),
          user_id: user?.id,
          first_name: firstName || null,
          last_name: lastName,
          job_title: jobTitle,
          company_name: company,
          email: email,
          email_address: email,
          contact_phone_numbers: JSON.stringify(parsePhoneNumber(phoneNumber)),
          city_name: null,
          state_name: region || null,
          country_name: country || null,
          notes: notes,
          campaign_id: selectedCampaignId,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          next_email_step: 1,
          call_attempts: 0,
          last_call_status: null,
          next_call_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          scraped_at: new Date().toISOString()
        };
      });

      // Filter out leads without email
      const validLeads = leads.filter(lead => {
        const hasEmail = lead.email_address && lead.email_address !== '';
        const hasName = lead.first_name || (lead.company_name && lead.company_name !== 'N/A');
        return hasEmail && hasName;
      });

      if (validLeads.length === 0) {
        toast({
          title: "Invalid Data",
          description: "No valid leads found. Each lead must have an email and either a first name or company name.",
          variant: "destructive"
        });
        return;
      }

      // Check for existing emails
      const emails = validLeads.map(l => l.email_address);
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('email_address')
        .eq('user_id', user?.id)
        .in('email_address', emails);

      const existingEmails = new Set(existingLeads?.map(l => l.email_address) || []);
      const newLeads = validLeads.filter(lead => !existingEmails.has(lead.email_address));

      if (newLeads.length === 0) {
        toast({
          title: "Duplicate Leads",
          description: "All leads from the CSV already exist in your database",
          variant: "destructive"
        });
        return;
      }

      // Insert leads in batches of 100
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < newLeads.length; i += batchSize) {
        const batch = newLeads.slice(i, i + batchSize);
        const { error } = await supabase
          .from('leads')
          .insert(batch);

        if (error) {
          console.error('Error inserting batch:', error);
          toast({
            title: "Partial Success",
            description: `Inserted ${insertedCount} leads before error occurred`,
            variant: "destructive"
          });
          return;
        }

        insertedCount += batch.length;
      }

      const skippedCount = validLeads.length - newLeads.length;
      const invalidCount = leads.length - validLeads.length;

      let description = `Successfully imported ${insertedCount} leads`;
      if (skippedCount > 0) description += `. Skipped ${skippedCount} duplicates`;
      if (invalidCount > 0) description += `. Skipped ${invalidCount} invalid entries`;

      toast({
        title: "Import Complete",
        description
      });

      // Reset form
      setFileName("");
      event.target.value = "";
    } catch (error: any) {
      console.error('CSV upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to process CSV file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50 hover:shadow-elegant transition-all duration-500 animate-scale-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Bulk Import from CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-primary/30 bg-primary/10">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            CSV must include these column headers: EMAIL, FIRST NAME, LAST NAME, COMPANY, JOB TITLE, DEPARTMENT, PHONE NUMBER, COUNTRY, REGION, LEAD SOURCE
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="csv-campaign">Campaign *</Label>
          <Select
            value={selectedCampaignId}
            onValueChange={setSelectedCampaignId}
          >
            <SelectTrigger id="csv-campaign">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                  {campaign.is_default && " (Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="csv-file">Upload CSV File</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              id="csv-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="cursor-pointer"
            />
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {fileName && <p className="text-sm text-muted-foreground mt-1">{fileName}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
