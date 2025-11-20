// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import CyberBG from '@/components/CyberBG';
import DebugEvents from '@/components/DebugEvents';

export const metadata: Metadata = {
  title: { default: 'Tasky.ge', template: '%s • Tasky.ge' },
  description: 'Find tasks. Do the work. Get paid.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className="dark">
      <body className="bg-black">
        {/* CyberBG დაბრუნებულია (გასწორებული ვერსია) */}
        <CyberBG />
        {/* გლობალური ლოგერი */}
        <DebugEvents />
        {children}
      </body>
    </html>
  );
}
