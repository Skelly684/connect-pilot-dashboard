import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  leadId: string;
  status: string;
}

export const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount (user-specific)
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const storageKey = `psn-notifications-${userId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        const withDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(withDates);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    } else {
      setNotifications([]);
    }
  }, [userId]);

  // Save notifications to localStorage whenever they change (user-specific)
  useEffect(() => {
    if (!userId) return;
    
    const storageKey = `psn-notifications-${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(notifications));
  }, [notifications, userId]);

  const addNotification = useCallback((leadName: string, leadId: string, oldStatus: string, newStatus: string) => {
    console.log('🔔 addNotification CALLED:', { leadName, leadId, oldStatus, newStatus });
    
    // Don't notify if status didn't actually change
    if (oldStatus === newStatus) {
      console.log('⚠️ Skipping notification - status unchanged');
      return;
    }

    let title = 'Lead Status Changed';
    let message = `${leadName || 'Lead'} status changed from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`;
    
    // Special handling for replied status
    if (newStatus === 'replied') {
      title = '✉️ Lead Replied!';
      message = `${leadName || 'Lead'} has replied to your outreach`;
    }

    const notification: Notification = {
      id: `${leadId}-${Date.now()}`,
      title,
      message,
      timestamp: new Date(),
      read: false,
      leadId,
      status: newStatus
    };

    console.log('✅ Creating notification:', notification);
    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      if (userId) {
        const storageKey = `psn-notifications-${userId}`;
        localStorage.setItem(storageKey, JSON.stringify(newNotifications));
      }
      window.dispatchEvent(new CustomEvent('notifications-updated', { detail: newNotifications }));
      return newNotifications;
    });
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  };
};