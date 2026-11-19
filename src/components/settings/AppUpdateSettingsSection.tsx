import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
} from 'lucide-react';
import {
  AppUpdateService,
  AppUpdateManifest,
  UpdateCheckStatus,
  DownloadProgress,
} from '../../services/appUpdateService';

export const AppUpdateSettingsSection: React.FC = () => {
  const [manifest, setManifest] = useState<AppUpdateManifest | null>(null);
  const [status, setStatus] = useState<UpdateCheckStatus>('idle');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('Never');
  const [showNotes, setShowNotes] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  const installedVersion = AppUpdateService.getInstalledVersion();
  const isAndroid = AppUpdateService.isAndroidPlatform();
  const isCapacitor = AppUpdateService.isNativeCapacitor();

  const updateLastCheckLabel = () => {
    try {
      const saved = localStorage.getItem('fni_last_update_check_timestamp');
      if (saved) {
        const diffMs = Date.now() - parseInt(saved, 10);
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) setLastCheckTime('Just now');
        else if (mins < 60) setLastCheckTime(`${mins}m ago`);
        else {
          const hours = Math.floor(mins / 60);
          setLastCheckTime(`${hours}h ago`);
        }
      }
    } catch {}
  };

  useEffect(() => {
    updateLastCheckLabel();

    const unsubStatus = AppUpdateService.subscribe((newStatus, newManifest) => {
      setStatus(newStatus);
      if (newManifest) setManifest(newManifest);
      updateLastCheckLabel();
    });

    const unsubProgress = AppUpdateService.subscribeProgress(p => {
      setProgress(p);
    });

    return () => {
      unsubStatus();
      unsubProgress();
    };
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
      await AppUpdateService.checkForUpdates(true);
      updateLastCheckLabel();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to check for updates. Please verify your connection.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdateNow = async () => {
    if (!manifest) return;
    setErrorMessage(null);
    try {
      await AppUpdateService.downloadAndInstall(manifest, p => {
        setProgress(p);
      });
      setShowPermissionGuide(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Download was interrupted. Please retry.');
    }
  };

  const isUpdateAvail = manifest ? AppUpdateService.isUpdateAvailable(manifest) : false;
  const isMandatory = manifest ? AppUpdateService.isMandatoryUpdate(manifest) : false;
  const isDownloading = status === 'downloading' || status === 'verifying';
  const isReady = status === 'ready-to-install';

  // Render Status Badge
  const renderStatusBadge = () => {
    if (isDownloading) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
          <span>Downloading update...</span>
        </span>
      );
    }
    if (status === 'download-failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Download failed</span>
        </span>
      );
    }
    if (isReady) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
          <Download className="w-3.5 h-3.5 text-amber-500" />
          <span>Installation pending</span>
        </span>
      );
    }
    if (isMandatory && isUpdateAvail) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span>Update required</span>
        </span>
      );
    }
    if (isUpdateAvail) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-sky-500" />
          <span>Update available</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span>You're up to date</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-white">
      {/* ── Main App Updates Card ── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#26384d] bg-white dark:bg-[#152338] p-5 sm:p-6 shadow-xs space-y-5">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#26384d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#142B4A] dark:bg-blue-900/50 text-[#C6A45A] flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                App Updates & Versioning
              </h3>
              <p className="text-xs text-slate-400">
                Automatic release detection, signed package downloads & in-place data preservation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {renderStatusBadge()}
          </div>
        </div>

        {/* Platform Environment Notice */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">Environment:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {isCapacitor
                ? 'Android Native Shell (APK)'
                : isAndroid
                ? 'Android Chrome / Web'
                : 'iOS Home Screen / Web PWA'}
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            ID: com.forerunnersnetwork.fnicellsconnect
          </span>
        </div>

        {/* Version Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Installed Version</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-0.5 block">
              v{installedVersion}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Latest Available</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
              {manifest ? `v${manifest.latestVersion}` : `v${installedVersion}`}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Checked</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{lastCheckTime}</span>
            </span>
          </div>
        </div>

        {/* Real-time Download Progress Bar (When downloading) */}
        {isDownloading && progress && (
          <div className="space-y-2 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
              <span>{status === 'verifying' ? 'Verifying APK integrity (SHA-256)...' : 'Downloading APK...'}</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-300 rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-300">
              <span>{(progress.loadedBytes / (1024 * 1024)).toFixed(1)} MB</span>
              <span>{(progress.totalBytes / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* What's New Accordion (if manifest exists) */}
        {manifest && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setShowNotes(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <span>Release Notes (v{manifest.latestVersion})</span>
              {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showNotes && (
              <div className="px-4 pb-3.5 pt-1 border-t border-slate-200/50 dark:border-white/5">
                <ul className="space-y-1.5">
                  {manifest.releaseNotes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Android "Allow from this source" Helper Guide */}
        {showPermissionGuide && (
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Android Installation Permission:</span>
            </p>
            <p>
              If Android asks to <strong>"Install unknown apps"</strong>, tap <em>Settings</em> &rarr; enable{' '}
              <em>"Allow from this source"</em> for FNI Cells Connect, then tap <strong>Install</strong>.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {/* Check for Updates Button */}
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking || isDownloading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-blue-500' : ''}`} />
            <span>{isChecking ? 'Checking for Updates...' : 'Check for Updates'}</span>
          </button>

          {/* Update Now Action (When Update is Available) */}
          {isUpdateAvail && (
            <button
              type="button"
              onClick={handleUpdateNow}
              disabled={isDownloading}
              className="w-full sm:flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#173B8F] to-[#2563EB] hover:from-[#142B4A] hover:to-[#1D4ED8] text-white font-extrabold text-xs shadow-md transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Downloading...</span>
                </>
              ) : isReady ? (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Complete Installation</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Update Now ({manifest?.apkSize || '14.8 MB'})</span>
                </>
              )}
            </button>
          )}

          {/* iOS / Web Note */}
          {!isAndroid && (
            <div className="text-[11px] text-slate-400 italic">
              On iOS Home Screen PWA, updates are automatically applied whenever the app opens.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
