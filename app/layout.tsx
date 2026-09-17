import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Messagerie Local',
  description:
    'Application de messagerie web locale et temps réel inspirée de WhatsApp, avec conversations privées, groupes, partage de fichiers et indicateurs de présence.',
  openGraph: {
    title: 'Messagerie Local',
    description:
      'Application de messagerie web locale et temps réel inspirée de WhatsApp, avec conversations privées, groupes, partage de fichiers et indicateurs de présence.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen bg-[#f0f2f5] text-gray-900">
        {children}
      </body>
    </html>
  );
}
