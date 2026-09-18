'use client';

import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

interface ConnectionStatusBadgeProps {
  status: ConnectionState;
  onReconnect?: () => void;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  status,
  onReconnect,
}) => {
  if (status === 'connected') {
    return (
      <div
        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
        title="Serveur connecté en temps réel (SSE actif)"
      >
        <span className="w-2 h-2 rounded-full bg-[#00a884]"></span>
        <span className="hidden sm:inline">Connecté</span>
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <div
        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs animate-pulse"
        title="Tentative de rétablissement du flux temps réel..."
      >
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        <span className="hidden sm:inline">Reconnexion...</span>
        <span className="sm:hidden">Reconnexion</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onReconnect}
      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs hover:bg-rose-100 transition cursor-pointer"
      title="Réseau déconnecté. Cliquez pour retenter la connexion"
    >
      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
      <span className="hidden sm:inline">Hors-ligne</span>
      <span className="sm:hidden">Hors-ligne</span>
      {onReconnect && <RefreshCw className="w-3 h-3 ml-0.5 text-rose-500" />}
    </button>
  );
};
