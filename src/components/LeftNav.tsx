'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Home, ListChecks, User, Globe, LogIn } from 'lucide-react';

type Locale = 'ka' | 'en';
type NavKey = 'home' | 'tasky' | 'login' | 'mypage' | 'admin';

type NavItem = {
  href: string;
  icon: LucideIcon;
  key: NavKey;
};

export default function LeftNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;

  /* ---------- Auth state ---------- */
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const hasCookie = useCallback((name: string) => {
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
  }, []);

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
  }, [hasCookie]);

  useEffect(() => {
    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('focus', checkAuth);
    document.addEventListener('visibilitychange', checkAuth);
    window.addEventListener('auth-change', checkAuth as EventListener);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('focus', checkAuth);
      document.removeEventListener('visibilitychange', checkAuth);
      window.removeEventListener('auth-change', checkAuth as EventListener);
    };
  }, [checkAuth]);

  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  /* ---------- Audio unlock + preload ---------- */
  const canSoundRef = useRef<boolean>(
    !!(navigator as any)?.userActivation?.hasBeenActive
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

  const hoverRef = useRef<HTMLAudioElement | null>(null);
  const navRef = useRef<HTMLAudioElement | null>(null);

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

    return () => {
      // cleanup (ზოგ ბრაუზერში რეალურად ეხმარება)
      hoverRef.current = null;
      navRef.current = null;
    };
  }, []);

  const playSafe = (a?: HTMLAudioElement | null) => {
    if (!a || !canSoundRef.current) return;
    try {
      a.currentTime = 0;
      a.play()?.catch(() => {});
    } catch {}
  };

  const playHover = () => playSafe(hoverRef.current);
  const playNav = () => playSafe(navRef.current);

  /* ---------- Routing helpers ---------- */
  const normalize = (p: string) =>
    p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p;

  const path = normalize(pathname);
  const base = `/${locale}`;

  const isActive = useCallback(
    (href: string) => {
      const h = normalize(href);
      if (h === base) return path === base;
      return path === h || path.startsWith(h + '/');
    },
    [path, base]
  );

  const other: Locale = locale === 'ka' ? 'en' : 'ka';
  const switchLocaleHref =
    pathname.replace(/^\/(ka|en)(?=\/|$)/, `/${other}`) || `/${other}`;

  /* ---------- Tooltip text ---------- */
  const tooltipTexts = useMemo(() => {
    return locale === 'ka'
      ? ({
          home: 'მთავარი გვერდი',
          tasky: 'ტასკები',
          login: 'შესვლა',
          mypage: 'ჩემი გვერდი',
          admin: 'ადმინის პანელი',
          lang: other === 'ka' ? 'ქართული' : 'ინგლისური',
        } as const)
      : ({
          home: 'Home Page',
          tasky: 'Tasks',
          login: 'Log in',
          mypage: 'My Page',
          admin: 'Admin Panel',
          lang: other === 'ka' ? 'Georgian' : 'English',
        } as const);
  }, [locale, other]);

  /* ---------- Nav items ---------- */
  const profileOrLogin: NavItem = authed
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

  const links: NavItem[] = useMemo(
    () => [
      { href: `/${locale}`, icon: Home, key: 'home' },
      { href: `/${locale}/tasky`, icon: ListChecks, key: 'tasky' },
      profileOrLogin,
    ],
    [locale, profileOrLogin]
  );

  /* ---------- Mobile scroll hide/show (bug-proof + smooth) ---------- */
  const [showMobileNav, setShowMobileNav] = useState(true);
  const lastScrollYRef = useRef(0);
  const isMobileRef = useRef(false);
  const showRef = useRef(showMobileNav);

  useEffect(() => {
    showRef.current = showMobileNav;
  }, [showMobileNav]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const set = () => (isMobileRef.current = mql.matches);
    set();

    // Safari fallback
    if (mql.addEventListener) mql.addEventListener('change', set);
    else (mql as any).addListener?.(set);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', set);
      else (mql as any).removeListener?.(set);
    };
  }, []);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!isMobileRef.current) {
        if (!showRef.current) setShowMobileNav(true);
        lastScrollYRef.current = window.scrollY || 0;
        return;
      }

      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY || 0;
        const lastY = lastScrollYRef.current;
        const delta = currentY - lastY;

        if (currentY <= 0) {
          if (!showRef.current) setShowMobileNav(true);
        } else if (delta > 4) {
          if (showRef.current) setShowMobileNav(false);
        } else if (delta < -4) {
          if (!showRef.current) setShowMobileNav(true);
        }

        lastScrollYRef.current = currentY;
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ---------- Icon button ---------- */
  const IconBtn = ({
    href,
    Icon,
    active,
    tooltip,
  }: {
    href: string;
    Icon: LucideIcon;
    active: boolean;
    tooltip: string;
  }) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={playNav}
      onPointerEnter={playHover}
      className={clsx('leftnav-item', active ? 'leftnav-item--active' : 'leftnav-item--idle')}
      title={tooltip}
      aria-label={tooltip}
    >
      <Icon className="w-5 h-5 leftnav-icon" />
    </Link>
  );

  return (
    <>
      {/* MOBILE spacer */}
      <div className="md:hidden h-20" aria-hidden="true" />

      {/* DESKTOP */}
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

      {/* MOBILE */}
      <div className="md:hidden fixed top-3 left-1/2 -translate-x-1/2 z-[120]">
        <div className={clsx('mobile-nav-shell', !showMobileNav && 'mobile-nav-shell--hidden')}>
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
      </div>

      <style jsx global>{`
        .mobile-nav-shell {
          transition: opacity 0.25s ease, transform 0.25s ease;
          opacity: 1;
          transform: translateY(0);
        }
        .mobile-nav-shell--hidden {
          opacity: 0;
          transform: translateY(-18px);
          pointer-events: none;
        }
      `}</style>
    </>
  );
}
