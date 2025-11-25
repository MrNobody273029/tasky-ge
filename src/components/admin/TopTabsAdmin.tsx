// src/components/admin/TopTabsAdmin.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

type Locale = 'ka' | 'en';

export default function TopTabsAdmin({
  base,
  locale,
  labels,
  logoutLabel,
}: {
  base: string;
  locale: Locale;
  labels: {
    users: string;
    analytics: string;
    disputes: string;
    system: string;
  };
  logoutLabel: string;
}) {
  const pathname = usePathname();

  const tabs = [
    { key: 'users', href: base, label: labels.users },
    { key: 'analytics', href: `${base}/analytics`, label: labels.analytics },
    { key: 'disputes', href: `${base}/disputes`, label: labels.disputes },
    { key: 'system', href: `${base}/system`, label: labels.system },
  ];

  const isActive = (href: string) => {
    // Users tab (base) აქტიურია მხოლოდ ზუსტად /{locale}/admin-ზე
    if (href === base) {
      return pathname === base;
    }

    // დანარჩენ ტაბებზე ნერვიულად ვუშვებთ nested routes-საც
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="card p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={clsx(
              'text-sm',
              isActive(tab.href) ? 'btn-tab-active' : 'btn-hero-ghost'
            )}
          >
            <span className="btn-text">{tab.label}</span>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3 justify-end">
        {/* სურვილისთვის – გადახტომა ჩვეულებრივ პროფილზე
        <Link
          href={`/${locale}/mypage`}
          className="text-xs text-white/60 hover:text-white/80"
        >
          {locale === 'ka' ? 'ჩემი პროფილი' : 'My page'}
        </Link>
*/}
        {/* ის logout სილქი + ეფექტები, რაც უკვე გაქვს .btn-logout კლასში */}
        <Link
          href={`/${locale}/mypage/logout`}
          className="btn-logout"
        >
          <span className="btn-text">{logoutLabel}</span>
        </Link>
      </div>
    </div>
  );
}
