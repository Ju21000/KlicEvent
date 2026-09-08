import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.klicevent.com'),
  title: {
    default: 'KlicEvent — Photobooth instantané et Diaporama Live',
    template: '%s | KlicEvent',
  },
  description:
    'Transformez les smartphones de vos invités en photobooth instantané. Diaporama live en direct sur grand écran sans application à installer.',
  applicationName: 'KlicEvent',
  keywords: [
    'photobooth',
    'diaporama live',
    'photos mariage',
    'photos événement',
    'live photo stream',
    'soirée',
    'anniversaire',
    'qr code photo',
  ],
  authors: [{ name: 'KlicEvent' }],
  creator: 'KlicEvent',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.klicevent.com',
    siteName: 'KlicEvent',
    title: 'KlicEvent — Photobooth instantané et Diaporama Live',
    description:
      'Partagez et diffusez en direct les photos de vos mariages, soirées et séminaires. Vos invités scannent, shootent et profitent du live.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KlicEvent — Photobooth instantané et Diaporama Live',
    description:
      'Les photos de vos événements projetées en direct sur grand écran sans application.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-white">
        {children}
      </body>
    </html>
  );
}