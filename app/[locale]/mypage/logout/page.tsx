'use client';

import { useEffect } from 'react';

export default function LogoutPage({
  params,
}: {
  params: { locale: 'ka' | 'en' };
}) {
  useEffect(() => {
    (async () => {
      // (არ არის სავალდებულო) სცადე სერვერზე ქუქების გაწმენდა; 404 იყოს უყურადღებოდ
      try {
        await fetch('/api/logout', { method: 'POST', keepalive: true });
      } catch {}

      // 1) ქუქების წაშლა (მთავარია x-user-id/uid/email/x-email)
      try {
        const isSecure = typeof location !== 'undefined' && location.protocol === 'https:';
        const opt = `; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        // ძირითადი
        document.cookie = `x-user-id=; Max-Age=0${opt}`;
        document.cookie = `uid=; Max-Age=0${opt}`;
        document.cookie = `email=; Max-Age=0${opt}`;
        document.cookie = `x-email=; Max-Age=0${opt}`;
        // fallback ვერსიები (ზოგჯერ SameSite აფუჭებს)
        document.cookie = 'x-user-id=; Max-Age=0; path=/';
        document.cookie = 'uid=; Max-Age=0; path=/';
        document.cookie = 'email=; Max-Age=0; path=/';
        document.cookie = 'x-email=; Max-Age=0; path=/';
      } catch {}

      // 2) local/session storage გასუფთავება
      try {
        const wipe = ['token','auth','uid','email','phone','avatar','username','name'];
        wipe.forEach((k) => {
          try { localStorage.removeItem(k); } catch {}
          try { sessionStorage.removeItem(k); } catch {}
        });
      } catch {}

      // 3) ამ დროს აცნობე UI-ს, რომ სტატუსი შეიცვალა (LeftNav უსმენს 'auth-change'-ს)
      try { window.dispatchEvent(new Event('auth-change')); } catch {}

      // 4) რედირექტი მთავარზე იმავე ენაზე
      try { window.location.replace(`/${params.locale}`); }
      catch { window.location.href = `/${params.locale}`; }
    })();
  }, [params.locale]);

  return (
    <div className="flex items-center justify-center py-20 text-white/70">
      <span className="animate-pulse">Logging out…</span>
    </div>
  );
}
