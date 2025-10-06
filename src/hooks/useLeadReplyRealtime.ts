import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/contexts/NotificationsContext';
import { toast } from 'sonner';

interface ReplyEvent {
  leadId: string;
  leadName: string;
  company: string;
  timestamp: number;
}

const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Hook to listen for lead reply events via Supabase Realtime
 * Handles deduplication, notifications, and purple pulse highlighting
 */
export const useLeadReplyRealtime = (userId: string | undefined, onReplyDetected: (leadId: string) => void) => {
  const { addNotification } = useNotifications();
  const recentRepliesRef = useRef<Map<string, number>>(new Map());
  const notificationPermissionRef = useRef<NotificationPermission>('default');

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          notificationPermissionRef.current = permission;
        });
      } else {
        notificationPermissionRef.current = Notification.permission;
      }
    }
  }, []);

  // Clean up old dedupe entries periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(recentRepliesRef.current.entries());
      entries.forEach(([leadId, timestamp]) => {
        if (now - timestamp > DEDUPE_WINDOW_MS) {
          recentRepliesRef.current.delete(leadId);
        }
      });
    }, 5 * 60 * 1000); // Clean every 5 minutes

    return () => clearInterval(cleanup);
  }, []);

  const handleReplyEvent = useCallback((event: ReplyEvent) => {
    const { leadId, leadName, company, timestamp } = event;
    
    // Check dedupe window
    const lastReplyTime = recentRepliesRef.current.get(leadId);
    if (lastReplyTime && (timestamp - lastReplyTime < DEDUPE_WINDOW_MS)) {
      console.log(`⏭️ Skipping duplicate reply notification for lead ${leadId} (within ${DEDUPE_WINDOW_MS}ms window)`);
      return;
    }

    // Record this event
    recentRepliesRef.current.set(leadId, timestamp);
    console.log('💜 Reply event detected:', { leadId, leadName, company });

    // Trigger purple pulse in UI
    onReplyDetected(leadId);

    // Add in-app notification
    addNotification(leadName, leadId, 'contacted', 'replied');

    // Show toast
    toast.success(`💜 ${leadName} at ${company || 'Unknown Company'} just replied!`, {
      duration: 10000,
      action: {
        label: 'Open Lead',
        onClick: () => {
          window.location.href = `/lead/${leadId}`;
        },
      },
    });

    // Browser notification (if permitted)
    if ('Notification' in window && notificationPermissionRef.current === 'granted') {
      try {
        new Notification(`💜 ${leadName} replied!`, {
          body: `${leadName} at ${company || 'Unknown Company'} just replied to your outreach`,
          icon: '/assets/psn-logo.png',
          tag: `lead-reply-${leadId}`, // Prevents duplicate notifications
          requireInteraction: false,
        });
      } catch (error) {
        console.warn('Failed to show browser notification:', error);
      }
    }
  }, [addNotification, onReplyDetected]);

  useEffect(() => {
    if (!userId) {
      console.log('⏭️ No userId, skipping realtime subscription');
      return;
    }

    console.log('🎯 useLeadReplyRealtime: Setting up realtime subscription for user', userId);

    const channel = supabase
      .channel('lead_replies')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldLead = payload.old as any;
          const newLead = payload.new as any;

          console.log('🔔 Realtime UPDATE:', { 
            leadId: newLead.id,
            oldStatus: oldLead.status,
            newStatus: newLead.status,
            oldEmailStatus: oldLead.last_email_status,
            newEmailStatus: newLead.last_email_status
          });

          // Check if this is a reply transition
          const isReplyTransition = 
            (newLead.last_email_status?.toLowerCase() === 'reply' && 
             oldLead.last_email_status?.toLowerCase() !== 'reply') ||
            (newLead.status?.toLowerCase() === 'replied' && 
             oldLead.status?.toLowerCase() !== 'replied');

          if (isReplyTransition) {
            console.log('✅ Reply transition detected for lead', newLead.id);
            const leadName = newLead.name || 
              `${newLead.first_name || ''} ${newLead.last_name || ''}`.trim() || 
              'Unknown Lead';
            const company = newLead.company_name || newLead.company || 'Unknown Company';

            handleReplyEvent({
              leadId: newLead.id,
              leadName,
              company,
              timestamp: Date.now(),
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to lead reply updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error - will attempt to reconnect');
        }
      });

    return () => {
      console.log('🧹 Cleaning up lead reply realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, handleReplyEvent]);
};
