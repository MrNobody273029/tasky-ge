'use client';

import { useEffect } from 'react';

export default function LogoutPage({
  params,
}: {
  params: { locale: 'ka' | 'en' };
}) {
useEffect(() => {
  (async () => {
    // 1) სერვერზე logout (ქუქების გაწმენდა)
    try {
      await fetch('/api/logout', { method: 'POST', keepalive: true });
    } catch {}

    // 2) local/session storage გასუფთავება
    try {
      const wipe = ['token','auth','uid','email','phone','avatar','username','name'];
      wipe.forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
        try { sessionStorage.removeItem(k); } catch {}
      });
    } catch {}

    // 3) UI-ს ვეტყვით რომ შეიცვალა auth
    try { window.dispatchEvent(new Event('auth-change')); } catch {}

    // 4) redirect მთავარ გვერდზე
    try {
      window.location.replace(`/${params.locale}`);
    } catch {
      window.location.href = `/${params.locale}`;
    }
  })();
}, [params.locale]);


  return (
    <div className="flex items-center justify-center py-20 text-white/70">
      <span className="animate-pulse">Logging out…</span>
    </div>
  );
}
