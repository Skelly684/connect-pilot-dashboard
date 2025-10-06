import { createContext, useContext, ReactNode } from 'react';
import { useNotifications as useNotificationsHook, Notification } from '@/hooks/useNotifications';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (leadName: string, leadId: string, oldStatus: string, newStatus: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const notifications = useNotificationsHook();
  
  return (
    <NotificationsContext.Provider value={notifications}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
