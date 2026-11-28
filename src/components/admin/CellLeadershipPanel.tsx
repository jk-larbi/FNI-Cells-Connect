import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, History, UserMinus, UserRoundCheck } from 'lucide-react';
import { Cell, Profile } from '../../types';
import { AuthService } from '../../services/authService';
import { SupabaseService } from '../../services/supabaseService';

interface LeadershipHistoryRow {
  id: string;
  previous_leader_name: string | null;
  new_leader_name: string | null;
  action: string;
  reason: string | null;
  changed_by_name: string;
  changed_at: string;
}

interface CellLeadershipPanelProps {
  cell: Cell;
  onUpdated: () => Promise<void> | void;
}

export const CellLeadershipPanel: React.FC<CellLeadershipPanelProps> = ({ cell, onUpdated }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [history, setHistory] = useState<LeadershipHistoryRow[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState(cell.leader_id || cell.tutorUid || '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentLeaderId = cell.leader_id || cell.tutorUid || '';
  const activeTutors = useMemo(() => profiles.filter(profile =>
    (profile.role === 'tutor' || profile.role === 'cell_leader') &&
    profile.is_active
  ), [profiles, currentLeaderId]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, historyRows] = await Promise.all([
        Promise.resolve(AuthService.getAllProfiles()),
        SupabaseService.getCellLeadershipHistory(cell.id),
      ]);
      setProfiles(rows);
      setHistory(historyRows as LeadershipHistoryRow[]);
    } catch (e: any) {
      setError(e?.message || 'Could not load leadership history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedLeaderId(currentLeaderId);
    load();
  }, [cell.id, currentLeaderId]);

  useEffect(() => {
    const handleCloudChange = (event: Event) => {
      const table = (event as CustomEvent).detail?.table;
      if (table === '*' || ['cells', 'cell_leadership_history'].includes(table)) void load();
    };
    window.addEventListener('fni:cloud-data-changed', handleCloudChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleCloudChange);
  }, [cell.id, currentLeaderId]);

  const save = async (leaderId: string | null) => {
    const action = leaderId === null ? 'dismiss the current leader' : 'change this cell\'s leader';
    if (!window.confirm(`Are you sure you want to ${action}? The cell\'s reports, members and other records will remain unchanged.`)) return;
    setSaving(true);
    setError('');
    try {
      await SupabaseService.updateCellLeader(cell.id, leaderId, reason);
      setReason('');
      setSelectedLeaderId(leaderId || '');
      await onUpdated();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Leadership could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="fni-cell-leadership-panel rounded-2xl border border-[#DCE4EF] bg-[#F7F9FC] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-[#142B4A] flex items-center gap-2"><UserRoundCheck className="w-4 h-4 text-[#C6A45A]" /> Cell Leadership</h4>
          <p className="text-[11px] text-[#667085] mt-0.5">Reassign or dismiss a leader while preserving this cell's history.</p>
        </div>
        <span className="text-[10px] font-bold rounded-full bg-white border border-[#DCE4EF] px-2 py-1 text-[#667085]">{history.length} changes</span>
      </div>

      <div className="fni-leadership-card rounded-xl bg-white border border-[#E3E8EF] p-3">
        <div className="text-[10px] uppercase tracking-wide font-bold text-[#667085]">Current leader</div>
        <div className="text-sm font-semibold text-[#182230] mt-1">{cell.leader_name || 'No leader assigned'}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <select
          value={selectedLeaderId}
          onChange={e => setSelectedLeaderId(e.target.value)}
          disabled={loading || saving}
          className="min-w-0 w-full rounded-xl border border-[#DCE4EF] bg-white px-3 py-2.5 text-xs text-[#182230]"
        >
          <option value="">Choose a registered active tutor</option>
          {activeTutors.map(profile => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name} {profile.cell_name ? `· currently ${profile.cell_name}` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={saving || loading || !selectedLeaderId || selectedLeaderId === currentLeaderId}
          onClick={() => save(selectedLeaderId)}
          className="rounded-xl bg-[#142B4A] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40 inline-flex items-center justify-center gap-2"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#C6A45A]" /> {saving ? 'Saving…' : 'Assign / Swap'}
        </button>
      </div>

      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={2}
        placeholder="Reason for the leadership change (optional)"
        className="w-full rounded-xl border border-[#DCE4EF] bg-white px-3 py-2 text-xs text-[#182230] resize-y"
      />

      {currentLeaderId && (
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => save(null)}
          className="fni-leadership-danger rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40 inline-flex items-center gap-2"
        >
          <UserMinus className="w-3.5 h-3.5" /> Dismiss current leader
        </button>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>{error}{history.length > 0 ? ' Previously loaded history remains visible.' : ''}</span>
          <button type="button" onClick={() => void load()} disabled={loading || saving} className="min-h-9 shrink-0 rounded-lg border border-rose-300 px-3 font-bold hover:bg-rose-100 disabled:opacity-50">Retry</button>
        </div>
      )}

      <div className="pt-2 border-t border-[#DCE4EF]">
        <h5 className="text-xs font-bold text-[#142B4A] flex items-center gap-2 mb-2"><History className="w-3.5 h-3.5 text-[#C6A45A]" /> Leadership History</h5>
        {loading ? <p className="text-xs text-[#667085]">Loading history…</p> : history.length === 0 ? (
          <p className="text-xs text-[#667085] rounded-lg bg-white p-3">No leadership changes recorded for this cell yet.</p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {history.map(item => (
              <div key={item.id} className="fni-leadership-card rounded-xl bg-white border border-[#E3E8EF] p-3">
                <div className="flex flex-wrap justify-between gap-1 text-xs">
                  <span className="font-bold text-[#182230]">
                    {item.previous_leader_name || 'No previous leader'} → {item.new_leader_name || 'Unassigned'}
                  </span>
                  <span className="text-[10px] text-[#667085]">{item.changed_at && Number.isFinite(Date.parse(item.changed_at)) ? new Date(item.changed_at).toLocaleString() : 'Date unavailable'}</span>
                </div>
                <div className="text-[10px] text-[#667085] mt-1">
                  {item.action.replace('_', ' ')} · Updated by {item.changed_by_name}
                </div>
                {item.reason && <p className="text-[11px] text-[#475467] mt-1">{item.reason}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
