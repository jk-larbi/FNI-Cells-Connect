import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '../lib/supabase';

export type LocationActivity = 'evangelism' | 'cell_meeting';
export interface LocationSession {
  id: string;
  tutor_user_id: string;
  tutor_name: string;
  cell_id: string | null;
  cell_name: string | null;
  activity_type: LocationActivity;
  started_at: string;
  ended_at: string | null;
}
export interface LocationPoint {
  id: number;
  session_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  captured_at: string;
}
export interface ActiveTutorLocation {
  session: LocationSession;
  point: LocationPoint | null;
  points: LocationPoint[];
}
interface NativeLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  time?: number | null;
}
interface BackgroundGeoPlugin {
  addWatcher(options: {
    backgroundMessage?: string;
    backgroundTitle?: string;
    requestPermissions?: boolean;
    stale?: boolean;
    distanceFilter?: number;
  }, callback: (location?: NativeLocation, error?: { message?: string; code?: string }) => void): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}
const BackgroundGeo = registerPlugin<BackgroundGeoPlugin>('BackgroundGeolocation');

let nativeWatcherId: string | null = null;
let browserWatchId: number | null = null;
let activeSessionId: string | null = null;
let lastPoint: { latitude: number; longitude: number; at: number } | null = null;
let acceptingUpdates = false;
let savingPoint = false;

async function savePoint(sessionId: string, location: NativeLocation) {
  if (!acceptingUpdates || activeSessionId !== sessionId || savingPoint) return;
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;
  if (Number.isFinite(location.accuracy) && location.accuracy > 100) return;
  const now = Number.isFinite(location.time) ? Number(location.time) : Date.now();
  const previous = lastPoint;
  if (previous && now - previous.at < 5000) return;
  if (previous) {
    const rad = (v: number) => (v * Math.PI) / 180;
    const dLat = rad(location.latitude - previous.latitude);
    const dLng = rad(location.longitude - previous.longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(previous.latitude)) * Math.cos(rad(location.latitude)) * Math.sin(dLng / 2) ** 2;
    const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distance < 5 && now - previous.at < 20000) return;
  }
  savingPoint = true;
  try {
    const { error } = await supabase.rpc('record_location_share_point', {
      p_session_id: sessionId,
      p_latitude: location.latitude,
      p_longitude: location.longitude,
      p_accuracy_m: Number.isFinite(location.accuracy) ? location.accuracy : null,
    });
    if (error) {
      if (acceptingUpdates) console.warn('FNI location point was not saved; the next GPS update will retry:', error.message);
      return;
    }
    if (acceptingUpdates && activeSessionId === sessionId) {
      lastPoint = { latitude: location.latitude, longitude: location.longitude, at: now };
    }
  } finally {
    savingPoint = false;
  }
}

async function attachWatcher(sessionId: string) {
  activeSessionId = sessionId;
  acceptingUpdates = true;
  lastPoint = null;
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'android') {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        throw new Error('Allow notifications so Android can show the required location-sharing indicator.');
      }
    }
    nativeWatcherId = await BackgroundGeo.addWatcher({
      backgroundTitle: 'FNI location sharing is active',
      backgroundMessage: 'Your location is shared with FNI administrators for this active session. Open FNI Cells Connect to stop sharing.',
      requestPermissions: true,
      stale: false,
      distanceFilter: 5,
    }, (location, error) => {
      if (error) {
        console.warn('FNI background location:', error.message || error.code);
        return;
      }
      if (location) void savePoint(sessionId, location);
    });
    return;
  }
  if (!navigator.geolocation) throw new Error('This device does not support location services.');
  browserWatchId = navigator.geolocation.watchPosition(
    position => void savePoint(sessionId, {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      time: position.timestamp,
    }),
    error => console.warn('FNI location permission/update:', error.message),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
}

async function detachWatcher() {
  acceptingUpdates = false;
  if (nativeWatcherId) {
    const id = nativeWatcherId;
    nativeWatcherId = null;
    try { await BackgroundGeo.removeWatcher({ id }); } catch (error) { console.warn('Could not remove native location watcher:', error); }
  }
  if (browserWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(browserWatchId);
    browserWatchId = null;
  }
  activeSessionId = null;
  lastPoint = null;
  savingPoint = false;
}

export const LocationSharingService = {
  async start(activityType: LocationActivity, cellId?: string | null) {
    const { data, error } = await supabase.rpc('start_location_share', {
      p_activity_type: activityType,
      p_cell_id: cellId || null,
    });
    if (error) throw error;
    const sessionId = data as string;
    try {
      await attachWatcher(sessionId);
      // The database RPC has already persisted the in-app alert. Deliver the
      // matching background push to every registered administrator device.
      const { data: sessionDetails } = await supabase.from('location_share_sessions')
        .select('tutor_name,cell_name,started_at,activity_type')
        .eq('id', sessionId).maybeSingle();
      const startedAt = sessionDetails?.started_at ? new Date(sessionDetails.started_at).toLocaleString() : new Date().toLocaleString();
      const notification = {
        id: `location-share-${sessionId}`,
        user_id: 'admin',
        title: 'Tutor started live location sharing',
        message: `${sessionDetails?.tutor_name || 'A tutor'} · ${sessionDetails?.cell_name || 'No cell assigned'} started ${sessionDetails?.activity_type === 'cell_meeting' ? 'a cell meeting' : 'evangelism'} at ${startedAt}. Open FNI Cells Connect to view their live location.`,
        type: 'system_alert',
        metadata: {
          recipientRole: 'admin',
          targetTab: 'dashboard',
          category: 'location',
          sessionId,
          tutorName: sessionDetails?.tutor_name || 'Tutor',
          cellName: sessionDetails?.cell_name || null,
          startedAt: sessionDetails?.started_at || new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      };
      try {
        const { data: pushData, error: pushError } = await supabase.functions.invoke('fni-web-push', {
          body: { action: 'send_notification', notification },
        });
        if (pushError || pushData?.error) {
          console.warn('FNI location push could not be delivered; the in-app alert remains saved:', pushData?.error || pushError?.message);
        }
      } catch (pushFailure) {
        // A push gateway outage must never turn off a tutor's active GPS session.
        console.warn('FNI location push request failed; the in-app alert remains saved:', pushFailure);
      }
      return sessionId;
    } catch (error) {
      await supabase.rpc('stop_location_share', { p_session_id: sessionId });
      throw error;
    }
  },

  async resume(sessionId: string) {
    if (activeSessionId === sessionId) return;
    await attachWatcher(sessionId);
  },

  async stop(sessionId: string) {
    // Stop the device watcher first. The database also rejects all late points
    // after ended_at is set, so a delayed callback cannot extend the session.
    await detachWatcher();
    const { error } = await supabase.rpc('stop_location_share', { p_session_id: sessionId });
    if (error) throw error;
  },

  async getMyActiveSession(): Promise<LocationSession | null> {
    const { data, error } = await supabase
      .from('location_share_sessions')
      .select('*')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as LocationSession | null;
  },

  async getAdminSessions(): Promise<LocationSession[]> {
    const { data, error } = await supabase
      .from('location_share_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []) as LocationSession[];
  },

  async getAdminActiveLocations(): Promise<ActiveTutorLocation[]> {
    const { data: sessions, error } = await supabase
      .from('location_share_sessions')
      .select('*')
      .is('ended_at', null)
      .order('started_at', { ascending: false });
    if (error) throw error;
    const active = (sessions || []) as LocationSession[];
    return Promise.all(active.map(async session => {
      const { data: route, error: pointError } = await supabase
        .from('location_share_points')
        .select('*')
        .eq('session_id', session.id)
        .order('captured_at', { ascending: true });
      if (pointError) throw pointError;
      const points = (route || []) as LocationPoint[];
      return { session, point: points[points.length - 1] || null, points };
    }));
  },

  subscribeToAdminLocationChanges(onChange: () => void): () => void {
    const channel = supabase
      .channel('fni-admin-live-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'location_share_sessions' }, onChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'location_share_points' }, onChange)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },

  async getSessionPoints(sessionId: string): Promise<LocationPoint[]> {
    const { data, error } = await supabase
      .from('location_share_points')
      .select('*')
      .eq('session_id', sessionId)
      .order('captured_at', { ascending: true });
    if (error) throw error;
    return (data || []) as LocationPoint[];
  },

  async openLocationSettings() {
    if (Capacitor.isNativePlatform()) await BackgroundGeo.openSettings();
  },
};
