import { SupabaseService } from './supabaseService';

export interface PushPreferences {
  pushEnabled: boolean;
  soundEnabled: boolean;
  notifyOnReports: boolean;
  notifyOnMessages: boolean;
  notifyOnNotes: boolean;
}

export interface DeviceTokenRecord {
  id: string;
  userId: string;
  token: string;
  role: 'admin' | 'tutor';
  device: string;
  platform: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  PREFERENCES_PREFIX: 'fni_push_pref_',
  DEVICE_TOKEN_PREFIX: 'fni_device_token_',
  REGISTERED_TOKENS: 'fni_registered_device_tokens_v1',
};

export class PushNotificationService {
  /**
   * Check whether the current browser/environment supports Push notifications and Service Workers
   */
  static isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Get current Notification permission
   */
  static getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isPushSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Retrieve notification preferences for a user
   */
  static getPreferences(userId: string): PushPreferences {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.PREFERENCES_PREFIX}${userId}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load push preferences', e);
    }
    return {
      pushEnabled: true,
      soundEnabled: true,
      notifyOnReports: true,
      notifyOnMessages: true,
      notifyOnNotes: true,
    };
  }

  /**
   * Save user notification preferences
   */
  static setPreferences(userId: string, prefs: Partial<PushPreferences>): PushPreferences {
    const current = this.getPreferences(userId);
    const updated = { ...current, ...prefs };
    try {
      localStorage.setItem(`${STORAGE_KEYS.PREFERENCES_PREFIX}${userId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save push preferences', e);
    }
    return updated;
  }

  /**
   * Request notification permission and register device token
   */
  static async requestPermissionAndRegister(
    userId: string,
    role: 'admin' | 'tutor' = 'tutor'
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!this.isPushSupported()) {
      return {
        success: false,
        error: 'Push notifications are not supported by this browser or device (e.g. insecure context or unsupported browser).',
      };
    }

    try {
      // 1. Request browser permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          error: `Permission was not granted (${permission}). Please allow notifications in your browser settings.`,
        };
      }

      // 2. Generate web client push token identifier
      const token = `token_${userId}_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;

      // 3. Save device token record
      await this.saveDeviceToken({
        userId,
        token,
        role,
      });

      // Save preference as enabled
      this.setPreferences(userId, { pushEnabled: true });

      return {
        success: true,
        token,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'An error occurred while requesting notification permission.',
      };
    }
  }

  /**
   * Save device token to Supabase and local persistent registry
   */
  static async saveDeviceToken(data: {
    userId: string;
    token: string;
    role: 'admin' | 'tutor';
  }): Promise<void> {
    const tokenId = `dt_${data.userId}_${data.token.slice(-12)}`;
    const nowIso = new Date().toISOString();

    const record: DeviceTokenRecord = {
      id: tokenId,
      userId: data.userId,
      token: data.token,
      role: data.role,
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device',
      platform: typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform || 'Web' : 'Web',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Store in local storage registry
    try {
      localStorage.setItem(`${STORAGE_KEYS.DEVICE_TOKEN_PREFIX}${data.userId}`, JSON.stringify(record));
      const allTokens: DeviceTokenRecord[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.REGISTERED_TOKENS) || '[]'
      );
      const filtered = allTokens.filter(t => t.id !== tokenId);
      filtered.push(record);
      localStorage.setItem(STORAGE_KEYS.REGISTERED_TOKENS, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Local device token storage error:', e);
    }

    // Store in Supabase
    try {
      await SupabaseService.upsertDeviceToken({
        id: tokenId,
        userId: data.userId,
        token: data.token,
        device: record.device,
        platform: record.platform,
      });
    } catch (e) {
      console.warn('Supabase deviceTokens notice:', e);
    }
  }

  /**
   * Unregister device token (e.g. when logging out or disabling push)
   */
  static async unregisterDeviceToken(userId: string): Promise<void> {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.DEVICE_TOKEN_PREFIX}${userId}`);
      if (stored) {
        const record: DeviceTokenRecord = JSON.parse(stored);
        localStorage.removeItem(`${STORAGE_KEYS.DEVICE_TOKEN_PREFIX}${userId}`);

        const allTokens: DeviceTokenRecord[] = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.REGISTERED_TOKENS) || '[]'
        );
        const filtered = allTokens.filter(t => t.id !== record.id);
        localStorage.setItem(STORAGE_KEYS.REGISTERED_TOKENS, JSON.stringify(filtered));

        // Delete from Supabase
        try {
          await SupabaseService.deleteDeviceToken(record.id);
        } catch (e) {
          console.warn('Supabase deviceTokens delete notice:', e);
        }
      }
    } catch (e) {
      console.warn('Error during token unregistration:', e);
    }
  }

  /**
   * Listen to foreground notifications
   */
  static async setupForegroundListener(
    _onReceive: (payload: { title: string; body: string; data?: any }) => void
  ): Promise<(() => void) | null> {
    return null;
  }

  /**
   * Show a native browser notification (handles foreground or local dispatch when permission is granted)
   */
  static showLocalNotification(
    title: string,
    options: {
      body: string;
      tag?: string;
      data?: any;
    }
  ): boolean {
    if (!this.isPushSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      // Check if service worker registration can show it
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body: options.body,
            icon: '/fni-official-logo.jpg',
            badge: '/logo.svg',
            tag: options.tag || ('fni-' + Date.now()),
            renotify: true,
            data: options.data || {},
          } as any);
        }).catch(() => {
          new Notification(title, {
            body: options.body,
            icon: '/fni-official-logo.jpg',
            tag: options.tag,
            data: options.data,
          });
        });
      } else {
        new Notification(title, {
          body: options.body,
          icon: '/fni-official-logo.jpg',
          tag: options.tag,
          data: options.data,
        });
      }
      return true;
    } catch (e) {
      console.warn('Error displaying native browser notification:', e);
      return false;
    }
  }
}
