import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicInfoTab } from './BasicInfoTab';
import { MessagingTab } from './MessagingTab';
import { DeliveryRulesTab } from './DeliveryRulesTab';
import { CallerConfigSection, CallerConfig } from './CallerConfigSection';
import { Campaign, useCampaigns } from '@/hooks/useCampaigns';

interface CampaignEditorProps {
  campaign: Campaign;
}

export const CampaignEditor = ({ campaign }: CampaignEditorProps) => {
  const [activeTab, setActiveTab] = useState('basic');
  const { updateCampaign, updateEmailTemplate, createEmailTemplate, emailTemplates } = useCampaigns();

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="caller">AI Caller</TabsTrigger>
          <TabsTrigger value="delivery">Delivery & Rules</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="basic" className="h-full mt-4">
            <BasicInfoTab
              campaign={campaign}
              onUpdateCampaign={updateCampaign}
            />
          </TabsContent>

          <TabsContent value="messaging" className="h-full mt-4">
            <MessagingTab
              campaign={campaign}
              onUpdateCampaign={updateCampaign}
              onUpdateEmailTemplate={updateEmailTemplate}
              onCreateEmailTemplate={createEmailTemplate}
              emailTemplates={emailTemplates}
            />
          </TabsContent>

          <TabsContent value="caller" className="h-full mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">AI Caller Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how your AI caller behaves, what it says, and how it handles objections
                </p>
              </div>
              <CallerConfigSection
                config={campaign.delivery_rules?.caller || {
                  opening_script: 'Hi, this is Scott from PSN…',
                  goal: 'qualify',
                  tone: 'professional',
                  disclose_ai: false,
                  max_duration_sec: 180,
                  qualify_questions: [],
                  objections: [],
                  not_interested_policy: 'send_followup_email'
                }}
                onChange={(callerConfig: CallerConfig) => {
                  updateCampaign(campaign.id, {
                    delivery_rules: {
                      ...campaign.delivery_rules,
                      caller: callerConfig
                    }
                  });
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="h-full mt-4">
            <DeliveryRulesTab
              campaign={campaign}
              onUpdateCampaign={updateCampaign}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};