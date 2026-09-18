'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#008069] text-white hover:bg-[#00a884] transition shadow-xs cursor-pointer"
        title="Installer Messagerie Local sur cet appareil"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installer l'app</span>
        <span className="sm:hidden">Installer</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-[#008069] border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
          title="Installer sur iPhone / iPad"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Installer (iOS)</span>
          <span className="sm:hidden">PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#008069] flex items-center justify-center mb-4">
                <Download className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-gray-900">Installer sur iPhone / iPad</h3>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                Profitez d'une expérience plein écran native, de l'accès hors-ligne et des notifications :
              </p>

              <ol className="mt-3 space-y-2.5 text-xs text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>Appuyez sur le bouton <strong>Partager</strong> <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> dans Safari.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-gray-700" />.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">3</span>
                  <span>Touchez <strong>Ajouter</strong> en haut à droite.</span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#008069] py-2.5 text-xs font-bold text-white hover:bg-[#00a884] transition"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
