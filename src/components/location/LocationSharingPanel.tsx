import React, { useEffect, useRef, useState } from 'react';
import { Clock, MapPin, Navigation, Play, ShieldCheck, Square, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LocationSharingService, LocationSession, LocationPoint, LocationActivity } from '../../services/locationSharingService';

interface Props {
  mode: 'tutor' | 'admin';
  cellId?: string | null;
}
const activityLabel = (type: LocationActivity) => type === 'evangelism' ? 'Evangelism outreach' : 'Cell meeting';
const dateLabel = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export const LocationSharingPanel: React.FC<Props> = ({ mode, cellId }) => {
  const { currentUser } = useAuth();
  const [activity, setActivity] = useState<LocationActivity>('evangelism');
  const [activeSession, setActiveSession] = useState<LocationSession | null>(null);
  const [sessions, setSessions] = useState<LocationSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<LocationSession | null>(null);
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const knownActiveSessionIds = useRef<Set<string> | null>(null);

  const loadAdminSessions = async () => {
    const rows = await LocationSharingService.getAdminSessions();
    const activeRows = rows.filter(row => !row.ended_at);
    const activeIds = new Set(activeRows.map(row => row.id));
    if (knownActiveSessionIds.current === null) {
      knownActiveSessionIds.current = activeIds;
    } else {
      const newlyStarted = activeRows.filter(row => !knownActiveSessionIds.current?.has(row.id));
      if (newlyStarted.length) {
        const latest = newlyStarted[0];
        const message = `${latest.tutor_name} has started ${activityLabel(latest.activity_type).toLowerCase()}.`;
        setNotice(message);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('FNI Evangelism Tracking', { body: message });
        }
      }
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
      const timer = window.setInterval(() => {
        loadAdminSessions().catch(() => undefined);
      }, 10000);
      return () => window.clearInterval(timer);
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
    const mapPoints = points.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    const mapUrl = mapPoints.length > 1
      ? 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(`${mapPoints[0].latitude},${mapPoints[0].longitude}`) +
        '&destination=' + encodeURIComponent(`${mapPoints[mapPoints.length - 1].latitude},${mapPoints[mapPoints.length - 1].longitude}`) +
        (mapPoints.length > 2 ? '&waypoints=' + encodeURIComponent(mapPoints.slice(1, -1).slice(0, 8).map(p => `${p.latitude},${p.longitude}`).join('|')) : '')
      : '';
    return (
      <section className="mb-6 rounded-2xl border border-[#E3E8EF] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-black text-[#142B4A] flex items-center gap-2"><MapPin className="w-4 h-4 text-[#C6A45A]" /> Session location records</h2>
            <p className="text-xs text-[#667085] mt-1">Live sessions appear here when tutors start sharing. Location is not collected after they stop sharing.</p>
          </div>
          <button onClick={() => loadAdminSessions().catch(err => setError(err.message))} className="h-9 px-3 rounded-xl border border-[#E3E8EF] text-xs font-bold text-[#142B4A] flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
        {notice && <div role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-900">{notice}</div>}
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
              <div><div className="text-sm font-bold text-[#142B4A]">{selectedSession.tutor_name} · Route history</div><div className="text-xs text-[#667085]">{points.length} recorded location points</div></div>
              {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#142B4A] text-white px-3 py-2 text-xs font-bold">Open route <ExternalLink className="w-3 h-3" /></a>}
            </div>
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
    <section className="mb-6 rounded-2xl border border-[#E3E8EF] bg-white p-4 sm:p-5 shadow-xs">
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
