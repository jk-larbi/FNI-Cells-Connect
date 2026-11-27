import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SoulTargetService } from '../../services/soulTargetService';
import { CellService } from '../../services/cellService';
import { SoulTargetConfig, SoulTargetPeriod, Cell } from '../../types';
import {
  Target,
  X,
  Calendar,
  Building,
  Save,
  RotateCcw,
  History,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface SoulTargetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const SoulTargetSettingsModal: React.FC<SoulTargetSettingsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { currentUser } = useAuth();
  const [cells, setCells] = useState<Cell[]>([]);
  const [ministryTarget, setMinistryTarget] = useState<number>(5000);
  const [targetPeriod, setTargetPeriod] = useState<SoulTargetPeriod>('yearly');
  const [cellTargets, setCellTargets] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<string>('Territorial kingdom expansion across 16 cells');
  const [auditHistory, setAuditHistory] = useState<SoulTargetConfig['auditHistory']>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isActive = true;

    const loadConfig = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [config, activeCells] = await Promise.all([
          SoulTargetService.getConfig(),
          CellService.getActiveCells(),
        ]);
        if (!isActive) return;

        setCells(activeCells);
        setMinistryTarget(config.ministryTarget || config.annualTarget || 5000);
        setTargetPeriod(config.targetPeriod || 'yearly');
        setAuditHistory(config.auditHistory || []);

        const initialTargets: Record<string, number> = {};
        const count = Math.max(1, activeCells.length);
        const defaultPerCell = Math.round((config.ministryTarget || config.annualTarget || 5000) / count);

        activeCells.forEach(cell => {
          const custom = config.cellTargets?.[cell.id] ?? config.cellTargets?.[cell.name];
          initialTargets[cell.id] = typeof custom === 'number' && custom > 0 ? custom : defaultPerCell;
        });
        setCellTargets(initialTargets);
      } catch (error) {
        console.error('Failed to load soul target settings:', error);
        if (isActive) setLoadError('Soul target settings could not be loaded. Please try again.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadConfig();
    return () => { isActive = false; };
  }, [isOpen, loadAttempt]);

  if (!isOpen) return null;

  const totalCellTargets = Object.values(cellTargets).reduce((a, b) => a + (Number(b) || 0), 0);
  const diff = totalCellTargets - ministryTarget;

  const handleCellTargetChange = (cellId: string, value: number) => {
    setCellTargets(prev => ({
      ...prev,
      [cellId]: Math.max(0, value),
    }));
  };

  const handleDistributeEvenly = () => {
    if (cells.length === 0) return;
    const count = cells.length;
    const perCell = Math.floor(ministryTarget / count);
    const remainder = ministryTarget % count;

    const distributed: Record<string, number> = {};
    cells.forEach((cell, idx) => {
      distributed[cell.id] = perCell + (idx < remainder ? 1 : 0);
    });
    setCellTargets(distributed);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setSaveError('');
      await SoulTargetService.updateTargetSettings({
        ministryTarget: Number(ministryTarget),
        targetPeriod,
        cellTargets,
        changedBy: currentUser?.full_name || 'System Administrator',
        reason: reason.trim() || 'Annual target calibration',
      });
      setSuccessMessage('Soul targets updated and synced live across all active cells.');
      setTimeout(() => {
        setSuccessMessage(null);
        if (onUpdated) onUpdated();
        onClose();
      }, 1200);
    } catch (error) {
      console.error('Failed to save soul target settings:', error);
      setSaveError(error instanceof Error ? error.message : 'Could not save soul target settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-navy-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-navy-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gold-400/20 text-gold-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-gold-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-950 dark:text-white">
                Admin Soul Target Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure ministry target and individual goals across all 16 fellowship cells
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-navy-800 flex items-center justify-center text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {saveError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">{saveError}</div>}
        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500" role="status" aria-live="polite">Loading live soul target settings...</div>
        ) : loadError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center" role="alert">
            <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-rose-600" />
            <p className="text-sm font-semibold text-rose-800">Soul target settings are unavailable</p>
            <p className="mt-1 text-xs text-rose-700">{loadError}</p>
            <button type="button" onClick={() => setLoadAttempt(value => value + 1)} className="mt-3 min-h-9 rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white">Try again</button>
          </div>
        ) : (
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Target & Period Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-800">
            <div>
              <label className="block font-bold text-navy-950 dark:text-white mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-gold-500" />
                <span>Overall Ministry Soul Target</span>
              </label>
              <input
                type="number"
                min={1}
                value={ministryTarget}
                onChange={e => setMinistryTarget(Math.max(1, Number(e.target.value)))}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-950 dark:text-white font-bold text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Total target souls to win across all field outreaches
              </span>
            </div>

            <div>
              <label className="block font-bold text-navy-950 dark:text-white mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-navy-600 dark:text-gold-400" />
                <span>Target Evaluation Period</span>
              </label>
              <select
                value={targetPeriod}
                onChange={e => setTargetPeriod(e.target.value as SoulTargetPeriod)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-950 dark:text-white font-semibold text-xs"
              >
                <option value="weekly">Weekly Cycle</option>
                <option value="monthly">Monthly Cycle</option>
                <option value="quarterly">Quarterly Cycle</option>
                <option value="yearly">Yearly / Annual (2026)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Defines the reporting cadence for cell progress calculations
              </span>
            </div>
          </div>

          {/* Cell Targets Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-gold-500" />
                <span className="font-bold text-navy-950 dark:text-white text-xs">
                  Cell Targets Allocation ({cells.length} Cells)
                </span>
              </div>
              <button
                type="button"
                onClick={handleDistributeEvenly}
                className="px-2.5 py-1 rounded-lg bg-navy-50 dark:bg-navy-800 text-navy-900 dark:text-gold-300 hover:bg-navy-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-gold-500" />
                <span>Distribute Evenly</span>
              </button>
            </div>

            {/* Sum indicator */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-navy-950 text-[11px]">
              <span className="text-slate-600 dark:text-slate-400">Sum of Cell Allocations:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-navy-950 dark:text-white">{totalCellTargets.toLocaleString()} souls</span>
                {diff === 0 ? (
                  <span className="text-emerald-600 font-semibold">(Exact match)</span>
                ) : diff > 0 ? (
                  <span className="text-amber-600 font-semibold">(+{diff} above ministry target)</span>
                ) : (
                  <span className="text-rose-600 font-semibold">({diff} remaining to allocate)</span>
                )}
              </div>
            </div>

            {/* 16 Cells Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
              {cells.map(cell => {
                const currentVal = cellTargets[cell.id] ?? 0;
                return (
                  <div
                    key={cell.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900"
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold text-navy-950 dark:text-white truncate">{cell.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{cell.leader_name || 'Tutor'}</div>
                    </div>
                    <div className="w-24 shrink-0">
                      <input
                        type="number"
                        min={0}
                        value={currentVal}
                        onChange={e => handleCellTargetChange(cell.id, Number(e.target.value))}
                        className="w-full p-1.5 text-right rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-950 font-bold text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason for calibration */}
          <div>
            <label className="block font-bold text-navy-950 dark:text-white mb-1">
              Calibration Note / Scripture Theme
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Mid-year soul acceleration, Matthew 28:19 outreach drive"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-navy-950 dark:text-white"
            />
          </div>

          {/* Audit History */}
          {auditHistory && auditHistory.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-navy-950 rounded-xl border border-slate-200 dark:border-navy-800 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3 h-3 text-gold-500" />
                <span>Historical Goal Adjustments</span>
              </div>
              <div className="max-h-20 overflow-y-auto space-y-1 custom-scrollbar text-[10px] text-slate-600 dark:text-slate-400">
                {auditHistory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-l-2 border-gold-500 pl-2">
                    <span>Target changed from {item.previousTarget.toLocaleString()} to {item.newTarget.toLocaleString()}</span>
                    <span className="text-slate-400">{new Date(item.timestamp).toLocaleDateString()} by {item.changedBy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-navy-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-navy-900 text-white font-bold hover:bg-navy-800 cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-gold-400" />
              <span>{isSaving ? 'Saving...' : 'Save & Propagate Targets'}</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
