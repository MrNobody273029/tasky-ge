// src/components/TopTabs.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ka from '../../messages/ka.json';
import en from '../../messages/en.json';

export default function TopTabs({
  base,
  logoutLabel,
}: {
  base: string;
  logoutLabel: string;
}) {
  const p = usePathname();
  const router = useRouter();

  // locale "/ka/mypage" -> "ka"
  const locale = (base.split('/').filter(Boolean)[0] ?? 'en') as 'ka' | 'en';
  const m: any = locale === 'ka' ? ka : en;

  /* ---------- Audio unlock + preload ---------- */
  const [canSound, setCanSound] = useState<boolean>(
    !!(navigator as any).userActivation?.hasBeenActive
  );
  useEffect(() => {
    const unlock = () => setCanSound(true);
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  const tabSfxRef = useRef<HTMLAudioElement | null>(null); // /sfx/mypage.mp3
  const logoutSfxRef = useRef<HTMLAudioElement | null>(null); // /sfx/logout.mp3

  useEffect(() => {
    const tab = new Audio('/sfx/mypage.mp3');
    tab.preload = 'auto';
    tab.volume = 0.55;
    tab.load();
    tabSfxRef.current = tab;

    const out = new Audio('/sfx/logout.mp3');
    out.preload = 'auto';
    out.volume = 0.6;
    out.load();
    logoutSfxRef.current = out;
  }, []);

  const playSafe = (a?: HTMLAudioElement | null) => {
    if (!a || !canSound) return;
    try {
      a.currentTime = 0;
      a.play()?.catch((e) =>
        console.warn('Audio play blocked:', e?.name || e, e?.message || '')
      );
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  const playTab = () => playSafe(tabSfxRef.current);
  const playLogout = () => playSafe(logoutSfxRef.current);

  /* ---------- Requests notification badge ---------- */

  const [reqCount, setReqCount] = useState(0);
  const REQ_API = '/api/applications?incoming=1&exclusive=1';
  const SEEN_PREFIX = 'tasky:reqSeen:';

  const isReqSeen = (id: string): boolean => {
    try {
      return !!localStorage.getItem(SEEN_PREFIX + id);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let stop = false;

    async function load() {
      try {
        const r = await fetch(REQ_API, { cache: 'no-store' });
        if (!r.ok) throw new Error('req_fail');
        const j = await r.json();
        const arr: any[] = Array.isArray(j?.items) ? j.items : [];

        let count = 0;
        for (const it of arr) {
          const id = String(it?.id || '');
          const status = String(it?.status || '');
          // ვთვლით მხოლოდ PENDING მოთხოვნებს, რომლებზეც ჯერ „seen“ არ გვიდევს
          if (id && status === 'PENDING' && !isReqSeen(id)) {
            count++;
          }
        }

        if (!stop) setReqCount(count);
      } catch {
        if (!stop) setReqCount(0);
      }
    }

    const refetch = () => {
      load().catch(() => {});
    };

    // პირველად ჩატვირთვა
    refetch();

    // პერიოდული პოლინგი
    const id = window.setInterval(refetch, 30000);

    // ფოკუსზე და ჩვენი custom event-ზე გადატვირთვა
    window.addEventListener('focus', refetch);
    window.addEventListener('requests-updated', refetch as EventListener);

    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener('focus', refetch);
      window.removeEventListener('requests-updated', refetch as EventListener);
    };
  }, [base]); // base იცვლება როცა locale ან root იცვლება

  /* ---------- Tabs ---------- */

  const left = [
    {
      key: 'created',
      href: `${base}/created?tab=published`,
      label: m.mypage.tabs.created,
    },
    { key: 'taken', href: `${base}/taken`, label: m.mypage.tabs.taken },
    { key: 'balance', href: `${base}/balance`, label: m.mypage.tabs.balance },
    {
      key: 'requests',
      href: `${base}/requests`,
      label:
        m?.mypage?.tabs?.requests ??
        (locale === 'ka' ? 'მოთხოვნები' : 'Requests'),
    },
    {
      key: 'proofs',
      href: `${base}/proofs`,
      label:
        m?.mypage?.tabs?.proofs ??
        (locale === 'ka' ? 'მტკიცებულებები' : 'Evidence'),
    },
    { key: 'settings', href: `${base}/settings`, label: m.mypage.tabs.settings },
  ];

  const renderLink = (it: { href: string; label: string; key: string }) => {
    // pathname-ს არ აქვს query, ამიტომ შევადაროთ href-ის path-ნაწილს
    const hrefPath = it.href.split('?')[0];
    const active = p.startsWith(hrefPath);

    // აქტიური ტაბი — ზუსტად ძველი სტილით
if (active) {
  return (
    <Link
      key={it.href}
      href={it.href}
      onClick={playTab}
      className="btn-tab-active text-sm"
    >
      <span className="inline-flex items-center gap-1">
        <span>{it.label}</span>
        {it.key === 'requests' && reqCount > 0 && (
          <span
            className="
              ml-1 min-w-[18px] h-[18px] px-1
              rounded-full bg-red-500 text-white text-[11px] leading-[18px]
              text-center font-bold
                "
              >
                {reqCount > 99 ? '99+' : reqCount}
              </span>
            )}
          </span>
        </Link>
      );
    }

    // არააქტიური ტაბი — გამჭვირვალე ჩარჩო + გრადიენტული hover (btn-hero-ghost)
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={playTab}
        className="btn-hero-ghost text-sm"
      >
        <span className="inline-flex items-center gap-1 relative z-[1]">
          <span>{it.label}</span>
          {it.key === 'requests' && reqCount > 0 && (
            <span
              className="
                ml-1 min-w-[18px] h-[18px] px-1
                rounded-full bg-red-500 text-white text-[11px] leading-[18px]
                text-center font-bold
              "
            >
              {reqCount > 99 ? '99+' : reqCount}
            </span>
          )}
        </span>
      </Link>
    );
  };



  const confirmText =
    locale === 'ka' ? 'ნამდვილად გსურს გამოსვლა?' : 'Are you sure you want to log out?';

  const onLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const ok = window.confirm(confirmText);
    if (!ok) return;
    playLogout();
    // მცირე დაყოვნება, რომ ხმა დაიწყოს და მერე წავიდეს redirect
    setTimeout(() => router.push(`${base}/logout`), 120);
  };

  return (
    <div className="sticky top-4 z-30 pl-[var(--nav-offset,0px)]">
      <div className="card px-4 py-2 flex items-center gap-4">
        {left.map(renderLink)}
        <div className="ml-auto" />
        {/* Logout */}
          <Link
            href={`${base}/logout`}
            onClick={onLogoutClick}
            className="btn-logout"
          >
            <span className="inline-flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              {logoutLabel}
            </span>
          </Link>

      </div>
    </div>
  );
}
