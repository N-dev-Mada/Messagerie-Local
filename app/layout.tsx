import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Messagerie Local',
  description:
    'Application de messagerie web locale et temps réel inspirée de WhatsApp, avec conversations privées, groupes, partage de fichiers et indicateurs de présence.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Messagerie',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Messagerie Local',
    description:
      'Application de messagerie web locale et temps réel inspirée de WhatsApp, avec conversations privées, groupes, partage de fichiers et indicateurs de présence.',
  },
};

export const viewport: Viewport = {
  themeColor: '#008069',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen bg-[#f0f2f5] text-gray-900">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
