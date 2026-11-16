import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

type LatestRelease = {
  tag_name: string;
  name: string;
  html_url: string;
  assets: Array<{ name: string; browser_download_url: string }>;
};

const REPO = 'jk-larbi/FNI-Cells-Connect';
const DISMISSED_KEY = 'fni-dismissed-android-release';

export const LatestAndroidUpdate: React.FC = () => {
  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !/Android/i.test(navigator.userAgent)) return;
    const nativeBridge = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!nativeBridge?.isNativePlatform?.()) return;
    let active = true;
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(response => {
        if (!response.ok) throw new Error('Latest release could not be checked');
        return response.json();
      })
      .then((data: LatestRelease) => {
        if (!active) return;
        const apk = data.assets?.find(asset => asset.name === 'FNI-Cells-Connect-Android.apk');
        if (!apk) return;
        setRelease({ ...data, assets: [apk] });
        setDismissed(window.localStorage.getItem(DISMISSED_KEY) === data.tag_name);
      })
      .catch(error => console.warn('FNI update check failed:', error));
    return () => { active = false; };
  }, []);

  if (!release || dismissed) return null;
  const apk = release.assets[0];

  return (
    <section className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-[#D9E4F2] bg-[#F2F6FC] p-3 sm:mx-6" aria-label="FNI Android update">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#142B4A] text-[#C6A45A]">
        <Smartphone className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold text-[#142B4A]">Latest Android release · {release.tag_name}</p>
        <p className="mt-0.5 text-[11px] text-[#667085]">Download the current release directly. You do not need to install older updates first.</p>
        <a href={apk.browser_download_url} onClick={() => window.localStorage.setItem(DISMISSED_KEY, release.tag_name)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#142B4A] px-3 py-2 text-xs font-bold text-white hover:bg-[#203D63]">
          <Download className="h-3.5 w-3.5" /> Download latest APK
        </a>
        <a href={release.html_url} target="_blank" rel="noreferrer" className="ml-3 text-[11px] font-semibold text-[#315C91] underline">Release notes</a>
      </div>
      <button type="button" onClick={() => { window.localStorage.setItem(DISMISSED_KEY, release.tag_name); setDismissed(true); }} className="self-start rounded-lg p-1.5 text-[#667085] hover:bg-white" aria-label="Dismiss update notice">
        <X className="h-4 w-4" />
      </button>
    </section>
  );
};
