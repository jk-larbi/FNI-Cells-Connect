import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationItem, NotificationType, NotificationChannel } from '../types';
import { INITIAL_NOTIFICATIONS } from '../services/mockData';

export interface ReminderLogEntry {
  cellId: string;
  cellName: string;
  periodId: string;
  scenario: 'upcoming' | 'overdue' | 'escalation';
  channel: NotificationChannel;
  sentAt: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  reminderLogs: ReminderLogEntry[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dispatchNotification: (
    title: string,
    message: string,
    type: NotificationType,
    channel?: NotificationChannel
  ) => void;
  sendCellReminder: (
    cellId: string,
    cellName: string,
    periodId: string,
    scenario: 'upcoming' | 'overdue' | 'escalation',
    channel?: NotificationChannel
  ) => boolean;
  triggerBatchReminders: (targetPeriod: string) => number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_NOTIF_KEY = 'fni_notifications_store';
const STORAGE_REMINDER_KEY = 'fni_reminder_logs_store';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_NOTIF_KEY);
      return stored ? JSON.parse(stored) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [reminderLogs, setReminderLogs] = useState<ReminderLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_REMINDER_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications', e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REMINDER_KEY, JSON.stringify(reminderLogs));
    } catch (e) {
      console.warn('Failed to save reminder logs', e);
    }
  }, [reminderLogs]);

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
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

  const sendCellReminder = (
    cellId: string,
    cellName: string,
    periodId: string,
    scenario: 'upcoming' | 'overdue' | 'escalation',
    channel: NotificationChannel = 'in_app'
  ): boolean => {
    // Prevent duplicate reminders for the same cell, period and scenario
    const exists = reminderLogs.some(
      r => r.cellId === cellId && r.periodId === periodId && r.scenario === scenario
    );
    if (exists) {
      console.info(`Reminder already sent for ${cellName} (${scenario}) in period ${periodId}. Duplicate prevented.`);
      return false;
    }

    const title =
      scenario === 'upcoming'
        ? `Reminder: Weekly Report Due Today (Sunday 6:00 PM)`
        : scenario === 'overdue'
        ? `Overdue: Weekly Report Submission Required`
        : `Urgent Escalation: Unsubmitted Cell Return (${cellName})`;

    const message =
      scenario === 'upcoming'
        ? `Friendly reminder for ${cellName}: please submit your weekly meeting and evangelism return before Sunday 6:00 PM Africa/Accra.`
        : scenario === 'overdue'
        ? `The reporting window for ${cellName} closed at 6:00 PM. Please submit your return immediately. It will be recorded as late.`
        : `Your weekly return for ${cellName} is now more than 24 hours overdue. FNI Leadership intervention requested.`;

    dispatchNotification(title, message, scenario === 'upcoming' ? 'deadline_reminder' : 'overdue_notice', channel);

    const logEntry: ReminderLogEntry = {
      cellId,
      cellName,
      periodId,
      scenario,
      channel,
      sentAt: new Date().toISOString(),
    };
    setReminderLogs(prev => [logEntry, ...prev]);
    return true;
  };

  const triggerBatchReminders = (targetPeriod: string) => {
    const channels: NotificationChannel[] = ['email', 'whatsapp'];
    channels.forEach(ch => {
      dispatchNotification(
        `Automated Reporting Reminder (${ch.toUpperCase()})`,
        `Formal reporting notice dispatched for ${targetPeriod}. All cell leaders must submit before Sunday 6:00 PM deadline.`,
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
        reminderLogs,
        markAsRead,
        markAllAsRead,
        dispatchNotification,
        sendCellReminder,
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
