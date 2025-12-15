'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import ka from '../../messages/ka.json';
import en from '../../messages/en.json';

/** მინიმალური Me type – ზუსტად რაც აქ გვჭირდება */
type Me = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

function asArray<T = any>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  return [];
}

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

  /* ---------- Audio unlock + preload (no rerender) ---------- */
  const canSoundRef = useRef<boolean>(
    !!(
      typeof navigator !== 'undefined' &&
      (navigator as any).userActivation?.hasBeenActive
    )
  );

  useEffect(() => {
    const unlock = () => {
      canSoundRef.current = true; // ✅ no rerender
    };
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

    return () => {
      try {
        tab.pause();
        out.pause();
      } catch {}
      tabSfxRef.current = null;
      logoutSfxRef.current = null;
    };
  }, []);

  const playSafe = useCallback((a?: HTMLAudioElement | null) => {
    if (!a || !canSoundRef.current) return;
    try {
      a.currentTime = 0;
      a.play()?.catch(() => {});
    } catch {}
  }, []);

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
        const arr = asArray<any>(j);

        let count = 0;
        for (const it of arr) {
          const id = String(it?.id || '');
          const status = String(it?.status || '');
          if (id && status === 'PENDING' && !isReqSeen(id)) count++;
        }

        if (!stop) setReqCount(count);
      } catch {
        if (!stop) setReqCount(0);
      }
    }

    const refetch = () => load().catch(() => {});

    refetch();
    const id = window.setInterval(refetch, 30000);

    window.addEventListener('focus', refetch);
    window.addEventListener('requests-updated', refetch as EventListener);

    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener('focus', refetch);
      window.removeEventListener('requests-updated', refetch as EventListener);
    };
  }, [base]);

  /* ---------- Evidence notification badge (incoming + outgoing + system) ---------- */

  const [evCount, setEvCount] = useState(0);
  const totalCount = reqCount + evCount;

  const EVI_IN_API = '/api/my/evidences?tab=incoming';
  const EVI_OUT_API = '/api/my/evidences?tab=outgoing';

  useEffect(() => {
    let stop = false;

    async function load() {
      try {
        const [rin, rout] = await Promise.all([
          fetch(EVI_IN_API, { cache: 'no-store' }),
          fetch(EVI_OUT_API, { cache: 'no-store' }),
        ]);
        if (!rin.ok || !rout.ok) throw new Error('ev_fail');

        const incoming = asArray<any>(await rin.json());
        const outgoing = asArray<any>(await rout.json());

        let count = 0;

        for (const it of incoming) {
          const status = String(it?.status || '');
          if (status === 'PENDING') count++;

          if (
            (status === 'APPROVED' || status === 'EXPIRED') &&
            it?.clientSystemSeen === false
          )
            count++;

          if (it?.clientSawWorkerReview === false) count++;

          if (status === 'EXPIRED' && it?.clientSawRatingPrompt === false) count++;
        }

        for (const it of outgoing) {
          const status = String(it?.status || '');

          if (
            (status === 'APPROVED' ||
              status === 'NEEDS_FIXES' ||
              status === 'EXPIRED') &&
            it?.workerDecisionSeen === false
          )
            count++;

          if (it?.workerSawClientReview === false) count++;

          if (status === 'EXPIRED' && it?.workerSawRatingPrompt === false) count++;
        }

        if (!stop) setEvCount(count);
      } catch {
        if (!stop) setEvCount(0);
      }
    }

    const refetch = () => load().catch(() => {});

    refetch();
    const id = window.setInterval(refetch, 30000);

    window.addEventListener('focus', refetch);
    window.addEventListener('evidences-updated', refetch as EventListener);

    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener('focus', refetch);
      window.removeEventListener('evidences-updated', refetch as EventListener);
    };
  }, [base]);

  /* ---------- Tabs list ---------- */

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
        m?.mypage?.tabs?.requests ?? (locale === 'ka' ? 'მოთხოვნები' : 'Requests'),
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

  /* ---------- Avatar dropdown ---------- */

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLAnchorElement | null>(null);
  const lastItemRef = useRef<HTMLAnchorElement | null>(null);
  const logoutItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [p]);

  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let alive = true;

    fetch('/api/me', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('fetch_failed');
        return (await r.json()) as Me;
      })
      .then((u) => {
        if (!alive) return;
        setMe({ id: u.id, email: u.email, name: u.name, image: u.image });
      })
      .catch(() => {
        if (!alive) return;
        setMe(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  // open -> focus first item (keyboard-friendly)
  useEffect(() => {
    if (!menuOpen) return;
    const id = window.setTimeout(() => {
      firstItemRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [menuOpen]);

  // outside click + Escape: close + return focus to trigger
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const confirmText =
    locale === 'ka'
      ? 'ნამდვილად გსურს გამოსვლა?'
      : 'Are you sure you want to log out?';

  const onLogoutClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const ok = window.confirm(confirmText);
    if (!ok) return;
    playLogout();
    setTimeout(() => router.push(`${base}/logout`), 120);
  };

  const titleText =
    m?.mypage?.title ?? (locale === 'ka' ? 'ჩემი გვერდი' : 'My page');

  const displayName = me?.name || (me?.email ? me.email.split('@')[0] : 'User');

  const renderMenuLink = (
    it: { href: string; label: string; key: string },
    idx: number,
    total: number
  ) => {
    const hrefPath = it.href.split('?')[0];
    const active = p.startsWith(hrefPath);
    const label = it.label;

    const badge =
      it.key === 'requests' && reqCount > 0 ? (
        <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] leading-[18px] text-center font-bold">
          {reqCount > 99 ? '99+' : reqCount}
        </span>
      ) : it.key === 'proofs' && evCount > 0 ? (
        <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] leading-[18px] text-center font-bold">
          {evCount > 99 ? '99+' : evCount}
        </span>
      ) : null;

    const commonProps = {
      role: 'menuitem' as const,
      tabIndex: -1 as const,
      ref:
        idx === 0
          ? firstItemRef
          : idx === total - 1
            ? lastItemRef
            : undefined,
      onClick: () => {
        playTab();
        setMenuOpen(false);
        triggerRef.current?.focus();
      },
    };

    if (active) {
      return (
        <Link
          key={it.href}
          href={it.href}
          {...commonProps}
          className="btn-tab-active btn-avatar-menu text-sm w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
        >
          <span className="inline-flex items-center gap-1">
            <span>{label}</span>
            {badge}
          </span>
        </Link>
      );
    }

    return (
      <Link
        key={it.href}
        href={it.href}
        {...commonProps}
        className="btn-hero-ghost btn-topbar-solid btn-avatar-menu text-sm w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
        data-text={label}
      >
        <span className="btn-text inline-flex items-center gap-1">
          <span>{label}</span>
          {badge}
        </span>
      </Link>
    );
  };

  return (
    <div className="sticky top-2 z-30 px-2 sm:px-0 sm:pl-[var(--nav-offset,0px)]">
      <div className="card px-3 sm:px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm sm:text-base font-semibold text-white/80">
          {titleText}
        </div>

        <div ref={menuRef} className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="toptabs-menu"
            className={clsx(
              'relative flex items-center gap-2 rounded-full border border-white/20',
              'bg-black/70 px-2 py-1',
              'hover:border-cyan-400 hover:shadow-neon',
              'transition-colors transition-shadow'
            )}
          >
            {totalCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] leading-[18px] text-center font-bold ring-2 ring-black/80">
                {totalCount > 99 ? '99+' : totalCount}
              </span>
            )}

            <span className="shrink-0 relative inline-flex items-center justify-center w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/15 bg-black/60">
              {me?.image ? (
                <img
                  src={me.image}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-5 h-5 text-white/80" />
              )}
            </span>

            <span className="hidden sm:block text-sm font-medium text-white/90 max-w-[120px] truncate">
              {displayName}
            </span>
          </button>

          {menuOpen && (
            <div
              id="toptabs-menu"
              role="menu"
              aria-label="Profile menu"
              className="absolute right-1 sm:right-0 mt-2 w-[min(14rem,calc(100vw-3rem))] sm:w-64 z-40"
              onKeyDown={(e) => {
                const items = Array.from(
                  menuRef.current?.querySelectorAll<HTMLElement>(
                    'a[role="menuitem"], button[role="menuitem"]'
                  ) ?? []
                );

                if (!items.length) return;

                const currentIndex = items.indexOf(
                  document.activeElement as HTMLElement
                );
                const focusAt = (i: number) =>
                  items[Math.max(0, Math.min(items.length - 1, i))]?.focus();

                if (e.key === 'Escape') {
                  e.preventDefault();
                  setMenuOpen(false);
                  triggerRef.current?.focus();
                  return;
                }

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  focusAt(currentIndex < 0 ? 0 : currentIndex + 1);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  focusAt(currentIndex < 0 ? items.length - 1 : currentIndex - 1);
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  focusAt(0);
                } else if (e.key === 'End') {
                  e.preventDefault();
                  focusAt(items.length - 1);
                }
              }}
            >
<div className="card toptabs-menu-panel p-2.5 sm:p-3 flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto shadow-neon">
                {left.map((it, idx) => (
                  <div key={it.href}>{renderMenuLink(it, idx, left.length)}</div>
                ))}

                <div className="pt-2 mt-2 border-t border-white/10" />

                <div className="pt-1">
                  <Link
                    ref={logoutItemRef}
                    role="menuitem"
                    tabIndex={-1}
                    href={`${base}/logout`}
                    onClick={onLogoutClick}
                    className="btn-logout btn-logout-solid w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      {logoutLabel}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
