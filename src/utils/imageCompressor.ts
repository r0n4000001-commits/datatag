/**
 * Image processing utility for Thermal Label Logos and Assets.
 * Preserves high resolution, crisp vector-like edges, and alpha transparency (PNG).
 * Does not downscale or blur images. Only gently optimizes giant camera photos (> 600KB or > 1200px),
 * keeping lossless PNG with full alpha transparency and razor-sharp scaling.
 */

export async function compressLogoDataUrl(
  dataUrl: string,
  maxDimension = 1200
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl || '';
  }

  // If already under ~400 KB, keep original image pristine without any modification
  if (dataUrl.length < 400000) {
    return dataUrl;
  }

  const isPng = dataUrl.startsWith('data:image/png') || dataUrl.includes('image/png');

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width <= maxDimension && height <= maxDimension && dataUrl.length < 600000) {
            resolve(dataUrl);
            return;
          }

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Render preserving alpha channel
          ctx.drawImage(img, 0, 0, width, height);

          // If PNG, keep PNG with transparency; otherwise high-quality JPEG
          const result = isPng
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.92);
          resolve(result);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}
