'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatModal from './ChatModal';

function hasAuthCookie(): boolean {
  try {
    return /(?:^|;\s*)x-user-id=/.test(document.cookie);
  } catch {
    return false;
  }
}

function hasAuthLocalStorage(): boolean {
  try {
    // შენს პროექტში სხვადასხვა ადგილას გაქვს auth/token/email/uid გამოყენებული,
    // ამიტომ აქ მაქსიმალურად “უსაფრთხო” ჩეკი გავაკეთე.
    const auth = localStorage.getItem('auth');
    const token = localStorage.getItem('token');
    const uid = localStorage.getItem('uid');
    const email = localStorage.getItem('email');
    return Boolean((auth || token || uid || email || '').trim());
  } catch {
    return false;
  }
}

function isAuthed(): boolean {
  if (typeof window === 'undefined') return false;
  return hasAuthCookie() || hasAuthLocalStorage();
}

export default function FloatingChatButton() {
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [initialThreadId, setInitialThreadId] = useState<string | undefined>();

  // აჩვენე ღილაკი მხოლოდ ავტორიზებულებზე (cookie OR localStorage)
  useEffect(() => {
    const check = () => setAuthed(isAuthed());

    const onFocus = () => check();
    const onVisibility = () => check();

    const onStorage = () => check();

    check();
    const id = window.setInterval(check, 2000);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // უნკითხავის ბეჯი
  useEffect(() => {
    if (!authed) return;

    let stop = false;

    async function load() {
      try {
        const r = await fetch('/api/chats/threads?summary=1', { cache: 'no-store' });
        if (!r.ok) throw new Error('summary_fail');
        const j = await r.json();
        const val = Number(j?.unreadTotal ?? j?.unread ?? 0);
        if (!stop) setUnread(Number.isFinite(val) ? val : 0);
      } catch {
        if (!stop) setUnread(0);
      }
    }

    load();
    const id = window.setInterval(load, 30000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [authed]);

  // გლობალური ტრიგერი: window.dispatchEvent(new CustomEvent('open-chat', { detail: { threadId } }))
  useEffect(() => {
    const fn = (e: Event) => {
      const ce = e as CustomEvent<{ threadId?: string | null }>;
      const tid = ce?.detail?.threadId || null;
      setInitialThreadId(tid || undefined);
      setOpen(true);
    };
    window.addEventListener('open-chat', fn as EventListener);
    return () => window.removeEventListener('open-chat', fn as EventListener);
  }, []);

  if (!authed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInitialThreadId(undefined); // ხელით გახსნისას — „ინბოქსი“
          setOpen(true);
        }}
        className="
          fixed bottom-5 right-5 z-[2147483646]
          rounded-full p-4
          btn-hero-primary chat-fab
          shadow-[0_10px_30px_rgba(0,255,255,.25)]
          hover:scale-[1.04] transition
          group
        "
        aria-label="Open chat"
      >
        <div className="relative">
          <MessageCircle
            className="
              w-6 h-6
              transition-transform
              group-hover:scale-110 group-hover:rotate-3
            "
          />
          {unread > 0 && (
            <span
              className="
                absolute -top-2 -right-2 min-w-5 h-5 px-1
                rounded-full bg-red-500 text-white text-[11px] leading-5
                text-center font-bold ring-1 ring-white/20
              "
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </button>

      {open && (
        <ChatModal
          open={open}
          onClose={() => setOpen(false)}
          threadId={initialThreadId}
          onAnyRead={() => setUnread(0)}
        />
      )}
    </>
  );
}
