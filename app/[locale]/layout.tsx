// app/[locale]/layout.tsx
'use client';

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
  const pathname = usePathname();

  // ვამოწმებთ: auth გვერდია? (/ka/auth/... ან /en/auth/...)
  const isAuthRoute = pathname?.startsWith(`/${locale}/auth`);

  // ✅ auth გვერდებზე:
  //  - არ გვინდა LeftNav
  //  - არ გვინდა container-page
  //  - არც FloatingChatButton / TaskModalHost
  //  - AudioUnlock-ს უკვე თვითონ auth/layout აკეთებს
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // ✅ დანარჩენი ყველა გვერდი – ძველი layout
  return (
    <>
      {/* 🔊 აუდიოს განბლოკავი */}
      <AudioUnlock />

      <LeftNav locale={locale} />
      <main className="container-page px-6 py-8">{children}</main>

      {/* Task modal host – ერთი ეგზემპლარი მთელ აპში */}
      <TaskModalHost />

      {/* 🔔 ჩატი — ავტორიზებულზე გამოჩნდება */}
      <FloatingChatButton />
    </>
  );
}
