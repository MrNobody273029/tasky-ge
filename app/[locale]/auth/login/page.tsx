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

const loginLabel = m.auth.loginBtn as string;

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
       <div className="glitch-input-wrapper mb-8">
  <div className="input-container">
    <input
      type="email"
      id="login-email"
      required
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="holo-input"
      placeholder=" "         // ერთი space რომ :placeholder-shown იმუშაოს
    />
    <label
      htmlFor="login-email"
      className="input-label"
      data-text={m.auth.email}
    >
      {m.auth.email}
    </label>

    <div className="input-border" />
    <div className="input-scanline" />
    <div className="input-glow" />

    <div className="input-data-stream">
      <div className="stream-bar" style={{ '--i': 0 } as any} />
      <div className="stream-bar" style={{ '--i': 1 } as any} />
      <div className="stream-bar" style={{ '--i': 2 } as any} />
      <div className="stream-bar" style={{ '--i': 3 } as any} />
      <div className="stream-bar" style={{ '--i': 4 } as any} />
      <div className="stream-bar" style={{ '--i': 5 } as any} />
      <div className="stream-bar" style={{ '--i': 6 } as any} />
      <div className="stream-bar" style={{ '--i': 7 } as any} />
      <div className="stream-bar" style={{ '--i': 8 } as any} />
      <div className="stream-bar" style={{ '--i': 9 } as any} />
    </div>

    <div className="input-corners">
      <div className="corner corner-tl" />
      <div className="corner corner-tr" />
      <div className="corner corner-bl" />
      <div className="corner corner-br" />
    </div>
  </div>
</div>


<div className="glitch-input-wrapper mb-2">
  <div className="input-container">
    <input
      type="password"
      id="login-password"
      required
      value={pwd}
      onChange={(e) => setPwd(e.target.value)}
      className="holo-input"
      placeholder=" "
    />
    <label
      htmlFor="login-password"
      className="input-label"
      data-text={m.auth.password}
    >
      {m.auth.password}
    </label>

    <div className="input-border" />
    <div className="input-scanline" />
    <div className="input-glow" />

    <div className="input-data-stream">
      <div className="stream-bar" style={{ '--i': 0 } as any} />
      <div className="stream-bar" style={{ '--i': 1 } as any} />
      <div className="stream-bar" style={{ '--i': 2 } as any} />
      <div className="stream-bar" style={{ '--i': 3 } as any} />
      <div className="stream-bar" style={{ '--i': 4 } as any} />
      <div className="stream-bar" style={{ '--i': 5 } as any} />
      <div className="stream-bar" style={{ '--i': 6 } as any} />
      <div className="stream-bar" style={{ '--i': 7 } as any} />
      <div className="stream-bar" style={{ '--i': 8 } as any} />
      <div className="stream-bar" style={{ '--i': 9 } as any} />
    </div>

    <div className="input-corners">
      <div className="corner corner-tl" />
      <div className="corner corner-tr" />
      <div className="corner corner-bl" />
      <div className="corner corner-br" />
    </div>
  </div>

  <div className="text-right mt-2 text-sm">
    <Link href="#" className="text-white/70 hover:text-white">
      {m.auth.forgot}
    </Link>
  </div>
</div>


          {err && <div className="text-red-400 text-sm">{err}</div>}

          <button
            type="submit"
            className="btn-hero-primary w-full justify-center text-sm"
            data-text={loginLabel}
          >
            <span className="btn-text">{loginLabel}</span>
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
