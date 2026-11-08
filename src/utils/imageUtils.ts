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
