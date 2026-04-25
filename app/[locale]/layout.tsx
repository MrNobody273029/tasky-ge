// app/[locale]/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LeftNav from '@/components/LeftNav';
import TaskModalHost from '@/components/task/TaskModalHost';
import AudioUnlock from '@/components/AudioUnlock';
import FloatingChatButton from '@/components/chat/FloatingChatButton';

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: 'ka' | 'en' };
}) {
  const isKa = locale === 'ka';
  const pathname = usePathname() || `/${locale}`;
  const other = locale === 'ka' ? 'en' : 'ka';
  const switchHref = pathname.replace(/^\/(ka|en)(?=\/|$)/, `/${other}`) || `/${other}`;

  return (
    <>
      {/* 🔊 აუდიოს განბლოკავი */}
      <AudioUnlock />

      <LeftNav locale={locale} />

      <main className="container-page px-6 py-8">{children}</main>

      {/* Footer */}
      <footer className="container-page px-6 pb-8 pt-2">
        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <span>© {new Date().getFullYear()} Tasky.ge</span>
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/how-it-works`}
              className="hover:text-cyan-400 transition-colors"
            >
              {isKa ? 'როგორ მუშაობს?' : 'How it works?'}
            </Link>
            <Link
              href={`/${locale}/tasky`}
              className="hover:text-cyan-400 transition-colors"
            >
              {isKa ? 'ტასკები' : 'Tasks'}
            </Link>
            <Link
              href={switchHref}
              className="hover:text-cyan-400 transition-colors"
            >
              {isKa ? 'English' : 'ქართული'}
            </Link>
          </div>
        </div>
      </footer>

      {/* Task modal host – ერთი ეგზემპლარი მთელ აპში */}
      <TaskModalHost />

      {/* 🔔 ჩატი — ავტორიზებულზე გამოჩნდება */}
      <FloatingChatButton />
    </>
  );
}
