'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  QrCode,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  X,
  RefreshCw,
  Laptop,
  HelpCircle,
} from 'lucide-react';

interface NetworkInterfaceInfo {
  address: string;
  family: string;
  interfaceName: string;
  isPrivate: boolean;
  url: string;
}

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileConnectModal({ isOpen, onClose }: MobileConnectModalProps) {
  const [loading, setLoading] = useState(false);
  const [localIps, setLocalIps] = useState<NetworkInterfaceInfo[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [customIp, setCustomIp] = useState<string>('');
  const [useCustomIp, setUseCustomIp] = useState(false);
  const [useHttps, setUseHttps] = useState(false);
  const [port, setPort] = useState<string>('3000');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showHttpsGuide, setShowHttpsGuide] = useState(false);

  const fetchNetworkInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const data = await res.json();
        setLocalIps(data.localIps || []);
        if (data.port) setPort(data.port);
        if (data.protocol === 'https') setUseHttps(true);

        // Pick best private IP (192.168.X or 10.X)
        const primary = data.localIps?.find((i: NetworkInterfaceInfo) => i.address.startsWith('192.168.')) ||
                        data.localIps?.find((i: NetworkInterfaceInfo) => i.isPrivate) ||
                        data.localIps?.[0];

        if (primary) {
          setSelectedIp(primary.address);
        } else if (typeof window !== 'undefined') {
          setSelectedIp(window.location.hostname);
        }
      }
    } catch (err) {
      console.error('Failed to fetch network info:', err);
      if (typeof window !== 'undefined') {
        setSelectedIp(window.location.hostname);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNetworkInfo();
    }
  }, [isOpen]);

  // Compute active target URL
  const activeIp = useCustomIp ? customIp.trim() : selectedIp;
  const protocol = useHttps ? 'https' : 'http';
  const effectivePort = port && port !== '80' && port !== '443' ? `:${port}` : '';
  const currentTargetUrl = activeIp ? `${protocol}://${activeIp}${effectivePort}` : '';

  // Generate QR Code when URL changes
  useEffect(() => {
    if (!currentTargetUrl) return;

    QRCode.toDataURL(currentTargetUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f3a2f', // Dark WhatsApp emerald tint
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => {
        setQrCodeDataUrl(url);
      })
      .catch(err => {
        console.error('Failed to generate QR Code:', err);
      });
  }, [currentTargetUrl]);

  const handleCopy = async () => {
    if (!currentTargetUrl) return;
    try {
      await navigator.clipboard.writeText(currentTargetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-[#008069] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Se connecter depuis un smartphone</h2>
              <p className="text-xs text-emerald-100 mt-0.5">Accès sans fil sur le réseau local Wi-Fi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white/80 hover:text-white cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Instructions banner */}
          <div className="flex items-start space-x-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 text-xs text-emerald-950">
            <Wifi className="w-5 h-5 text-[#008069] flex-shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-semibold text-emerald-900">Étape 1 : Même réseau Wi-Fi</p>
              <p className="text-gray-700">
                Assurez-vous que votre smartphone et cet ordinateur sont connectés à la même box ou au même point d'accès Wi-Fi.
              </p>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
            {qrCodeDataUrl ? (
              <div className="relative group">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code de connexion mobile"
                  className="w-52 h-52 object-contain rounded-lg shadow-sm border border-gray-200 bg-white p-2"
                />
                <div className="text-center mt-2 flex items-center justify-center space-x-1 text-xs text-gray-500 font-medium">
                  <QrCode className="w-3.5 h-3.5 text-[#008069]" />
                  <span>Scannez avec l'appareil photo du téléphone</span>
                </div>
              </div>
            ) : (
              <div className="w-52 h-52 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-xs">
                {loading ? 'Génération du QR Code...' : 'Adresse IP non disponible'}
              </div>
            )}

            {/* Direct URL display with Copy button */}
            <div className="mt-3 w-full max-w-sm">
              <div className="flex items-center space-x-1.5 bg-white border border-gray-300 rounded-lg p-1.5 shadow-2xs">
                <input
                  type="text"
                  readOnly
                  value={currentTargetUrl}
                  className="flex-1 text-xs font-mono text-gray-800 bg-transparent px-2 py-1 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Copier le lien d'accès"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
                <a
                  href={currentTargetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-gray-100 rounded-md transition"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Network Selection / IP selector */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-700 font-semibold">
              <span className="flex items-center space-x-1">
                <Laptop className="w-3.5 h-3.5 text-gray-500" />
                <span>Adresse IP réseau détectée</span>
              </span>
              <button
                type="button"
                onClick={fetchNetworkInfo}
                disabled={loading}
                className="text-[#008069] hover:underline flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>

            {localIps.length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5">
                {localIps.map(iface => (
                  <label
                    key={`${iface.interfaceName}-${iface.address}`}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                      !useCustomIp && selectedIp === iface.address
                        ? 'border-[#008069] bg-emerald-50/70 text-emerald-950 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="network-ip"
                        checked={!useCustomIp && selectedIp === iface.address}
                        onChange={() => {
                          setSelectedIp(iface.address);
                          setUseCustomIp(false);
                        }}
                        className="text-[#008069] focus:ring-[#008069]"
                      />
                      <span className="font-mono text-xs font-semibold">{iface.address}</span>
                      <span className="text-[10px] text-gray-500 bg-gray-200/60 px-1.5 py-0.5 rounded">
                        {iface.interfaceName}
                      </span>
                    </div>
                    {iface.isPrivate && (
                      <span className="text-[10px] text-emerald-700 font-medium">Wi-Fi / LAN</span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Aucune interface réseau locale distincte détectée.</p>
            )}

            {/* Custom IP option */}
            <div className="pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomIp}
                  onChange={e => setUseCustomIp(e.target.checked)}
                  className="rounded text-[#008069] focus:ring-[#008069]"
                />
                <span className="text-gray-600">Saisir une adresse IP manuellement (ex: 192.168.1.50)</span>
              </label>

              {useCustomIp && (
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="ex: 192.168.1.25"
                    value={customIp}
                    onChange={e => setCustomIp(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:border-[#008069] focus:ring-1 focus:ring-[#008069] outline-none"
                  />
                  <input
                    type="text"
                    placeholder="3000"
                    value={port}
                    onChange={e => setPort(e.target.value)}
                    className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:border-[#008069] focus:ring-1 focus:ring-[#008069] outline-none"
                    title="Port"
                  />
                </div>
              )}
            </div>
          </div>

          {/* HTTPS & Mobile Permissions Notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 font-semibold text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Microphone & Notifications sur Mobile (HTTPS)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHttpsGuide(prev => !prev)}
                className="text-amber-800 hover:underline flex items-center space-x-1 cursor-pointer text-[11px] font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHttpsGuide ? 'Masquer le guide' : 'Instructions'}</span>
              </button>
            </div>

            <p className="text-amber-800 leading-relaxed text-[11px]">
              Sur mobile, Safari (iOS) et Chrome (Android) bloquent l'enregistrement du micro et les alertes web en HTTP non sécurisé.
            </p>

            {/* Protocol toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-gray-700 font-medium text-[11px]">Protocole du QR Code :</span>
              <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-amber-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUseHttps(false)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
                    !useHttps ? 'bg-amber-600 text-white font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  HTTP
                </button>
                <button
                  type="button"
                  onClick={() => setUseHttps(true)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
                    useHttps ? 'bg-[#008069] text-white font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  HTTPS 🔒
                </button>
              </div>
            </div>

            {/* Collapsible Guide */}
            {showHttpsGuide && (
              <div className="mt-2 pt-2 border-t border-amber-200/80 space-y-2 text-[11px] text-gray-800">
                <p className="font-bold text-gray-900">Comment démarrer en HTTPS local ?</p>
                <div className="bg-white p-2 rounded-lg border border-gray-200 font-mono text-[10px] text-gray-800 select-all">
                  npm run dev:https
                </div>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Lancez la commande ci-dessus dans votre terminal.</li>
                  <li>Basculez le protocole ci-dessus sur <strong>HTTPS</strong>.</li>
                  <li>
                    Lors du premier accès sur mobile, acceptez le certificat auto-signé (Paramètres avancés → Poursuivre vers le site).
                  </li>
                </ol>
                <p className="text-gray-500 text-[10px]">
                  Un guide complet est disponible dans <code className="text-gray-700 font-bold">HTTPS_LOCAL_GUIDE.md</code>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#008069] hover:bg-[#006e5a] text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileConnectModal;
