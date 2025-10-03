import { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  leadId: string;
  status: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('psn-notifications');
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
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('psn-notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (leadName: string, leadId: string, oldStatus: string, newStatus: string) => {
    console.log('🔔 addNotification CALLED:', { leadName, leadId, oldStatus, newStatus });
    console.log('🔔 Current notifications before add:', notifications.length);
    
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
    console.log('🔔 About to call setNotifications...');
    setNotifications(prev => {
      console.log('🔔 Inside setNotifications callback, prev:', prev.length);
      const newNotifications = [notification, ...prev];
      console.log('📋 New notifications array length:', newNotifications.length);
      console.log('📋 First notification:', newNotifications[0]);
      // Force a localStorage update immediately
      localStorage.setItem('psn-notifications', JSON.stringify(newNotifications));
      console.log('💾 Saved to localStorage');
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('notifications-updated', { detail: newNotifications }));
      console.log('📣 Dispatched notifications-updated event');
      return newNotifications;
    });
    console.log('🔔 setNotifications called');
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

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