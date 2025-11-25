// app/[locale]/admin/layout.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TopTabsAdmin from '@/components/admin/TopTabsAdmin';
import ka from '../../../messages/ka.json';
import en from '../../../messages/en.json';
import type { ReactNode } from 'react';

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: 'ka' | 'en' };
}) {
  const { locale } = params;

  const cookieStore = cookies();
  const uid = cookieStore.get('x-user-id')?.value || '';

  if (!uid) {
    const next = encodeURIComponent(`/${locale}/admin`);
    redirect(`/${locale}/auth/login?next=${next}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, isAdmin: true },
  });

  if (!user || !user.isAdmin) {
    redirect(`/${locale}`);
  }

  const m: any = locale === 'ka' ? ka : en;

  return (
    <div className="space-y-6">
      <TopTabsAdmin
        base={`/${locale}/admin`}
        locale={locale}
        logoutLabel={m.logout}
        labels={{
          users: locale === 'ka' ? 'მომხმარებლები' : 'Users',
          analytics: locale === 'ka' ? 'ანალიტიკა' : 'Analytics',
          disputes: locale === 'ka' ? 'დავები' : 'Disputes',
          system: locale === 'ka' ? 'სისტემა/სეტინგები' : 'System',
        }}
      />
      {children}
    </div>
  );
}
