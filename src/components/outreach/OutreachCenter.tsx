import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Send, Play, Pause, Settings, Plus, Star, StarOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignDialog } from "@/components/outreach/CampaignDialog";
import { CampaignSettingsDialog } from "@/components/outreach/CampaignSettingsDialog";


export const OutreachCenter = () => {
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { campaigns, isLoading, updateCampaign, setDefaultCampaign, deleteCampaign } = useCampaigns();

  const handleNewCampaign = () => {
    setDialogMode('create');
    setEditingCampaign(null);
    setShowCampaignDialog(true);
  };

  const handleEditCampaign = (campaign: any) => {
    setDialogMode('edit');
    setEditingCampaign(campaign);
    setShowCampaignDialog(true);
  };

  const activeCampaigns = campaigns.filter(c => c.is_active);
  const inactiveCampaigns = campaigns.filter(c => !c.is_active);

  const handleCampaignAction = async (action: string, campaignId: string) => {
    try {
      if (action === "Started") {
        await updateCampaign(campaignId, { is_active: true });
      } else if (action === "Paused") {
        await updateCampaign(campaignId, { is_active: false });
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
    }
  };

  const handleSetDefault = async (campaignId: string, isCurrentlyDefault: boolean) => {
    try {
      // Toggle the default state
      await setDefaultCampaign(campaignId, !isCurrentlyDefault);
    } catch (error) {
      console.error('Error setting default campaign:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await deleteCampaign(campaignId);
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
          <p>Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-foreground">Outreach Center</h2>
          <p className="text-gray-600 dark:text-foreground/90 text-base">Manage your email and phone outreach campaigns</p>
        </div>
        <Button onClick={handleNewCampaign} className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Active Campaigns ({activeCampaigns.length})</CardTitle>
            <CardDescription>Monitor and manage your outreach campaigns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No campaigns yet</p>
                <p className="text-gray-400 text-sm mt-2">Create your first campaign to get started</p>
                <Button onClick={handleNewCampaign} className="mt-4">
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCampaigns.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Active Campaigns</h4>
                    {activeCampaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleEditCampaign(campaign)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                            {campaign.is_default && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-100 text-green-800">
                              active
                            </Badge>
                            {campaign.email_template_id && (
                              <Mail className="h-4 w-4 text-blue-600" />
                            )}
                            {campaign.caller_prompt && (
                              <Phone className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Email Cap</p>
                            <p className="font-medium">{campaign.email_daily_cap || 'Not set'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Call Window</p>
                            <p className="font-medium">
                              {campaign.delivery_rules?.call?.window_start || campaign.call_window_start}:00 - {campaign.delivery_rules?.call?.window_end || campaign.call_window_end}:00
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Max Retries</p>
                            <p className="font-medium">{campaign.delivery_rules?.call?.max_attempts || campaign.max_call_retries}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="flex gap-2">
                            {(campaign.delivery_rules?.use_email !== false && campaign.email_template_id) && (
                              <Badge variant="outline" className="text-xs">
                                Emails enabled
                              </Badge>
                            )}
                            {(campaign.delivery_rules?.use_calls !== false && (campaign.caller_prompt || campaign.delivery_rules?.caller)) && (
                              <Badge variant="outline" className="text-xs">
                                Calls enabled
                              </Badge>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant={campaign.is_default ? "default" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(campaign.id, campaign.is_default);
                              }}
                              title={campaign.is_default ? "Unset as default" : "Set as default"}
                            >
                              {campaign.is_default ? (
                                <Star className="h-3 w-3 fill-current" />
                              ) : (
                                <StarOff className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCampaignAction("Paused", campaign.id);
                              }}
                            >
                              <Pause className="h-3 w-3" />
                            </Button>
                            <CampaignSettingsDialog
                              campaign={campaign}
                              onDelete={handleDeleteCampaign}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {inactiveCampaigns.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Inactive Campaigns</h4>
                    {inactiveCampaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer opacity-75"
                        onClick={() => handleEditCampaign(campaign)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-yellow-100 text-yellow-800">
                              inactive
                            </Badge>
                            {campaign.email_template_id && (
                              <Mail className="h-4 w-4 text-blue-600" />
                            )}
                            {campaign.caller_prompt && (
                              <Phone className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end mt-3 pt-3 border-t">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCampaignAction("Started", campaign.id);
                              }}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                            <CampaignSettingsDialog
                              campaign={campaign}
                              onDelete={handleDeleteCampaign}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CampaignDialog
        open={showCampaignDialog}
        onOpenChange={setShowCampaignDialog}
        campaign={editingCampaign}
        mode={dialogMode}
      />
    </div>
  );
};