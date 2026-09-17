'use client';

import React from 'react';
import { X, Download } from 'lucide-react';

interface MediaLightboxModalProps {
  mediaUrl: string | null;
  fileName?: string | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  mediaUrl,
  fileName,
  onClose,
}) => {
  if (!mediaUrl) return null;

  return (
    <div
      id="media-lightbox-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center">
        {/* Top Controls */}
        <div
          className="w-full flex items-center justify-between text-white pb-3 px-2"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-sm font-medium truncate max-w-md">
            {fileName || 'Photo'}
          </span>
          <div className="flex items-center space-x-3">
            <a
              href={mediaUrl}
              download={fileName || 'image.webp'}
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
              title="Télécharger l'image"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Preview */}
        <div
          className="relative max-h-[80vh] overflow-hidden rounded-xl bg-black/40 flex items-center justify-center shadow-2xl border border-white/10"
          onClick={e => e.stopPropagation()}
        >
          <img
            src={mediaUrl}
            alt={fileName || 'Aperçu'}
            className="max-h-[80vh] max-w-full object-contain select-none"
          />
        </div>
      </div>
    </div>
  );
};
