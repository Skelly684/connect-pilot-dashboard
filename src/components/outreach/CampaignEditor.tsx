import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessagingTab } from './MessagingTab';
import { DeliveryRulesTab } from './DeliveryRulesTab';
import { Campaign, useCampaigns } from '@/hooks/useCampaigns';

interface CampaignEditorProps {
  campaign: Campaign;
}

export const CampaignEditor = ({ campaign }: CampaignEditorProps) => {
  const [activeTab, setActiveTab] = useState('messaging');
  const { updateCampaign, updateEmailTemplate, createEmailTemplate, emailTemplates } = useCampaigns();

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="delivery">Delivery & Rules</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="messaging" className="h-full mt-4">
            <MessagingTab
              campaign={campaign}
              onUpdateCampaign={updateCampaign}
              onUpdateEmailTemplate={updateEmailTemplate}
              onCreateEmailTemplate={createEmailTemplate}
              emailTemplates={emailTemplates}
            />
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