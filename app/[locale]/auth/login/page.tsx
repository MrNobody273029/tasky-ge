'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ka from '../../../../messages/ka.json';
import en from '../../../../messages/en.json';
import { useEffect, useRef, useState } from 'react';

export default function LoginPage({
  params: { locale },
}: {
  params: { locale: 'ka' | 'en' };
}) {
  const m: any = locale === 'ka' ? ka : en;
  const r = useRouter();

  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');

  // ---------- Sounds ----------
  const okRef = useRef<HTMLAudioElement | null>(null);
  const failRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const ok = new Audio('/sfx/login.mp3'); ok.preload = 'auto'; ok.volume = 0.6; ok.load(); okRef.current = ok;
    const fl = new Audio('/sfx/login-fail.mp3'); fl.preload = 'auto'; fl.volume = 0.6; fl.load(); failRef.current = fl;
  }, []);

  const play = (a?: HTMLAudioElement | null) => { if (!a) return; try { a.currentTime = 0; void a.play(); } catch {} };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pwd }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error === 'invalid_credentials'
          ? (locale === 'ka' ? 'არასწორი ელფოსტა ან პაროლი.' : 'Invalid email or password.')
          : (locale === 'ka' ? 'შეცდომა. სცადე თავიდან.' : 'Error. Try again.'));
        play(failRef.current);
        return;
      }

      // ✅ წარმატება: ადგილობრივად ჩავუსვათ auth/uid/email, რომ LeftNav-ს დაენახოს
const data = await res.json().catch(() => null);

// ✅ გამოვაქვეყნოთ, რომ იუზერი შევსებულია
try {
  localStorage.setItem('auth', '1');
  if (data?.id) localStorage.setItem('uid', data.id);
  if (data?.email) localStorage.setItem('email', data.email);
  window.dispatchEvent(new Event('auth-change'));
} catch {}

play(okRef.current);
r.replace(`/${locale}/mypage`);
    } catch {
      setErr(locale === 'ka' ? 'ქსელის შეცდომა.' : 'Network error.');
      play(failRef.current);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card rounded-2xl p-8">
        <h1 className="text-center text-3xl font-extrabold mb-2">{m.auth.welcomeBack}</h1>
        <p className="text-center text-white/70 mb-8">{m.auth.loginSubtitle}</p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-1">{m.auth.email}</label>
            <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2" placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm mb-1">{m.auth.password}</label>
            <div className="relative">
              <input type="password" required value={pwd} onChange={(e)=>setPwd(e.target.value)}
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 pr-10" placeholder="••••••••" />
            </div>
            <div className="text-right mt-2">
              <Link href="#" className="text-sm text-white/70 hover:text-white">
                {m.auth.forgot}
              </Link>
            </div>
          </div>

          {err && <div className="text-red-400 text-sm">{err}</div>}

          <button type="submit" className="w-full rounded-xl bg-cyan text-black font-semibold py-3 shadow-neon">
            {m.auth.loginBtn}
          </button>
        </form>

        <div className="text-center mt-6 text-sm">
          {m.auth.noAccount}{' '}
          <Link href={`/${locale}/auth/register`} className="text-cyan hover:underline">
            {m.auth.createAccount}
          </Link>
        </div>
      </div>
    </div>
  );
}
