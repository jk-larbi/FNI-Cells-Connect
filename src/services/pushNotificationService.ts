import { supabase } from '../lib/supabase';

export interface PushPreferences {
  pushEnabled: boolean;
  soundEnabled: boolean;
  notifyOnReports: boolean;
  notifyOnMessages: boolean;
  notifyOnNotes: boolean;
}

const STORAGE_KEYS = { PREFERENCES_PREFIX: 'fni_push_pref_' };
const FUNCTION_NAME = 'fni-web-push';

function base64UrlToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export class PushNotificationService {
  static isPushSupported(): boolean {
    return typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      window.isSecureContext;
  }

  static getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isPushSupported()) return 'unsupported';
    return Notification.permission;
  }

  static getPreferences(userId: string): PushPreferences {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.PREFERENCES_PREFIX}${userId}`);
      if (stored) return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to load push preferences', error);
    }
    return { pushEnabled: true, soundEnabled: true, notifyOnReports: true, notifyOnMessages: true, notifyOnNotes: true };
  }

  static setPreferences(userId: string, prefs: Partial<PushPreferences>): PushPreferences {
    const updated = { ...this.getPreferences(userId), ...prefs };
    try {
      localStorage.setItem(`${STORAGE_KEYS.PREFERENCES_PREFIX}${userId}`, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save push preferences', error);
    }
    return updated;
  }

  static async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) throw new Error('This browser does not support service workers.');
    const base = import.meta.env.BASE_URL || '/';
    return navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' });
  }

  static async syncExistingSubscription(): Promise<boolean> {
    if (!this.isPushSupported() || Notification.permission !== 'granted') return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return false;
      const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
        body: {
          action: 'register',
          subscription: subscription.toJSON(),
          device: navigator.userAgent,
          platform: (navigator as any).userAgentData?.platform || navigator.platform || 'Web',
        },
      });
      if (error || !data?.success) {
        console.warn('Could not refresh the saved FNI push subscription:', data?.error || error?.message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Could not restore browser push subscription:', error);
      return false;
    }
  }

  static async hasActiveSubscription(): Promise<boolean> {
    if (!this.isPushSupported()) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      return Boolean(await registration.pushManager.getSubscription());
    } catch {
      return false;
    }
  }

  static async requestPermissionAndRegister(
    userId: string,
    _role: string = 'tutor'
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!this.isPushSupported()) {
      return { success: false, error: 'Browser push requires a supported browser and a secure HTTPS connection.' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: `Notification permission was not granted (${permission}). Allow notifications in your browser settings.` };
      }

      const registration = await this.registerServiceWorker();
      await navigator.serviceWorker.ready;
      const { data: keyData, error: keyError } = await supabase.functions.invoke(FUNCTION_NAME, {
        body: { action: 'get_public_key' },
      });
      if (keyError || !keyData?.publicKey) {
        throw new Error(keyData?.error || keyError?.message || 'Push server is not configured yet. Please try again later.');
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(keyData.publicKey) as BufferSource,
        });
      }

      const { data: registerData, error: registerError } = await supabase.functions.invoke(FUNCTION_NAME, {
        body: {
          action: 'register',
          subscription: subscription.toJSON(),
          device: navigator.userAgent,
          platform: (navigator as any).userAgentData?.platform || navigator.platform || 'Web',
        },
      });
      if (registerError || !registerData?.success) {
        throw new Error(registerData?.error || registerError?.message || 'Could not register this device with FNI.');
      }

      this.setPreferences(userId, { pushEnabled: true });
      return { success: true, token: 'web-push-subscription' };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to enable browser push notifications.' };
    }
  }

  static async unregisterDeviceToken(userId: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const { error } = await supabase.functions.invoke(FUNCTION_NAME, {
          body: { action: 'unregister', endpoint: subscription.endpoint },
        });
        if (error) console.warn('Could not remove the server-side push subscription:', error.message);
        await subscription.unsubscribe();
      }
      this.setPreferences(userId, { pushEnabled: false });
    } catch (error) {
      console.warn('Could not unregister browser push subscription:', error);
    }
  }

  static async setupForegroundListener(
    _onReceive: (payload: { title: string; body: string; data?: any }) => void
  ): Promise<(() => void) | null> {
    return null;
  }

  static showLocalNotification(
    title: string,
    options: { body: string; tag?: string; data?: any }
  ): boolean {
    if (!this.isPushSupported() || Notification.permission !== 'granted') return false;
    try {
      navigator.serviceWorker.ready.then(registration => registration.showNotification(title, {
        body: options.body,
        icon: `${import.meta.env.BASE_URL}fni-official-logo.jpg`,
        badge: `${import.meta.env.BASE_URL}logo.svg`,
        tag: options.tag || `fni-${Date.now()}`,
        data: options.data || {},
      })).catch(error => console.warn('Could not display browser notification:', error));
      return true;
    } catch (error) {
      console.warn('Error displaying browser notification:', error);
      return false;
    }
  }
}
