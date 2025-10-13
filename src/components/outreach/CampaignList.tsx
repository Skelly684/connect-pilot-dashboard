import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Campaign } from '@/hooks/useCampaigns';
import { formatDistanceToNow } from 'date-fns';

interface CampaignListProps {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  onSelectCampaign: (campaign: Campaign) => void;
}

export const CampaignList = ({ campaigns, selectedCampaign, onSelectCampaign }: CampaignListProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filteredCampaigns.map((campaign) => (
          <Card
            key={campaign.id}
            className={`p-4 cursor-pointer transition-colors hover:bg-primary/10 ${
              selectedCampaign?.id === campaign.id ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onClick={() => onSelectCampaign(campaign)}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium truncate">{campaign.name}</h3>
                <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                  {campaign.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Updated {formatDistanceToNow(new Date(campaign.updated_at), { addSuffix: true })}</p>
                <p className="text-xs">From: {campaign.from_name}</p>
              </div>
            </div>
          </Card>
        ))}

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'No campaigns match your search.' : 'No campaigns yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};