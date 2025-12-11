// src/components/LeftNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Home, ListChecks, User, Globe, LogIn } from 'lucide-react';

export default function LeftNav({ locale }: { locale: 'ka' | 'en' }) {
  const pathname = usePathname();

  /* ---------- Auth state ---------- */
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const checkAuth = useCallback(() => {
    try {
      const logged =
        !!localStorage.getItem('auth') ||
        !!localStorage.getItem('token') ||
        !!localStorage.getItem('uid') ||
        hasCookie('x-user-id') ||
        hasCookie('uid');

      const adminFlag = !!localStorage.getItem('isAdmin');

      setAuthed(logged);
      setIsAdmin(adminFlag);
    } catch {
      setAuthed(false);
      setIsAdmin(false);
    }
  }, []);

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
      a.play()?.catch(() => {});
    } catch {
      /* ignore */
    }
  };

  const playHover = () => playSafe(hoverRef.current);
  const playNav   = () => playSafe(navRef.current);

  /* ---------- Routing helpers ---------- */
  const normalize = (p: string) =>
    p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p;
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

  /* ---------- Tooltip text (single language per locale) ---------- */
  const tooltipTexts =
    locale === 'ka'
      ? {
          home:   'მთავარი გვერდი',
          tasky:  'ტასკები',
          login:  'შესვლა',
          mypage: 'ჩემი გვერდი',
          admin:  'ადმინის პანელი',
          lang:   other === 'ka' ? 'ქართული' : 'ინგლისური',
        }
      : {
          home:   'Home Page',
          tasky:  'Tasks',
          login:  'Log in',
          mypage: 'My Page',
          admin:  'Admin Panel',
          lang:   other === 'ka' ? 'Georgian' : 'English',
        };

  /* ---------- Nav items ---------- */
  const profileOrLogin = authed
    ? {
        href: isAdmin ? `/${locale}/admin` : `/${locale}/mypage`,
        icon: User,
        key: isAdmin ? 'admin' : 'mypage',
      }
    : {
        href: `/${locale}/auth/login`,
        icon: LogIn,
        key: 'login',
      };

  const links = [
    { href: `/${locale}`,       icon: Home,       key: 'home'  },
    { href: `/${locale}/tasky`, icon: ListChecks, key: 'tasky' },
    profileOrLogin,
  ];

  /* ---------- Icon button ---------- */
  const IconBtn = ({
    href,
    Icon,
    active,
    tooltip,
  }: {
    href: string;
    Icon: any;
    active: boolean;
    tooltip: string;
  }) => (
    <Link
      href={href}
      onClick={playNav}
      onMouseEnter={playHover}
      className={clsx(
        'leftnav-item',
        active ? 'leftnav-item--active' : 'leftnav-item--idle'
      )}
      title={tooltip}
      aria-label={tooltip}
    >
      <Icon className="w-5 h-5 leftnav-icon" />
    </Link>
  );

  return (
    <>
      {/* DESKTOP – მარცხენა ვერტიკალური ნავბარი */}
      <div className="hidden md:block fixed left-3 top-1/2 -translate-y-1/2 z-[120]">
        <div className="card px-2 py-3 w-16 rounded-[22px] flex flex-col items-center gap-2">
          {links.map(({ href, icon: Icon, key }) => (
            <IconBtn
              key={key}
              href={href}
              Icon={Icon}
              active={isActive(href)}
              tooltip={(tooltipTexts as any)[key]}
            />
          ))}

          <IconBtn
            href={switchLocaleHref}
            Icon={Globe}
            active={false}
            tooltip={tooltipTexts.lang}
          />
        </div>
      </div>

      {/* MOBILE – ზედა ჰორიზონტალური ნავბარი */}
      <div className="md:hidden fixed top-3 left-1/2 -translate-x-1/2 z-[120]">
        <div className="card px-3 py-2 rounded-2xl flex items-center gap-2">
          {links.map(({ href, icon: Icon, key }) => (
            <IconBtn
              key={key}
              href={href}
              Icon={Icon}
              active={isActive(href)}
              tooltip={(tooltipTexts as any)[key]}
            />
          ))}

          <IconBtn
            href={switchLocaleHref}
            Icon={Globe}
            active={false}
            tooltip={tooltipTexts.lang}
          />
        </div>
      </div>
    </>
  );
}
