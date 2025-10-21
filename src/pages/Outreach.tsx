import { useState, useEffect } from 'react';
import { Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CampaignList } from '@/components/outreach/CampaignList';
import { CampaignStats } from '@/components/outreach/CampaignStats';
import { ActionFooter } from '@/components/outreach/ActionFooter';
import { CampaignDialog } from '@/components/outreach/CampaignDialog';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';
import { useSearchParams } from 'react-router-dom';

export default function Outreach() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [searchParams] = useSearchParams();
  const { campaigns, isLoading } = useCampaigns();

  const handleNewCampaign = () => {
    setDialogMode('create');
    setShowCampaignDialog(true);
  };

  const handleEditCampaign = () => {
    if (selectedCampaign) {
      setDialogMode('edit');
      setShowCampaignDialog(true);
    }
  };

  // Auto-select campaign from URL parameter and update when campaigns change
  useEffect(() => {
    const campaignId = searchParams.get('campaign');
    if (campaignId && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        // Update selectedCampaign with fresh data from campaigns
        setSelectedCampaign(campaign);
      }
    }
  }, [searchParams, campaigns]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Outreach Centre</h1>
              <p className="text-muted-foreground mt-2">
                Create tailored call + email flows. Variables: {'{first_name}'}, {'{last_name}'}, {'{company}'}, {'{job_title}'}, {'{email}'}, {'{city}'}, {'{state}'}, {'{country}'}.
              </p>
            </div>
            <Button onClick={handleNewCampaign} className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-200px)]">
          {/* Left Column - Campaigns List */}
          <div className="col-span-4">
            <CampaignList
              campaigns={campaigns}
              selectedCampaign={selectedCampaign}
              onSelectCampaign={setSelectedCampaign}
            />
          </div>

          {/* Right Column - Campaign Preview */}
          <div className="col-span-8 flex flex-col">
            {selectedCampaign ? (
              <>
                {/* Stats */}
                <CampaignStats campaignId={selectedCampaign.id} />
                
                {/* Campaign Preview Card */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md space-y-4">
                    <div className="p-8 bg-card border rounded-lg">
                      <h2 className="text-2xl font-semibold mb-2">{selectedCampaign.name}</h2>
                      <p className="text-muted-foreground mb-6">
                        Click "Edit Campaign" below to modify settings, messaging, and delivery rules.
                      </p>
                      <Button onClick={handleEditCampaign} size="lg" className="gap-2">
                        <Edit className="h-4 w-4" />
                        Edit Campaign
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <ActionFooter campaign={selectedCampaign} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/10 border-2 border-dashed border-muted rounded-lg">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Select a campaign to edit
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a campaign from the list or create a new one to get started.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Dialog (Create/Edit) */}
      <CampaignDialog
        open={showCampaignDialog}
        onOpenChange={setShowCampaignDialog}
        campaign={dialogMode === 'edit' ? selectedCampaign : null}
        mode={dialogMode}
      />
    </div>
  );
}