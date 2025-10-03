import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationsContext";

interface ChangeStatusDialogProps {
  leadId: string;
  leadName: string;
  currentStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (leadId: string, newStatus: string) => Promise<boolean>;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "pending_review", label: "Pending Review" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "qualified", label: "Qualified" },
  { value: "not_interested", label: "Not Interested" },
  { value: "sent_for_contact", label: "Sent for Contact" }
];

export const ChangeStatusDialog = ({ 
  leadId, 
  leadName, 
  currentStatus, 
  open, 
  onOpenChange, 
  onStatusChanged 
}: ChangeStatusDialogProps) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { addNotification } = useNotifications();

  const handleSubmit = async () => {
    if (selectedStatus === currentStatus) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await onStatusChanged(leadId, selectedStatus);
      
      if (success) {
        console.log('Status change successful, adding notification for:', leadName, 'from', currentStatus, 'to', selectedStatus);
        // Add notification
        addNotification(leadName, leadId, currentStatus, selectedStatus);
        console.log('Notification added');
        
        toast({
          title: "Status Updated",
          description: `${leadName}'s status has been changed to ${STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}`,
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>
            Change the status for {leadName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || selectedStatus === currentStatus}
          >
            {isSubmitting ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};