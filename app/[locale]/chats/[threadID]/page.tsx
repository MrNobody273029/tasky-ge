'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';

/* -------- small helpers -------- */
function hasAuthCookie(): boolean {
  try {
    return /(?:^|;\s*)x-user-id=/.test(document.cookie);
  } catch {
    return false;
  }
}

type Me = { id: string; email?: string | null; name?: string | null; image?: string | null };
type ChatMsg = { id: string; authorId: string; body: string; createdAt: string };
type ThreadMeta = {
  id: string;
  taskId?: string;
  taskTitle?: string;
  ownerId?: string;
  applicantId?: string;
};

export default function ChatThreadPage() {
  const { locale, threadID } = useParams<{ locale: 'ka' | 'en'; threadID: string }>();
  const router = useRouter();

  const [authed, setAuthed] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [text, setText] = useState('');
  const boxRef = useRef<HTMLDivElement | null>(null);
  const sinceRef = useRef<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // auth check
  useEffect(() => {
    setAuthed(hasAuthCookie());
  }, []);

  // fetch me (to align bubbles)
  useEffect(() => {
    if (!authed) return;
    let stop = false;
    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        if (!r.ok) throw new Error('unauthenticated');
        const j = (await r.json()) as Me;
        if (!stop) setMe(j);
      } catch {
        if (!stop) setMe(null);
      }
    })();
    return () => { stop = true; };
  }, [authed]);

  // load messages (initial)
  useEffect(() => {
    if (!authed || !threadID) return;
    let stop = false;

    async function loadInitial() {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/chats/${threadID}/messages`, { cache: 'no-store' });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || `Request failed (${r.status})`);
        }
        const j = await r.json().catch(() => ({}));
        const msgs: ChatMsg[] = Array.isArray(j?.messages) ? j.messages : (Array.isArray(j) ? j : []);
        if (!stop) {
          setMessages(msgs);
          // meta if present
          const m = j?.thread || null;
          if (m) setMeta({
            id: m.id, taskId: m.taskId, taskTitle: m.taskTitle, ownerId: m.ownerId, applicantId: m.applicantId
          });
          // set since
          const last = msgs[msgs.length - 1];
          sinceRef.current = last ? last.createdAt : null;
        }
      } catch (e: any) {
        if (!stop) setErr(String(e?.message || e));
      } finally {
        if (!stop) setLoading(false);
      }
    }

    loadInitial();

    return () => { stop = true; };
  }, [authed, threadID]);

  // polling for new messages
  useEffect(() => {
    if (!authed || !threadID) return;

    async function poll() {
      try {
        const since = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : '';
        const r = await fetch(`/api/chats/${threadID}/messages${since}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json().catch(() => ({}));
        const newMsgs: ChatMsg[] = Array.isArray(j?.messages) ? j.messages : (Array.isArray(j) ? j : []);
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const merged = [...prev, ...newMsgs].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            return merged;
          });
          const last = newMsgs[newMsgs.length - 1];
          sinceRef.current = last.createdAt;
        }
      } catch {}
    }

    pollRef.current = window.setInterval(poll, 4000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [authed, threadID]);

  // autoscroll on new messages
  useEffect(() => {
    if (!boxRef.current) return;
    boxRef.current.scrollTop = boxRef.current.scrollHeight + 1000;
  }, [messages.length]);

  const title = useMemo(() => {
    if (meta?.taskTitle) return meta.taskTitle;
    return locale === 'ka' ? 'ჩატი' : 'Chat';
  }, [meta?.taskTitle, locale]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      const r = await fetch(`/api/chats/${threadID}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body })
      });
      if (!r.ok) {
        // revert input if failed
        setText(body);
        return;
      }
      // optimistic append (server will also deliver via poll)
      setMessages(prev => [...prev, {
        id: `local-${Date.now()}`,
        authorId: me?.id || 'me',
        body,
        createdAt: new Date().toISOString()
      }]);
      sinceRef.current = new Date().toISOString();
    } catch {
      setText(body);
    }
  }

  if (!authed) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="card p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
          <div className="text-lg font-semibold mb-2">
            {locale === 'ka' ? 'ჩატისთვის საჭიროა ავტორიზაცია' : 'Sign in to use chat'}
          </div>
          <Link
            href={`/${locale}/auth/register`}
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-cyan text-black font-semibold"
          >
            {locale === 'ka' ? 'შესვლა / რეგისტრაცია' : 'Sign in / Register'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-120px)] grid grid-rows-[auto,1fr,auto] gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-white/80 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{locale === 'ka' ? 'უკან' : 'Back'}</span>
        </button>
        <div className="text-xl font-bold truncate">{title}</div>
        <div />
      </div>

      {/* Messages */}
      <div
        ref={boxRef}
        className="card rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 overflow-y-auto"
      >
        {loading && (
          <div className="text-white/60">{locale === 'ka' ? 'იტვირთება…' : 'Loading…'}</div>
        )}
        {err && <div className="text-red-400">{err}</div>}

        <div className="space-y-3">
          {messages.map(m => {
            const mine = me && m.authorId === me.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm ${
                    mine
                      ? 'bg-cyan text-black'
                      : 'bg-white/10 text-white'
                  }`}
                  title={new Date(m.createdAt).toLocaleString()}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          className="flex-1 px-3 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 outline-none focus:ring-cyan/40"
          placeholder={locale === 'ka' ? 'მესიჯი…' : 'Message…'}
        />
        <button
          onClick={send}
          className="px-4 py-2 rounded-xl bg-cyan text-black font-semibold inline-flex items-center gap-2 disabled:opacity-60"
          disabled={!text.trim()}
        >
          <Send className="w-4 h-4" />
          {locale === 'ka' ? 'გაგზავნა' : 'Send'}
        </button>
      </div>
    </div>
  );
}
