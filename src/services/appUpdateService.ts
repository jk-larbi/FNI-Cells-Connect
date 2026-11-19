import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface AppUpdateManifest {
  appId: string;
  appName: string;
  latestVersion: string;
  versionCode: number;
  releaseDate: string;
  apkUrl: string;
  sha256?: string;
  apkSize?: string;
  minSupportedVersion?: string;
  isMandatory?: boolean;
  releaseNotes: string[];
}

export type UpdateCheckStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'update-available'
  | 'downloading'
  | 'verifying'
  | 'ready-to-install'
  | 'download-failed'
  | 'error';

export interface DownloadProgress {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
}

const MANIFEST_URLS = [
  // 1. Direct GitHub Pages hosted manifest
  'https://jk-larbi.github.io/FNI-Cells-Connect/fni-app-update.json',
  'https://jk-larbi.github.io/FNI-Cells-Connect/fni-cells-update.json',
  // 2. Relative URL if running within GitHub Pages / web context
  '/fni-app-update.json',
  '/fni-cells-update.json',
  // 3. Official GitHub releases API fallback
  'https://api.github.com/repos/jk-larbi/FNI-Cells-Connect/releases/latest',
];

const LAST_CHECK_KEY = 'fni_last_update_check_timestamp';
const CACHED_MANIFEST_KEY = 'fni_cached_update_manifest';
const REMIND_LATER_PREFIX = 'fni_remind_later_';
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
const REMIND_LATER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AppUpdateService {
  private static status: UpdateCheckStatus = 'idle';
  private static progress: DownloadProgress | null = null;
  private static cachedManifest: AppUpdateManifest | null = null;
  private static listeners: Set<(status: UpdateCheckStatus, manifest?: AppUpdateManifest | null) => void> = new Set();
  private static progressListeners: Set<(progress: DownloadProgress) => void> = new Set();
  private static downloadedFileUri: string | null = null;

  // ---------------------------------------------------------------------------
  // 1. VERSION UTILITIES & SEMVER COMPARISON
  // ---------------------------------------------------------------------------
  static getInstalledVersion(): string {
    const envVersion = (import.meta as any).env?.VITE_ANDROID_APP_VERSION;
    if (envVersion && typeof envVersion === 'string') {
      return envVersion.replace(/^v/, '');
    }
    return '1.0.1';
  }

  static isAndroidPlatform(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        return true;
      }
    } catch {}
    const ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
    return ua.includes('android');
  }

  static isNativeCapacitor(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  static semverCompare(v1: string, v2: string): number {
    const clean1 = v1.replace(/^v/, '').split('-')[0].trim();
    const clean2 = v2.replace(/^v/, '').split('-')[0].trim();

    const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
    const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

    const len = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < len; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  static isUpdateAvailable(manifest: AppUpdateManifest): boolean {
    const installed = this.getInstalledVersion();
    return this.semverCompare(manifest.latestVersion, installed) > 0;
  }

  static isMandatoryUpdate(manifest: AppUpdateManifest): boolean {
    if (manifest.isMandatory) return true;
    if (manifest.minSupportedVersion) {
      const installed = this.getInstalledVersion();
      return this.semverCompare(manifest.minSupportedVersion, installed) > 0;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // 2. STATUS SUBSCRIBERS
  // ---------------------------------------------------------------------------
  static subscribe(listener: (status: UpdateCheckStatus, manifest?: AppUpdateManifest | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.status, this.cachedManifest);
    return () => this.listeners.delete(listener);
  }

  static subscribeProgress(listener: (progress: DownloadProgress) => void): () => void {
    this.progressListeners.add(listener);
    if (this.progress) listener(this.progress);
    return () => this.progressListeners.delete(listener);
  }

  private static notifyStatus(status: UpdateCheckStatus, manifest?: AppUpdateManifest | null) {
    this.status = status;
    this.listeners.forEach(fn => fn(status, manifest || this.cachedManifest));
  }

  private static notifyProgress(progress: DownloadProgress) {
    this.progress = progress;
    this.progressListeners.forEach(fn => fn(progress));
  }

  // ---------------------------------------------------------------------------
  // 3. MANIFEST FETCHING & AUTOMATIC CHECK
  // ---------------------------------------------------------------------------
  static async checkForUpdates(force = false): Promise<{ isAvailable: boolean; manifest: AppUpdateManifest | null }> {
    if (!force) {
      // Check rate-limiting cache (don't query server more than once every 2 hours unless forced)
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      if (lastCheck) {
        const timeDiff = Date.now() - parseInt(lastCheck, 10);
        if (timeDiff < CHECK_INTERVAL_MS) {
          const cached = localStorage.getItem(CACHED_MANIFEST_KEY);
          if (cached) {
            try {
              const parsed: AppUpdateManifest = JSON.parse(cached);
              this.cachedManifest = parsed;
              const available = this.isUpdateAvailable(parsed);
              this.notifyStatus(available ? 'update-available' : 'up-to-date', parsed);
              return { isAvailable: available, manifest: parsed };
            } catch {}
          }
        }
      }
    }

    this.notifyStatus('checking');

    let manifest: AppUpdateManifest | null = null;
    let fetchError: Error | null = null;

    // Try canonical manifest URLs in priority order
    for (const url of MANIFEST_URLS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          cache: 'no-cache',
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();

          // Check if GitHub Release API format vs FNI Manifest format
          if (data.tag_name && Array.isArray(data.assets)) {
            const apkAsset = data.assets.find((a: any) => a.name === 'FNI-Cells-Connect-Android.apk' || a.name.endsWith('.apk'));
            if (apkAsset) {
              const versionStr = data.tag_name.replace(/^v/, '');
              manifest = {
                appId: 'com.forerunnersnetwork.fnicellsconnect',
                appName: 'FNI Cells Connect',
                latestVersion: versionStr,
                versionCode: 1000000,
                releaseDate: data.published_at || new Date().toISOString(),
                apkUrl: apkAsset.browser_download_url,
                apkSize: apkAsset.size ? `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB` : '14.8 MB',
                releaseNotes: data.body
                  ? data.body.split('\n').map((line: string) => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
                  : ['Latest FNI Cells Connect Android release with performance and calling enhancements.'],
              };
            }
          } else if (data.latestVersion && data.apkUrl) {
            manifest = data as AppUpdateManifest;
          }

          if (manifest) break;
        }
      } catch (err: any) {
        fetchError = err;
      }
    }

    if (!manifest) {
      this.notifyStatus('error', null);
      if (fetchError) console.warn('FNI update check failed across endpoints:', fetchError);
      return { isAvailable: false, manifest: null };
    }

    this.cachedManifest = manifest;
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
    localStorage.setItem(CACHED_MANIFEST_KEY, JSON.stringify(manifest));

    const isAvailable = this.isUpdateAvailable(manifest);
    this.notifyStatus(isAvailable ? 'update-available' : 'up-to-date', manifest);

    return { isAvailable, manifest };
  }

  // ---------------------------------------------------------------------------
  // 4. CALL & SUBMISSION GUARDS (NEVER INTERRUPT IN-PROGRESS MINISTERIAL WORK)
  // ---------------------------------------------------------------------------
  static isInterruptionSafe(): boolean {
    if (typeof window === 'undefined') return true;
    // Check global call flags set by ActiveVideoCallModal / ActiveVoiceCallModal
    if ((window as any).__fni_call_active) return false;
    // Check if user is currently composing or submitting reports
    if (document.querySelector('[data-fni-submitting="true"]')) return false;
    return true;
  }

  // Check if user previously dismissed this specific release with Remind Me Later
  static isDismissed(version: string): boolean {
    try {
      const dismissed = localStorage.getItem(`${REMIND_LATER_PREFIX}${version}`);
      if (!dismissed) return false;
      const timeDiff = Date.now() - parseInt(dismissed, 10);
      return timeDiff < REMIND_LATER_COOLDOWN_MS;
    } catch {
      return false;
    }
  }

  static dismissUpdate(version: string) {
    try {
      localStorage.setItem(`${REMIND_LATER_PREFIX}${version}`, Date.now().toString());
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // 5. DOWNLOAD APK WITH REAL-TIME PROGRESS & INTEGRITY VERIFICATION
  // ---------------------------------------------------------------------------
  static async downloadAndInstall(
    manifest: AppUpdateManifest,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    this.notifyStatus('downloading');
    this.notifyProgress({ percent: 0, loadedBytes: 0, totalBytes: 0 });

    try {
      // 1. Fetch APK stream
      const response = await fetch(manifest.apkUrl, {
        headers: { Accept: 'application/vnd.android.package-archive' },
      });

      if (!response.ok || !response.body) {
        throw new Error(`Download failed with server status ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 15_000_000;
      let loadedBytes = 0;

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedBytes += value.length;
          const percent = totalBytes > 0 ? Math.min(Math.round((loadedBytes / totalBytes) * 100), 99) : 50;
          const progressObj: DownloadProgress = { percent, loadedBytes, totalBytes };
          this.notifyProgress(progressObj);
          onProgress?.(progressObj);
        }
      }

      // Merge chunks into complete binary buffer
      const completeBuffer = new Uint8Array(loadedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        completeBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      this.notifyProgress({ percent: 100, loadedBytes, totalBytes });
      this.notifyStatus('verifying');

      // 2. Verify APK Magic Bytes (ZIP / APK header: PK\x03\x04 -> 0x50, 0x4B, 0x03, 0x04)
      if (
        completeBuffer.length < 4 ||
        completeBuffer[0] !== 0x50 ||
        completeBuffer[1] !== 0x4b ||
        completeBuffer[2] !== 0x03 ||
        completeBuffer[3] !== 0x04
      ) {
        throw new Error('Downloaded file failed APK integrity check: Invalid package archive header.');
      }

      // 3. Verify SHA-256 Checksum if provided in manifest
      if (manifest.sha256 && manifest.sha256.trim().length === 64) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', completeBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();

        if (computedHash !== manifest.sha256.trim().toLowerCase()) {
          throw new Error(
            `SHA-256 integrity mismatch. Expected ${manifest.sha256.slice(0, 12)}... but got ${computedHash.slice(0, 12)}...`
          );
        }
      }

      // 4. Save to Local Storage / Filesystem
      const filename = `FNI-Cells-Connect-v${manifest.latestVersion}.apk`;

      if (this.isNativeCapacitor()) {
        try {
          // Convert to base64 in chunks to prevent stack overflow
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < completeBuffer.length; i += chunkSize) {
            const sub = completeBuffer.subarray(i, Math.min(i + chunkSize, completeBuffer.length));
            binary += String.fromCharCode.apply(null, sub as unknown as number[]);
          }
          const base64Data = btoa(binary);

          const savedFile = await Filesystem.writeFile({
            path: `Download/${filename}`,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });

          this.downloadedFileUri = savedFile.uri;
        } catch (fsErr) {
          console.warn('Filesystem write warning:', fsErr);
        }
      }

      this.notifyStatus('ready-to-install');

      // 5. Trigger Android Package Installation
      await this.launchPackageInstaller(manifest.apkUrl, filename);
    } catch (err: any) {
      console.error('APK update error:', err);
      this.notifyStatus('download-failed');
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. LAUNCH ANDROID PACKAGE INSTALLER
  // ---------------------------------------------------------------------------
  static async launchPackageInstaller(fallbackUrl: string, filename?: string) {
    if (this.isNativeCapacitor() && this.downloadedFileUri) {
      try {
        await Share.share({
          title: 'Install FNI Cells Connect Update',
          text: 'Open with Package Installer to complete update.',
          url: this.downloadedFileUri,
          dialogTitle: 'Install FNI Cells Connect Update',
        });
        return;
      } catch (shareErr) {
        console.warn('Share intent fallback:', shareErr);
      }
    }

    // Direct Browser / Intent download fallback (Android system handles .apk directly)
    if (typeof window !== 'undefined') {
      window.open(fallbackUrl, '_system');
    }
  }

  static getStatus(): UpdateCheckStatus {
    return this.status;
  }

  static getCachedManifest(): AppUpdateManifest | null {
    return this.cachedManifest;
  }
}
