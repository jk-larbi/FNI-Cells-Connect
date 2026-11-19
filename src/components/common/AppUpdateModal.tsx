import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  AppUpdateService,
  AppUpdateManifest,
  UpdateCheckStatus,
  DownloadProgress,
} from '../../services/appUpdateService';

export const AppUpdateModal: React.FC = () => {
  const [manifest, setManifest] = useState<AppUpdateManifest | null>(null);
  const [status, setStatus] = useState<UpdateCheckStatus>('idle');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  useEffect(() => {
    // Only check automatically if on Android platform
    if (!AppUpdateService.isAndroidPlatform()) return;

    const unsubscribeStatus = AppUpdateService.subscribe((newStatus, newManifest) => {
      setStatus(newStatus);
      if (newManifest) setManifest(newManifest);

      if (newStatus === 'update-available' && newManifest) {
        // Guard: check if in call or submission
        if (!AppUpdateService.isInterruptionSafe()) return;
        // Check if user previously dismissed with Remind Later
        if (!AppUpdateService.isMandatoryUpdate(newManifest) && AppUpdateService.isDismissed(newManifest.latestVersion)) {
          return;
        }
        setIsOpen(true);
      }
    });

    const unsubscribeProgress = AppUpdateService.subscribeProgress(p => {
      setProgress(p);
    });

    // Run initial background update check
    AppUpdateService.checkForUpdates().catch(() => {});

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
    };
  }, []);

  const handleUpdateNow = async () => {
    if (!manifest) return;
    setErrorMessage(null);
    try {
      await AppUpdateService.downloadAndInstall(manifest, p => {
        setProgress(p);
      });
      // Show installer permission guide in case Android presents security prompt
      setShowPermissionHelp(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Download was interrupted. Please check network connection and retry.');
    }
  };

  const handleRemindLater = () => {
    if (!manifest) return;
    AppUpdateService.dismissUpdate(manifest.latestVersion);
    setIsOpen(false);
  };

  if (!isOpen || !manifest) return null;

  const isMandatory = AppUpdateService.isMandatoryUpdate(manifest);
  const installedVer = AppUpdateService.getInstalledVersion();
  const isDownloading = status === 'downloading' || status === 'verifying';
  const isReady = status === 'ready-to-install';

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fadeIn"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#121f30] border border-slate-200/90 dark:border-white/15 shadow-2xl p-6 sm:p-7 text-slate-800 dark:text-white flex flex-col gap-4 animate-scaleUp overflow-hidden"
      >
        {/* Top Header Row with FNI Branding */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#173B8F] to-[#2563EB] text-white flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-6 h-6 text-[#C6A45A]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                <Smartphone className="w-3 h-3" />
                <span>Android App Update</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                FNI Cells Connect Update
              </h2>
            </div>
          </div>

          {!isMandatory && !isDownloading && (
            <button
              type="button"
              onClick={handleRemindLater}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              title="Remind me later"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Version Difference Banner */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Installed</span>
            <span className="font-mono font-bold text-slate-600 dark:text-slate-300">v{installedVer}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-500 uppercase block">New Version</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              v{manifest.latestVersion}
            </span>
          </div>
        </div>

        {/* Release Notes Accordion */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setShowNotes(prev => !prev)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <span>What's New in v{manifest.latestVersion}</span>
            {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showNotes && (
            <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/50 dark:border-white/5">
              <ul className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
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

        {/* Mandatory Warning (if required) */}
        {isMandatory && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p>
              This update contains critical database and communication upgrades required to keep syncing with your cell
              and submitting reports.
            </p>
          </div>
        )}

        {/* Real-Time Download Progress Bar */}
        {isDownloading && progress && (
          <div className="space-y-2 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
              <span>{status === 'verifying' ? 'Verifying APK integrity...' : 'Downloading update...'}</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-900/60 overflow-hidden">
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

        {/* Ready to Install Banner */}
        {isReady && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>APK package verified. Tap "Complete Installation" to finalize in-place update.</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            <p className="font-semibold mb-1">Download Error:</p>
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Android "Allow from this source" Helper Guide */}
        {showPermissionHelp && (
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Android Installation Permission:</span>
            </p>
            <p>
              If Android asks to <strong>"Install unknown apps"</strong>, tap <em>Settings</em> &rarr; enable{' '}
              <em>"Allow from this source"</em> for FNI Cells Connect, then tap <strong>Install</strong>.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          {!isMandatory && !isDownloading && (
            <button
              type="button"
              onClick={handleRemindLater}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Remind Me Later
            </button>
          )}

          <button
            type="button"
            onClick={handleUpdateNow}
            disabled={isDownloading}
            className={`flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#173B8F] to-[#2563EB] hover:from-[#142B4A] hover:to-[#1D4ED8] text-white font-extrabold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
              isDownloading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
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
                <span>Update Now ({manifest.apkSize || '14.8 MB'})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
