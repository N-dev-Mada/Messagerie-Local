'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker after window load for optimal initial rendering
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          if (registration.installing) {
            console.log('[PWA] Service Worker en cours d\'installation');
          } else if (registration.active) {
            console.log('[PWA] Service Worker actif');
          }
        } catch (error) {
          console.error('[PWA] Échec de l\'enregistrement du Service Worker:', error);
        }
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}
