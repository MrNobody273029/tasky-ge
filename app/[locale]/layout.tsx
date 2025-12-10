// app/[locale]/layout.tsx
'use client';

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
