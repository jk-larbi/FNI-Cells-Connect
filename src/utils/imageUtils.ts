// src/utils/imageUtils.ts
// Client-side image crop and compression utility for profile pictures

/**
 * Reads an image file, center-crops it into a square, scales to maxDimension,
 * and returns a compact base64 JPEG data URL suitable for profile pictures.
 */
export async function processProfileImage(
  file: File,
  maxDimension = 320,
  quality = 0.85
): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (PNG, JPG, JPEG, WEBP).');
  }

  // Max raw input size check (15MB)
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image file is too large. Please select a photo under 15MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file from device.'));
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Failed to load image. The file may be corrupted.'));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          // Square center crop coordinates
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          const targetSize = Math.min(minDim, maxDimension);
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original base64 if canvas 2D context is unavailable
            resolve(e.target?.result as string);
            return;
          }

          // Anti-aliasing quality settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          // Export as compressed JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err: any) {
          reject(new Error(err?.message || 'Error processing image'));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Reads an image file, center-crops/scales it into an optimal wide banner aspect ratio (~1200x400),
 * and returns a compact base64 JPEG data URL suitable for profile cover banners.
 */
export async function processBannerImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 450,
  quality = 0.85
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (PNG, JPG, JPEG, WEBP).');
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Banner image is too large. Please select a photo under 20MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file from device.'));
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Failed to load banner image. The file may be corrupted.'));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          // Target 16:6 aspect ratio crop
          const targetAspect = 16 / 6;
          let cropWidth = width;
          let cropHeight = width / targetAspect;

          if (cropHeight > height) {
            cropHeight = height;
            cropWidth = height * targetAspect;
          }

          const startX = (width - cropWidth) / 2;
          const startY = (height - cropHeight) / 2;

          const finalWidth = Math.min(cropWidth, maxWidth);
          const finalHeight = Math.round(finalWidth / targetAspect);

          canvas.width = finalWidth;
          canvas.height = finalHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            img,
            startX,
            startY,
            cropWidth,
            cropHeight,
            0,
            0,
            finalWidth,
            finalHeight
          );

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err: any) {
          reject(new Error(err?.message || 'Error processing banner image'));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Calculates high-contrast foreground text and timestamp colors based on the background color luminance.
 */
export function getContrastingTextColor(hexColor: string): { text: string; time: string } {
  if (!hexColor || !hexColor.startsWith('#')) {
    return { text: '#ffffff', time: 'rgba(255, 255, 255, 0.75)' };
  }
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return { text: '#ffffff', time: 'rgba(255, 255, 255, 0.75)' };
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.65) {
    return { text: '#111827', time: 'rgba(17, 24, 39, 0.65)' };
  }
  return { text: '#ffffff', time: 'rgba(255, 255, 255, 0.75)' };
}
