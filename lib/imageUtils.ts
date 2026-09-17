/**
 * Client-side image compression utility using HTML5 Canvas.
 * Resizes images exceeding maxWidth/maxHeight (default 1920px)
 * and converts to WebP with optimized quality.
 */

export interface CompressedImageResult {
  name: string;
  type: string;
  data: string; // base64 data URL
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image'));
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to decode image'));

      img.onload = () => {
        let { width, height } = img;

        // Calculate proportional scale if dimensions exceed limits
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create canvas with scaled dimensions
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          return reject(new Error('Canvas 2D context unavailable'));
        }

        // Use high quality image interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        let webpDataUrl = '';
        try {
          webpDataUrl = canvas.toDataURL('image/webp', quality);
        } catch {
          // Fallback if browser doesn't support webp export
          webpDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Approximate size of base64
        const head = webpDataUrl.indexOf(',');
        const base64Len = webpDataUrl.length - (head + 1);
        const compressedSize = Math.round((base64Len * 3) / 4);

        // Generate filename with .webp extension
        const originalName = file.name;
        const lastDot = originalName.lastIndexOf('.');
        const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
        const newName = `${baseName}.webp`;

        const reduction = file.size > 0 
          ? Math.max(0, Math.round(((file.size - compressedSize) / file.size) * 100))
          : 0;

        resolve({
          name: newName,
          type: 'image/webp',
          data: webpDataUrl,
          originalSize: file.size,
          compressedSize,
          reductionPercentage: reduction,
          width,
          height,
        });
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human readable string (KB, MB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
