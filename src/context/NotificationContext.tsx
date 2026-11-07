import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationItem, NotificationType, NotificationChannel } from '../types';
import { INITIAL_NOTIFICATIONS } from '../services/mockData';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dispatchNotification: (
    title: string,
    message: string,
    type: NotificationType,
    channel?: NotificationChannel
  ) => void;
  triggerBatchReminders: (targetPeriod: string) => number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_NOTIF_KEY = 'fni_notifications_store';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_NOTIF_KEY);
      return stored ? JSON.parse(stored) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications', e);
    }
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const dispatchNotification = (
    title: string,
    message: string,
    type: NotificationType,
    channel: NotificationChannel = 'in_app'
  ) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: 'broadcast',
      title,
      message,
      type,
      channel,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const triggerBatchReminders = (targetPeriod: string) => {
    const channels: NotificationChannel[] = ['email', 'whatsapp'];
    channels.forEach(ch => {
      dispatchNotification(
        `Automated Reporting Reminder (${ch.toUpperCase()})`,
        `Formal reporting notice dispatched for ${targetPeriod}. All cell leaders must submit before Sunday midnight deadline.`,
        'deadline_reminder',
        ch
      );
    });
    return 8; // 8 leaders reached
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        dispatchNotification,
        triggerBatchReminders,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
