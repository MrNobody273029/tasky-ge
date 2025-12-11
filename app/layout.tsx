import type { Metadata } from 'next';
import './globals.css';
import CyberBG from '@/components/CyberBG';
import DebugEvents from '@/components/DebugEvents';
import PWARegister from '@/components/PWARegister';

export const metadata: Metadata = {
  title: { default: 'Tasky.ge', template: '%s • Tasky.ge' },
  description: 'Find tasks. Do the work. Get paid.',
  manifest: '/manifest.webmanifest',
  themeColor: '#020617',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className="dark">
      <body className="bg-black">
        {/* PWA service worker რეგისტრაცია */}
        <PWARegister />

        {/* CyberBG დაბრუნებულია (გასწორებული ვერსია) */}
        <CyberBG />
        {/* გლობალური ლოგერი */}
        <DebugEvents />
        {children}
      </body>
    </html>
  );
}
