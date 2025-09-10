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
    // Notify when status changes FROM "accepted" TO "replied"
    if (!(oldStatus === 'accepted' && newStatus === 'replied')) {
      return;
    }

    let title = 'Lead Status Changed';
    let message = `${leadName || 'Lead'} status changed from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`;
    
    // Special handling for replied status
    if (newStatus === 'replied') {
      title = 'Lead Replied';
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

    setNotifications(prev => [notification, ...prev]);
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