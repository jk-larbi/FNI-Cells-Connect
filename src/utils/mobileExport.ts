/**
 * Cross-platform CSV export.
 * On phones, prefer the native share sheet so users can save the file to Files,
 * Drive, or another destination. Desktop browsers use a normal Blob download.
 */
export async function exportCsvFile(filename: string, csvContent: string): Promise<void> {
  const content = csvContent.startsWith('\uFEFF') ? csvContent : `\uFEFF${csvContent}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
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
      // A user closing the share sheet is a normal cancellation, not a failure.
      if (error?.name === 'AbortError') return;
      console.warn('Native CSV sharing unavailable; falling back to download:', error);
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

  // Keep the URL alive long enough for Android/iOS download handlers to consume it.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
