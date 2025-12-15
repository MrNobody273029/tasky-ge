// app/[locale]/mypage/layout.tsx  (SERVER component, guard + tabs)
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TopTabs from '@/components/TopTabs';
import { prisma } from '@/lib/prisma';
import ka from '../../../messages/ka.json';
import en from '../../../messages/en.json';

export default async function MyPageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: 'ka' | 'en' };
}) {
  const { locale } = params;

  // ✅ very small server-side guard: if no auth cookie → redirect to login
  const c = cookies();
  const uid =
    c.get('x-user-id')?.value ||
    c.get('uid')?.value ||
    ''; // add other cookie keys here if needed

  if (!uid) {
    // after login, send user back to /{locale}/mypage
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/mypage`)}`);
  }

  const m: any = locale === 'ka' ? ka : en;
  const me = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  });

  if (!me) {
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/mypage`)}`);
  }

  return (
    <div className="space-y-6">
<TopTabs base={`/${locale}/mypage`} logoutLabel={m.logout} initialMe={me} />
      {children}
    </div>
  );
}
