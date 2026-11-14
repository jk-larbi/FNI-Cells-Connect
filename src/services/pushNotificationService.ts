import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

export interface PushPreferences {
  pushEnabled: boolean;
  soundEnabled: boolean;
  notifyOnReports: boolean;
  notifyOnMessages: boolean;
  notifyOnNotes: boolean;
}

const STORAGE_KEYS = { PREFERENCES_PREFIX: 'fni_push_pref_', TOKEN_PREFIX: 'fni_fcm_token_' };
const FUNCTION_NAME = 'fni-web-push';

const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

async function saveNativeToken(userId: string, token: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'register',
      token,
      kind: 'fcm',
      device: 'FNI Cells Connect Android App',
      platform: 'Android',
    },
  });
  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'The Android push token could not be registered with FNI.');
  }
  localStorage.setItem(`${STORAGE_KEYS.TOKEN_PREFIX}${userId}`, token);
  PushNotificationService.setPreferences(userId, { pushEnabled: true });
}

export class PushNotificationService {
  static isPushSupported(): boolean {
    if (typeof window === 'undefined') return false;
    if (isNativeAndroid()) return true;
    return 'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      window.isSecureContext;
  }

  static getPermissionState(): NotificationPermission | 'unsupported' {
    if (isNativeAndroid()) return 'default';
    if (!this.isPushSupported()) return 'unsupported';
    return Notification.permission;
  }

  static async getPermissionStateAsync(): Promise<NotificationPermission | 'unsupported'> {
    if (isNativeAndroid()) {
      try {
        const permission = await PushNotifications.checkPermissions();
        if (permission.receive === 'granted') return 'granted';
        if (permission.receive === 'denied') return 'denied';
        return 'default';
      } catch {
        return 'default';
      }
    }
    return this.getPermissionState();
  }

  static getSupportMessage(): string | null {
    if (typeof window === 'undefined') return 'Push alerts are unavailable in this environment. In-app notifications remain available.';
    if (isNativeAndroid()) return null;
    const userAgent = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isStandalone = (navigator as any).standalone === true ||
      window.matchMedia?.('(display-mode: standalone)').matches === true;

    if (isIOS && !isStandalone) {
      return 'On iPhone or iPad, open FNI from an icon added to your Home Screen to enable background push alerts. Safari tabs do not receive web push on iOS. In-app alerts still work.';
    }
    if (!window.isSecureContext) return 'Background push requires the secure HTTPS FNI website.';
    if (!('Notification' in window)) return 'This browser cannot show system notifications. In-app notifications remain available.';
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'This browser does not support web push on this device. In-app alerts remain available.';
    return null;
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

  static async syncExistingSubscription(userId?: string): Promise<boolean> {
    if (isNativeAndroid()) {
      if (!userId) return false;
      try {
        const permission = await PushNotifications.checkPermissions();
        if (permission.receive !== 'granted') return false;
        const existingToken = localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}${userId}`);
        if (existingToken) {
          await saveNativeToken(userId, existingToken);
          return true;
        }
        await this.registerNativeToken(userId);
        return Boolean(localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}${userId}`));
      } catch (error) {
        console.warn('Could not restore Android FCM registration:', error);
        return false;
      }
    }
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

  private static async registerNativeToken(userId: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      let settled = false;
      let registrationListener: { remove: () => Promise<void> } | undefined;
      let errorListener: { remove: () => Promise<void> } | undefined;
      const cleanup = async () => {
        await registrationListener?.remove();
        await errorListener?.remove();
      };
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        void cleanup();
        reject(new Error('Android did not return an FCM device token. Check the Firebase Android configuration and try again.'));
      }, 20000);
      try {
        await PushNotifications.createChannel({
          id: 'fni_updates',
          name: 'FNI Updates',
          description: 'Messages, reports and important FNI activity',
          importance: 5,
          sound: 'default',
          vibration: true,
        });
        registrationListener = await PushNotifications.addListener('registration', async ({ value }) => {
          if (settled) return;
          try {
            await saveNativeToken(userId, value);
            settled = true;
            window.clearTimeout(timer);
            await cleanup();
            resolve(value);
          } catch (error) {
            settled = true;
            window.clearTimeout(timer);
            await cleanup();
            reject(error);
          }
        });
        errorListener = await PushNotifications.addListener('registrationError', async (error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          await cleanup();
          reject(new Error((error as any)?.error || 'Android push registration failed. Verify Firebase setup.'));
        });
        await PushNotifications.register();
      } catch (error) {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          await cleanup();
          reject(error);
        }
      }
    });
  }

  static async hasActiveSubscription(userId?: string): Promise<boolean> {
    if (isNativeAndroid()) {
      return Boolean(userId && localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}${userId}`));
    }
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
    try {
      if (isNativeAndroid()) {
        let permission = await PushNotifications.checkPermissions();
        if (permission.receive !== 'granted') permission = await PushNotifications.requestPermissions();
        if (permission.receive !== 'granted') {
          return { success: false, error: 'Notification permission was not granted. Enable notifications for FNI Cells Connect in Android Settings.' };
        }
        const token = await this.registerNativeToken(userId);
        return { success: true, token };
      }
      if (!this.isPushSupported()) {
        return { success: false, error: this.getSupportMessage() || 'Background push is unavailable on this browser. In-app alerts remain available.' };
      }
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
        const padding = '='.repeat((4 - (keyData.publicKey.length % 4)) % 4);
        const raw = atob((keyData.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/'));
        const applicationServerKey = Uint8Array.from(raw, char => char.charCodeAt(0));
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource,
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
      return { success: false, error: error?.message || 'Unable to enable push notifications.' };
    }
  }

  static async unregisterDeviceToken(userId: string): Promise<void> {
    try {
      if (isNativeAndroid()) {
        const token = localStorage.getItem(`${STORAGE_KEYS.TOKEN_PREFIX}${userId}`);
        if (token) {
          await supabase.functions.invoke(FUNCTION_NAME, { body: { action: 'unregister', token, kind: 'fcm' } });
          localStorage.removeItem(`${STORAGE_KEYS.TOKEN_PREFIX}${userId}`);
        }
        this.setPreferences(userId, { pushEnabled: false });
        return;
      }
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
      console.warn('Could not unregister push device:', error);
    }
  }

  static async sendTestPush(): Promise<{ success: boolean; sent?: number; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
        body: { action: 'test_push' },
      });
      if (error || !data) return { success: false, error: data?.error || error?.message || 'Could not send a test push notification.' };
      if (Number(data.sent || 0) < 1) return { success: false, error: data.message || 'No active push registration was found for this device.' };
      return { success: true, sent: Number(data.sent) };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Test push failed.' };
    }
  }

  static async setupForegroundListener(
    onReceive: (payload: { title: string; body: string; data?: any }) => void
  ): Promise<(() => void) | null> {
    if (isNativeAndroid()) {
      const received = await PushNotifications.addListener('pushNotificationReceived', notification => {
        onReceive({ title: notification.title || 'FNI Cells Connect', body: notification.body || '', data: notification.data });
      });
      const action = await PushNotifications.addListener('pushNotificationActionPerformed', event => {
        window.dispatchEvent(new CustomEvent('fni-native-push-click', { detail: event.notification.data || {} }));
      });
      return () => { void received.remove(); void action.remove(); };
    }
    return null;
  }

  static showLocalNotification(
    title: string,
    options: { body: string; tag?: string; data?: any }
  ): boolean {
    if (isNativeAndroid()) return false;
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
