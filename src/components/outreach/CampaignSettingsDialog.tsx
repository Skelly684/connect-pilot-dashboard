import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Settings, Edit, Trash2 } from 'lucide-react';
import { Campaign } from '@/hooks/useCampaigns';
import { useNavigate } from 'react-router-dom';

interface CampaignSettingsDialogProps {
  campaign: Campaign;
  onDelete: (campaignId: string) => void;
}

export const CampaignSettingsDialog = ({ campaign, onDelete }: CampaignSettingsDialogProps) => {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleEdit = () => {
    setOpen(false);
    navigate(`/dashboard?tab=outreach&campaign=${campaign.id}`);
  };

  const handleDelete = () => {
    setOpen(false);
    setShowDeleteAlert(true);
  };

  const confirmDelete = () => {
    onDelete(campaign.id);
    setShowDeleteAlert(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => e.stopPropagation()}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Campaign Settings</DialogTitle>
            <DialogDescription>
              Manage settings for "{campaign.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="justify-start gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Campaign
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="justify-start gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete Campaign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};