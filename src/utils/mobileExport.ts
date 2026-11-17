/**
 * Cross-platform CSV export.
 * Capacitor Android/iOS uses the native share sheet with a cached file.
 * Mobile browsers use Web Share when supported; desktop uses a Blob download.
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : '';
      if (base64) resolve(base64);
      else reject(new Error('Could not prepare the report file for sharing.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read the report file.'));
    reader.readAsDataURL(blob);
  });
}

export async function exportCsvFile(filename: string, csvContent: string): Promise<void> {
  const content = csvContent.startsWith('\uFEFF') ? csvContent : `\uFEFF${csvContent}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });

  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;

  if (capacitor?.isNativePlatform?.()) {
    try {
      // These plugins are installed and synced by both Android and web build workflows.
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ]);
      const base64 = await blobToBase64(blob);
      const saved = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });
      await Share.share({
        title: filename,
        files: [saved.uri],
        dialogTitle: 'Save or share FNI report',
      });
      return;
    } catch (error) {
      console.warn('Native report sharing failed; trying browser export:', error);
    }
  }

  const file = new File([blob], filename, { type: 'text/csv' });
  const shareNavigator = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (shareNavigator.share && shareNavigator.canShare?.({ files: [file] })) {
    try {
      await shareNavigator.share({ files: [file], title: filename });
      return;
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.warn('Browser file sharing unavailable; falling back to download:', error);
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  link.style.position = 'fixed';
  link.style.left = '-10000px';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
