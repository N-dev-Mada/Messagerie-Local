import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Directory to store uploaded files
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface StoredFileResult {
  filePath: string; // Relative web URL: /uploads/xxx.ext
  fileType: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * Saves a base64 encoded data URI or raw base64 string directly to disk
 * in /public/uploads/, returning the public URL and metadata.
 * If data is already a relative URL (e.g. /uploads/...), returns it directly.
 */
export function saveBase64Media(
  base64Data: string,
  declaredType?: string | null,
  originalName?: string | null
): StoredFileResult {
  // If already a hosted URL path, return as is
  if (base64Data.startsWith('/uploads/') || base64Data.startsWith('http')) {
    return {
      filePath: base64Data,
      fileType: declaredType || 'application/octet-stream',
      fileName: originalName || 'file',
      sizeBytes: 0,
    };
  }

  let mimeType = declaredType || 'application/octet-stream';
  let rawBase64 = base64Data;

  // Handle data URI format (e.g., data:image/webp;base64,....)
  const matches = base64Data.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
  if (matches) {
    mimeType = matches[1];
    rawBase64 = matches[2];
  }

  const buffer = Buffer.from(rawBase64, 'base64');
  const hash = crypto.randomBytes(12).toString('hex');
  const ext = getExtensionFromMime(mimeType, originalName);
  const safeBaseName = originalName
    ? path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)
    : 'file';

  const fileName = `${Date.now()}_${safeBaseName}_${hash}${ext}`;
  const diskPath = path.join(UPLOADS_DIR, fileName);

  fs.writeFileSync(diskPath, buffer);

  return {
    filePath: `/uploads/${fileName}`,
    fileType: mimeType,
    fileName: originalName || fileName,
    sizeBytes: buffer.length,
  };
}

function getExtensionFromMime(mime: string, originalName?: string | null): string {
  if (originalName) {
    const ext = path.extname(originalName);
    if (ext && ext.length <= 6) return ext.toLowerCase();
  }

  const map: Record<string, string> = {
    'image/webp': '.webp',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/wav': '.wav',
    'video/webm': '.webm',
    'video/mp4': '.mp4',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
  };

  return map[mime] || '.bin';
}
