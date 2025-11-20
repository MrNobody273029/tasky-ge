// src/components/LeftNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Menu, Home, ListChecks, User, Globe, LogIn } from 'lucide-react';

export default function LeftNav({ locale }: { locale: 'ka' | 'en' }) {
  const pathname = usePathname();

  /* ---------- Auth state ---------- */
  const [authed, setAuthed] = useState(false);

  // რბილი ქუქჰელფერი (httpOnly-ს ვერ წაიკითხავს და ესეც ठीकაა)
  const hasCookie = (name: string) => {
    try {
      return document.cookie
        .split(';')
        .some((c) => {
          const [k, v = ''] = c.trim().split('=');
          return k === name && v.length > 0;
        });
    } catch {
      return false;
    }
  };

  // ერთიანი შემმოწმებელი — LS ან ქუქი რომ იგრძნოს
const checkAuth = useCallback(() => {
  try {
    const logged =
      !!localStorage.getItem('auth') ||
      !!localStorage.getItem('token') ||
      !!localStorage.getItem('uid') ||
      hasCookie('x-user-id') ||
      hasCookie('uid'); // ← ყურადღება: 'email' აქ აღარ არის
    setAuthed(logged);
  } catch {
    setAuthed(false);
  }
}, []);


  // listeners: storage/focus/visibility + custom 'auth-change'
  useEffect(() => {
    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('focus', checkAuth);
    document.addEventListener('visibilitychange', checkAuth);
    window.addEventListener('auth-change', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('focus', checkAuth);
      document.removeEventListener('visibilitychange', checkAuth);
      window.removeEventListener('auth-change', checkAuth);
    };
  }, [checkAuth]);

  // გზის შეცვლაზეც ერთხელ ჩავხედოთ
  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  /* ---------- Audio unlock + preload ---------- */
  const [canSound, setCanSound] = useState<boolean>(() => {
    return !!(navigator as any).userActivation?.hasBeenActive;
  });

  useEffect(() => {
    const unlock = () => setCanSound(true);
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  const hoverRef = useRef<HTMLAudioElement | null>(null); // /sfx/menu.mp3
  const navRef   = useRef<HTMLAudioElement | null>(null); // /sfx/nav.mp3

  useEffect(() => {
    const h = new Audio('/sfx/menu.mp3');
    h.preload = 'auto';
    h.volume = 0.6;
    h.load();
    hoverRef.current = h;

    const n = new Audio('/sfx/nav.mp3');
    n.preload = 'auto';
    n.volume = 0.55;
    n.load();
    navRef.current = n;
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

  const playHover = () => playSafe(hoverRef.current);
  const playNav   = () => playSafe(navRef.current);

  /* ---------- Routing helpers ---------- */
  const normalize = (p: string) => (p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p);
  const path = normalize(pathname);
  const base = `/${locale}`;
  const isActive = (href: string) => {
    const h = normalize(href);
    if (h === base) return path === base;
    return path.startsWith(h);
  };

  const other = locale === 'ka' ? 'en' : 'ka';
  const switchLocaleHref =
    pathname.replace(/^\/(ka|en)(?=\/|$)/, `/${other}`) || `/${other}`;

  /* ---------- Nav items ---------- */
  const profileOrLogin = authed
    ? { href: `/${locale}/mypage`, icon: User,  key: 'mypage' }
    : { href: `/${locale}/auth/login`, icon: LogIn, key: 'login' };

  const links = [
    { href: `/${locale}`,        icon: Home,       key: 'home'  },
    { href: `/${locale}/tasky`,  icon: ListChecks, key: 'tasky' },
    profileOrLogin,
  ];

const IconBtn = ({
  href,
  Icon,
  active,
}: {
  href: string;
  Icon: any;
  active: boolean;
}) => (
  <Link
    href={href}
    onClick={playNav}
    className={clsx(
      'leftnav-item',
      active ? 'leftnav-item--active' : 'leftnav-item--idle'
    )}
    aria-label="nav-item"
  >
    <Icon className="w-5 h-5 leftnav-icon" />
  </Link>
);

  return (
    <div className="group/nav fixed left-3 top-1/2 -translate-y-1/2 z-40">
      {/* ჰამბურგერი – collapsed; hover-ზე იძლევა ხმას მხოლოდ unlock-ის შემდეგ */}
      <button
        aria-label="open-nav"
        onPointerDown={playHover}
        onMouseEnter={playHover}
        className="relative z-10 flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 text-white/90 shadow-sm
                   transition-opacity duration-500 ease-out
                   group-hover/nav:opacity-0 group-hover/nav:pointer-events-none"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ნავბარი – hover-ზე ჩნდება უფრო ნელა */}
      <aside
        className="absolute left-0 top-1/2 -translate-y-1/2
                   opacity-0 pointer-events-none -translate-x-2
                   group-hover/nav:opacity-100 group-hover/nav:pointer-events-auto group-hover/nav:translate-x-0
                   transition-all duration-500 ease-out"
      >
        <div className="card px-2 py-3 w-16 rounded-[22px] flex flex-col items-center gap-2">
          {links.map(({ href, icon: Icon, key }) => (
            <IconBtn key={key} href={href} Icon={Icon} active={isActive(href)} />
          ))}

          {/* ენის გადამრთველი */}
          <Link
            href={switchLocaleHref}
            onClick={playNav}
            className="leftnav-item leftnav-item--idle"
            aria-label="language-switch"
          >
            <Globe className="w-5 h-5 leftnav-icon" />
          </Link>

        </div>
      </aside>
    </div>
  );
}
