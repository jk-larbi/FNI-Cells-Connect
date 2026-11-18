import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Users,
  AlertTriangle,
  History,
  Check,
  Loader2,
  RefreshCw,
  Building,
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { MessagingService } from '../../services/messagingService';
import { useAuth } from '../../context/AuthContext';
import { CommunityGroup, OfficialGroupHistoryRecord } from '../../types';

export interface OfficialGroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupChanged?: () => void;
}

export const OfficialGroupManagementModal: React.FC<OfficialGroupManagementModalProps> = ({
  isOpen,
  onClose,
  onGroupChanged,
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [history, setHistory] = useState<OfficialGroupHistoryRecord[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [allGroups, groupHistory] = await Promise.all([
        MessagingService.getCommunityGroups(),
        MessagingService.getOfficialGroupHistory(),
      ]);
      setGroups(allGroups);
      setHistory(groupHistory);
      const current = allGroups.find(g => g.is_official || g.isOfficial);
      if (current) {
        setSelectedGroupId(current.id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentOfficialGroup = groups.find(g => g.is_official || g.isOfficial) || groups[0];
  const targetGroup = groups.find(g => g.id === selectedGroupId);

  const handleDesignate = async () => {
    if (!selectedGroupId || selectedGroupId === currentOfficialGroup?.id) {
      setErrorMsg('Please select a different group to designate as official.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const adminName = currentUser?.full_name || 'System Administrator';
      const result = await MessagingService.designateOfficialCommunityGroup(
        selectedGroupId,
        reason || 'Administrative restructuring',
        adminName
      );
      if (!result.success) {
        throw new Error(result.error || 'Failed to update official group designation');
      }
      setSuccessMsg(`Successfully designated "${targetGroup?.name}" as the official group. Auto-enrolled active tutors.`);
      setShowConfirm(false);
      setReason('');
      await loadData();
      if (onGroupChanged) onGroupChanged();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Designation update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Official Community Group Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                System-level fellowship designation & automatic tutor enrollment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-500 stroke-[3]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Official Group Card */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20 p-5 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-sm mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> ACTIVE OFFICIAL GROUP
                </span>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  {currentOfficialGroup?.name || 'Themelios Class - FNI Community'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md">
                  {currentOfficialGroup?.description || 'Official ministerial fellowship for all active FNI tutors and leaders.'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-lg">
                <Building className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>All active registered tutors automatically enrolled</span>
              </div>
            </div>
          </div>

          {/* Switch Official Designation Form */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Change Official Group Designation</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switching the official community group automatically enrolls every registered tutor in the new group. All previous chats and message history are permanently preserved.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Target Community Group
                </label>
                <select
                  value={selectedGroupId}
                  onChange={e => setSelectedGroupId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} {(g.is_official || g.isOfficial) ? '★ (Current Official)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Administrative Reason / Purpose
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g., Annual cohort rotation or ministerial class restructure"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              {!showConfirm ? (
                <button
                  type="button"
                  disabled={!selectedGroupId || selectedGroupId === currentOfficialGroup?.id}
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Proceed with Designation Change
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Please confirm: switch official group to "{targetGroup?.name}"?</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    This will immediately designate "{targetGroup?.name}" as the primary community fellowship and trigger automatic enrollment for all active tutors.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleDesignate}
                      className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Yes, Confirm Change</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Audit History Log */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Designation Audit Trail</span>
            </h4>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {history.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No previous group designation changes on record.
                </div>
              ) : (
                history.map((record, i) => {
                  const date = record.changedAt || (record as any).changed_at;
                  const admin = record.changedByName || (record as any).changed_by_name || 'Admin';
                  const prev = record.previousGroupName || (record as any).previous_group_name;
                  const next = record.newGroupName || (record as any).new_group_name;
                  return (
                    <div key={record.id || i} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">
                          {prev} → {next}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {date ? new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Changed by <span className="font-medium text-slate-700 dark:text-slate-300">{admin}</span>
                        {record.reason && <span> • Reason: "{record.reason}"</span>}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
