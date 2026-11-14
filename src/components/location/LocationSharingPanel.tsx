import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Clock, MapPin, Navigation, Play, ShieldCheck, Square, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { LocationSharingService, LocationSession, LocationPoint, LocationActivity, ActiveTutorLocation } from '../../services/locationSharingService';

interface Props {
  mode: 'tutor' | 'admin';
  cellId?: string | null;
}
const activityLabel = (type: LocationActivity) => type === 'evangelism' ? 'Evangelism outreach' : 'Cell meeting';
const openNativeMaps = (url: string) => {
  if (Capacitor.isNativePlatform()) window.location.href = url;
  else window.open(url, '_blank', 'noopener,noreferrer');
};
const dateLabel = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

declare global {
  interface Window { L?: any; }
}

let leafletLoader: Promise<void> | null = null;
function ensureLeaflet(): Promise<void> {
  if (window.L) return Promise.resolve();
  if (!leafletLoader) {
    leafletLoader = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-fni-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.dataset.fniLeaflet = 'true';
        document.head.appendChild(link);
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-fni-leaflet]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Map library could not be loaded.')), { once: true });
        if (window.L) resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.dataset.fniLeaflet = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Map library could not be loaded.'));
      document.body.appendChild(script);
    });
  }
  return leafletLoader;
}

const ROUTE_COLORS = ['#1769d2', '#d9485f', '#0f9d78', '#8b5cf6', '#d97706', '#0891b2', '#be185d', '#4d7c0f'];
const distanceBetween = (a: LocationPoint, b: LocationPoint) => {
  const rad = (v: number) => v * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
const formatDistance = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;

const LiveTutorMap: React.FC<{
  locations: ActiveTutorLocation[];
  selectedSessionId?: string;
  onSelectSession?: (session: LocationSession) => void;
}> = ({ locations, selectedSessionId, onSelectSession }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const routesRef = useRef<Map<string, any>>(new Map());
  const hasFittedRef = useRef(false);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const renderMap = async () => {
      try {
        await ensureLeaflet();
        if (cancelled || !containerRef.current || !window.L) return;
        const L = window.L;
        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([5.56, -0.20], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapRef.current);
        }

        const valid = locations.filter(item => item.point &&
          Number.isFinite(item.point.latitude) && Number.isFinite(item.point.longitude));
        const ids = new Set(valid.map(item => item.session.id));
        markersRef.current.forEach((marker, id) => {
          if (!ids.has(id)) { mapRef.current.removeLayer(marker); markersRef.current.delete(id); }
        });
        routesRef.current.forEach((route, id) => {
          if (!ids.has(id)) { mapRef.current.removeLayer(route); routesRef.current.delete(id); }
        });
        valid.forEach((item, index) => {
          const point = item.point!;
          const coordinates: [number, number] = [point.latitude, point.longitude];
          const label = item.session.tutor_name + (item.session.cell_name ? ' · ' + item.session.cell_name : '');
          const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
          const existing = markersRef.current.get(item.session.id);
          if (existing) {
            existing.setLatLng(coordinates);
            existing.setTooltipContent(label);
            existing.setStyle({ fillColor: color, radius: item.session.id === selectedSessionId ? 11 : 9 });
          } else {
            const marker = L.circleMarker(coordinates, {
              radius: item.session.id === selectedSessionId ? 11 : 9,
              color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1,
            }).addTo(mapRef.current).bindTooltip(label, { direction: 'top', offset: [0, -8] });
            if (onSelectSession) marker.on('click', () => onSelectSession(item.session));
            markersRef.current.set(item.session.id, marker);
          }
          const routePoints = (item.points || []).filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
          if (routePoints.length > 1) {
            const latLngs = routePoints.map(p => [p.latitude, p.longitude]);
            const route = routesRef.current.get(item.session.id);
            if (route) route.setLatLngs(latLngs);
            else routesRef.current.set(item.session.id, L.polyline(latLngs, {
              color, weight: item.session.id === selectedSessionId ? 6 : 4, opacity: item.session.id === selectedSessionId ? 0.95 : 0.72,
            }).addTo(mapRef.current));
          } else if (routesRef.current.has(item.session.id)) {
            mapRef.current.removeLayer(routesRef.current.get(item.session.id));
            routesRef.current.delete(item.session.id);
          }
        });
        if (valid.length) {
          const bounds = L.latLngBounds(valid.map(item => [item.point!.latitude, item.point!.longitude]));
          const currentBounds = mapRef.current.getBounds();
          if (!hasFittedRef.current || !currentBounds.contains(bounds)) {
            mapRef.current.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
            hasFittedRef.current = true;
          }
        }
        mapRef.current.invalidateSize();
        setMapError('');
      } catch (error: any) {
        if (!cancelled) setMapError(error?.message || 'Live map could not be loaded.');
      }
    };
    void renderMap();
    return () => { cancelled = true; };
  }, [locations]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markersRef.current.clear();
      routesRef.current.clear();
    }
  }, []);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-[320px] sm:h-[380px] rounded-xl overflow-hidden bg-slate-100" aria-label="Map of all active tutor locations" />
      {mapError && <div className="absolute inset-x-3 bottom-3 rounded-lg bg-white/95 border border-rose-200 p-2 text-xs text-rose-700">{mapError}</div>}
    </div>
  );
};

export const LocationSharingPanel: React.FC<Props> = ({ mode, cellId }) => {
  const { currentUser } = useAuth();
  const { requestPushPermission } = useNotifications();
  const [activity, setActivity] = useState<LocationActivity>('evangelism');
  const [activeSession, setActiveSession] = useState<LocationSession | null>(null);
  const [sessions, setSessions] = useState<LocationSession[]>([]);
  const [activeLocations, setActiveLocations] = useState<ActiveTutorLocation[]>([]);
  const [selectedSession, setSelectedSession] = useState<LocationSession | null>(null);
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const knownActiveSessionIds = useRef<Set<string> | null>(null);
  const notifiedSessionIds = useRef<Set<string>>(new Set());

  const notifyAdmin = (message: string, sessionId: string) => {
    if (notifiedSessionIds.current.has(sessionId)) return;
    notifiedSessionIds.current.add(sessionId);
    setNotice(message);
    // The server-backed push function handles device alerts; this banner is the in-app fallback.
  };

  const enableAdminPush = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await requestPushPermission();
      if (result.success) setNotice('Push alerts are enabled on this administrator device.');
      else setError(result.error || 'Push alerts could not be enabled on this device.');
    } catch (err: any) {
      setError(err?.message || 'Could not enable administrator push alerts.');
    } finally {
      setBusy(false);
    }
  };

  const loadAdminSessions = async () => {
    const [rows, liveLocations] = await Promise.all([
      LocationSharingService.getAdminSessions(),
      LocationSharingService.getAdminActiveLocations(),
    ]);
    setActiveLocations(liveLocations);
    const activeRows = rows.filter(row => !row.ended_at);
    const activeIds = new Set(activeRows.map(row => row.id));
    if (knownActiveSessionIds.current === null) {
      knownActiveSessionIds.current = activeIds;
      activeRows.forEach(session => notifyAdmin(`${session.tutor_name} is currently sharing their location for ${activityLabel(session.activity_type).toLowerCase()}.`, session.id));
    } else {
      const newlyStarted = activeRows.filter(row => !knownActiveSessionIds.current?.has(row.id));
      newlyStarted.forEach(session => notifyAdmin(`${session.tutor_name} has started ${activityLabel(session.activity_type).toLowerCase()}.`, session.id));
      knownActiveSessionIds.current = activeIds;
    }
    setSessions(rows);
    if (selectedSession) {
      const refreshed = rows.find(row => row.id === selectedSession.id) || null;
      setSelectedSession(refreshed);
    }
  };

  useEffect(() => {
    if (mode === 'admin') {
      loadAdminSessions().catch(err => setError(err.message || 'Could not load location sessions.'));
      const refresh = () => { loadAdminSessions().catch(err => setError(err?.message || 'Could not refresh live tutor locations.')); };
      const unsubscribe = LocationSharingService.subscribeToAdminLocationChanges(refresh);
      const timer = window.setInterval(refresh, 12000);
      return () => { window.clearInterval(timer); unsubscribe(); };
    }
    let mounted = true;
    LocationSharingService.getMyActiveSession().then(async session => {
      if (!mounted || !session) return;
      setActiveSession(session);
      try {
        await LocationSharingService.resume(session.id);
        if (mounted) setNotice('Your active sharing session has been restored on this device.');
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Location sharing could not resume. Check location permissions.');
      }
    }).catch(err => { if (mounted) setError(err.message || 'Could not check location sharing status.'); });
    return () => { mounted = false; };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'admin' || !selectedSession) return;
    let mounted = true;
    const refreshPoints = async () => {
      try {
        const latestPoints = await LocationSharingService.getSessionPoints(selectedSession.id);
        if (mounted) setPoints(latestPoints);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Could not refresh live location.');
      }
    };
    void refreshPoints();
    const timer = window.setInterval(() => { void refreshPoints(); }, 10000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [mode, selectedSession?.id]);

  const startSharing = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const id = await LocationSharingService.start(activity, cellId);
      const session = await LocationSharingService.getMyActiveSession();
      setActiveSession(session?.id === id ? session : {
        id, tutor_user_id: currentUser.id, tutor_name: currentUser.full_name,
        cell_id: cellId || null, cell_name: currentUser.cell_name || null,
        activity_type: activity, started_at: new Date().toISOString(), ended_at: null,
      });
      setNotice('Location sharing is on. It will continue only for this session until you stop it.');
    } catch (err: any) {
      setError(err?.message || 'Could not start location sharing. Allow location access and try again.');
    } finally { setBusy(false); }
  };

  const stopSharing = async () => {
    if (!activeSession) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await LocationSharingService.stop(activeSession.id);
      setActiveSession(null);
      setNotice('Location sharing is off. No more location points will be collected for this session.');
    } catch (err: any) {
      setError(err?.message || 'The device watcher has been stopped, but the session status could not be updated. Reconnect and retry.');
    } finally { setBusy(false); }
  };

  const inspectSession = async (session: LocationSession) => {
    setSelectedSession(session); setPoints([]); setError('');
    try { setPoints(await LocationSharingService.getSessionPoints(session.id)); }
    catch (err: any) { setError(err?.message || 'Could not load this route.'); }
  };

  if (mode === 'admin') {
    const livePoints = activeLocations.filter(item => item.point && Number.isFinite(item.point.latitude) && Number.isFinite(item.point.longitude));
    const mapPoints = points.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    const mapUrl = mapPoints.length > 1
      ? 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(`${mapPoints[0].latitude},${mapPoints[0].longitude}`) +
        '&destination=' + encodeURIComponent(`${mapPoints[mapPoints.length - 1].latitude},${mapPoints[mapPoints.length - 1].longitude}`) +
        (mapPoints.length > 2 ? '&waypoints=' + encodeURIComponent(mapPoints.slice(1, -1).slice(0, 8).map(p => `${p.latitude},${p.longitude}`).join('|')) : '')
      : '';
    const latestPoint = mapPoints[mapPoints.length - 1];
    const mapEmbedUrl = latestPoint
      ? 'https://www.openstreetmap.org/export/embed.html?bbox=' +
        encodeURIComponent(`${latestPoint.longitude - 0.004},${latestPoint.latitude - 0.004},${latestPoint.longitude + 0.004},${latestPoint.latitude + 0.004}`) +
        '&layer=mapnik&marker=' + encodeURIComponent(`${latestPoint.latitude},${latestPoint.longitude}`)
      : '';
    return (
      <section className="fni-location-panel mb-6 rounded-2xl border border-[#E3E8EF] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-black text-[#142B4A] flex items-center gap-2"><MapPin className="w-4 h-4 text-[#C6A45A]" /> Session location records</h2>
            <p className="text-xs text-[#667085] mt-1">Live sessions appear here when tutors start sharing. Location is not collected after they stop sharing.</p>
          </div>
          <div className="flex items-center gap-2"><button onClick={enableAdminPush} disabled={busy} className="h-9 px-3 rounded-xl border border-[#E3E8EF] text-xs font-bold text-[#142B4A] disabled:opacity-60">Enable push alerts</button><button onClick={() => loadAdminSessions().catch(err => setError(err.message))} className="h-9 px-3 rounded-xl border border-[#E3E8EF] text-xs font-bold text-[#142B4A] flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button></div>
        </div>
        {notice && <div role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-900">{notice}</div>}
        <div className="mb-5 rounded-xl border border-[#D9E4F2] bg-[#F7FAFE] p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#142B4A]">All active tutors · Live map</h3>
              <p className="text-xs text-[#667085] mt-1">{activeLocations.length} active sharing session{activeLocations.length === 1 ? '' : 's'} · live positions refresh automatically</p>
            </div>
            <span className="text-[11px] text-[#667085]">Select a tutor to inspect their individual route</span>
          </div>
          {activeLocations.length > 0 ? (
            <>
              <LiveTutorMap locations={activeLocations} selectedSessionId={selectedSession?.id} onSelectSession={inspectSession} />
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeLocations.map(item => (
                  <div key={item.session.id} className="rounded-lg border border-[#E3E8EF] bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => inspectSession(item.session)} className="text-xs font-bold text-[#142B4A] truncate text-left hover:underline">{item.session.tutor_name}</button>
                      <span className="text-[10px] font-bold text-emerald-700">LIVE</span>
                    </div>
                    <p className="text-[11px] text-[#667085] mt-0.5">{item.session.cell_name || 'No cell assigned'} · Started {dateLabel(item.session.started_at)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#667085]">{item.points.length} GPS points</span>
                      {item.point && <button type="button" onClick={() => openNativeMaps(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.point!.latitude},${item.point!.longitude}`)}`)} className="text-[10px] font-bold text-[#142B4A] underline">Open this tutor in Maps</button>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#667085] mt-2">The live map inside FNI shows every active tutor as a separate marker. “Open in Maps” sends the latest positions to Google Maps as a route snapshot; external Maps apps do not receive a continuous live feed from FNI.</p>
            </>
          ) : (
            <div className="rounded-lg bg-white border border-[#E3E8EF] p-5 text-center text-xs text-[#667085]">No tutors are sharing their location right now.</div>
          )}
        </div>

        {sessions.length === 0 ? <p className="text-sm text-[#667085] py-5 text-center">No location-sharing sessions have been recorded.</p> : (
          <div className="space-y-2">
            {sessions.map(session => (
              <button key={session.id} onClick={() => inspectSession(session)} className={`w-full text-left rounded-xl border p-3 transition-colors ${selectedSession?.id === session.id ? 'border-[#C6A45A] bg-amber-50/40' : 'border-[#E3E8EF] hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-sm text-[#142B4A] truncate">{session.tutor_name}</span>
                  <span className={`text-[10px] font-bold rounded-full px-2 py-1 ${session.ended_at ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{session.ended_at ? 'Stopped' : 'Sharing now'}</span>
                </div>
                <div className="text-xs text-[#667085] mt-1">{activityLabel(session.activity_type)}{session.cell_name ? ` · ${session.cell_name}` : ''}</div>
                <div className="text-[11px] text-[#98A2B3] mt-1">{dateLabel(session.started_at)}{session.ended_at ? ` – ${dateLabel(session.ended_at)}` : ''}</div>
              </button>
            ))}
          </div>
        )}
        {selectedSession && (
          <div className="mt-4 border-t border-[#E3E8EF] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div><div className="text-sm font-bold text-[#142B4A]">{selectedSession.tutor_name} · {selectedSession.ended_at ? 'Route history' : 'Live location'}</div><div className="text-xs text-[#667085]">{points.length} recorded points{!selectedSession.ended_at ? ' · refreshing every 10 seconds' : ''}</div></div>
              {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#142B4A] text-white px-3 py-2 text-xs font-bold">Open route <ExternalLink className="w-3 h-3" /></a>}
            </div>
            <LiveTutorMap
              locations={activeLocations.some(item => item.session.id === selectedSession.id)
                ? activeLocations
                : [...activeLocations, { session: selectedSession, point: latestPoint || null, points }]}
              selectedSessionId={selectedSession.id}
              onSelectSession={inspectSession}
            />
            {latestPoint && <p className="text-[11px] text-[#667085] mb-2">Latest coordinates: {latestPoint.latitude.toFixed(5)}, {latestPoint.longitude.toFixed(5)} · Updated {dateLabel(latestPoint.captured_at)}</p>}
            <p className="text-[11px] text-[#667085] mb-3">
              Started {dateLabel(selectedSession.started_at)} · {points.length > 0 ? `Distance travelled: ${formatDistance(points.slice(1).reduce((sum, point, index) => {
                const previous = points[index];
                const accuracyOk = (previous.accuracy_m ?? 0) <= 100 && (point.accuracy_m ?? 0) <= 100;
                return sum + (accuracyOk ? distanceBetween(previous, point) : 0);
              }, 0))}` : 'Distance unavailable until GPS points are recorded'}
            </p>
            {points.length === 0 ? <p className="text-xs text-[#667085]">No location points were recorded for this session.</p> : (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {points.map(point => <div key={point.id} className="flex items-center justify-between gap-2 text-[11px] text-[#667085] border-b border-slate-100 pb-1"><span className="font-mono">{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</span><span>{dateLabel(point.captured_at)}</span></div>)}
              </div>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
      </section>
    );
  }

  return (
    <section className="fni-location-panel mb-6 rounded-2xl border border-[#E3E8EF] bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#142B4A]/5 text-[#C6A45A] flex items-center justify-center shrink-0"><Navigation className="w-5 h-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-black text-[#142B4A]">Session location sharing</h2>{activeSession && <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">SHARING ON</span>}</div>
          <p className="text-xs text-[#667085] mt-1 leading-relaxed">Share your route with FNI administrators only while you are conducting evangelism or holding your cell meeting. You are in control and can stop at any time.</p>
        </div>
      </div>
      {activeSession ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="text-sm font-bold text-emerald-900">{activityLabel(activeSession.activity_type)} · Sharing is active</div>
          <div className="text-xs text-emerald-800 mt-1">Started {dateLabel(activeSession.started_at)}. Your phone may show a persistent location notification while sharing is active.</div>
          <button onClick={stopSharing} disabled={busy} className="mt-3 h-11 w-full sm:w-auto px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2"><Square className="w-4 h-4" /> {busy ? 'Stopping…' : 'Stop sharing location'}</button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1 text-xs font-bold text-[#475467]">Activity
            <select value={activity} onChange={e => setActivity(e.target.value as LocationActivity)} className="mt-1.5 h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#182230]">
              <option value="evangelism">Evangelism outreach</option>
              <option value="cell_meeting">Cell meeting</option>
            </select>
          </label>
          <button onClick={startSharing} disabled={busy} className="h-11 px-5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2"><Play className="w-4 h-4 text-[#C6A45A]" /> {busy ? 'Starting…' : 'Start sharing location'}</button>
        </div>
      )}
      <div className="mt-3 flex items-start gap-2 text-[11px] text-[#667085]"><ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" /><span>Location is not collected before you start or after you stop. Admins can view saved points from active and completed sessions only.</span></div>
      {CapacitorHint}
      {notice && <p className="mt-2 text-xs text-emerald-700">{notice}</p>}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <button type="button" onClick={() => LocationSharingService.openLocationSettings().catch(() => undefined)} className="mt-2 text-[11px] text-[#142B4A] underline underline-offset-2">Location permission settings</button>
    </section>
  );
};
const CapacitorHint = <p className="mt-2 text-[11px] text-[#667085]">For background sharing on Android, grant location access as requested and allow location all the time in your phone’s app permissions.</p>;
