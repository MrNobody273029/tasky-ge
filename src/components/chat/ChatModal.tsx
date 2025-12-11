'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  X,
  Send,
  Loader2,
  MessageSquare,
  MoreVertical,
  Star,
} from 'lucide-react';
import MatrixLoader from '@/components/MatrixLoader';

type ThreadItem = {
  id: string;
  taskId: string;
  taskTitle?: string;
  counterpartName?: string | null;
  counterpartAvatar?: string | null;
  unreadForMe?: number;
  lastMessage?: string | null;
  updatedAt?: string;
  canWrite?: boolean;
  isFavorite?: boolean;
  blocked?: boolean; // 🆕 ეს დავამატოთ
};

type MessageItem = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  isMine?: boolean;
  _local?: boolean;
  _error?: boolean;
};

function getUidFromCookie(): string {
  try {
    const m = document.cookie.match(/(?:^|;\s*)x-user-id=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  } catch {
    return '';
  }
}
function getEmailFromCookie(): string {
  try {
    const m = document.cookie.match(/(?:^|;\s*)email=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  } catch {
    return '';
  }
}

/* ---------- localStorage helpers (favorites + hidden) ---------- */

const HIDDEN_KEY = 'tasky:chat:hiddenThreads';
const FAV_KEY = 'tasky:chat:favThreads';

function loadIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function saveIdSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

/* ---------- i18n ---------- */

const dict = {
  ka: {
    header: 'ჩატი',
    conversations: 'ჩატები',
    noConversations: 'ჯერ არ გაქვს ჩატები.',
    loading: 'იტვირთება…',
    selectConversation: 'აირჩიე ჩატი',
    noMessages: 'ჯერჯერობით შეტყობინებები არ არის.',
    inputPlaceholder: 'შეიყვანე ტექსტი…',
    send: 'გაგზავნა',
    hint: 'Enter – გაგზავნა • Shift+Enter – ახალი ხაზი',
    locked:
      'მოთხოვნა გაუქმებულია. ამ დავალებაზე ჩატი აღარ არის ხელმისაწვდომი.',
    menuFavorite: 'ფავორიტად მონიშვნა',
    menuUnfavorite: 'ფავორიტიდან ამოშლა',
    menuDelete: 'ჩატის დამალვა',
    menuDeleteConfirm:
      'დარწმუნებული ხარ, რომ გინდა ამ ჩატის დამალვა? ახალი შეტყობინების მიღებისას ის ისევ გამოჩნდება.',
  },
  en: {
    header: 'Chat',
    conversations: 'Conversations',
    noConversations: 'No conversations yet.',
    loading: 'Loading…',
    selectConversation: 'Select a conversation',
    noMessages: 'No messages yet.',
    inputPlaceholder: 'Write a message…',
    send: 'Send',
    hint: 'Enter to send • Shift+Enter for newline',
    locked: 'This request was rejected. Chat for this task is closed.',
    menuFavorite: 'Mark as favorite',
    menuUnfavorite: 'Remove from favorites',
    menuDelete: 'Hide chat',
    menuDeleteConfirm:
      'Hide this chat? It will reappear if you receive a new message.',
  },
} as const;

type Lang = keyof typeof dict;

export default function ChatModal({
  open,
  onClose,
  threadId,
  onAnyRead,
}: {
  open: boolean;
  onClose: () => void;
  threadId?: string;
  // FloatingChatButton-იდან მოდის → უნკითხავი ბეჯის გასანულებლად
  onAnyRead?: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const lang: Lang = params?.locale === 'ka' ? 'ka' : 'en';
  const t = dict[lang];

  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsErr, setThreadsErr] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(threadId ?? null);

  const [msgs, setMsgs] = useState<MessageItem[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msgsErr, setMsgsErr] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<number | null>(null);
  const threadPollRef = useRef<number | null>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const openSoundRef = useRef<HTMLAudioElement | null>(null);

  // props-ით მოსული threadId თუ შეიცვალა — გადაერთე
  useEffect(() => {
    if (threadId) setActiveId(threadId);
  }, [threadId]);

  const activeThread = useMemo(
    () => threads.find((th) => th.id === activeId) || null,
    [threads, activeId],
  );

  const isLocked =
    !!activeThread &&
    (activeThread.canWrite === false || activeThread.blocked === true);

  function scrollToBottom() {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight + 1000;
    });
  }

  function sortThreads(list: ThreadItem[]): ThreadItem[] {
    return [...list].sort((a, b) => {
      const af = a.isFavorite ? 1 : 0;
      const bf = b.isFavorite ? 1 : 0;
      if (af !== bf) return bf - af; // favorite → ზემოთ

      const ta = a.updatedAt ? Date.parse(a.updatedAt) || 0 : 0;
      const tb = b.updatedAt ? Date.parse(b.updatedAt) || 0 : 0;
      return tb - ta; // ახალი ზემოთ
    });
  }

  async function loadThreads() {
    setLoadingThreads(true);
    setThreadsErr(null);
    try {
      const r = await fetch('/api/chats/threads', { cache: 'no-store' });
      if (!r.ok) throw new Error('threads_failed');
      const j = await r.json();
      const arr = Array.isArray(j?.threads) ? (j.threads as any[]) : [];

      const hidden = loadIdSet(HIDDEN_KEY);
      const fav = loadIdSet(FAV_KEY);
      const nextHidden = new Set(hidden);

      const mapped: ThreadItem[] = [];

      for (const raw of arr) {
        const unreadCount = Number(raw.unreadTotal ?? raw.unread ?? 0) || 0;

        const statusRaw = String(
          raw.appStatus ?? raw.applicationStatus ?? raw.status ?? '',
        ).toUpperCase();

        // აპლიკაციის სტატუსიდან გამომდინარე ბლოკი
        const blockedFromStatus =
          statusRaw === 'REJECTED' || statusRaw === 'CANCELLED';

        // თუ ბექი გვიგზავნის canWrite-ს — მას ვენდობით, თორემ სტატუსიდან ვფლაგავთ
        const canWrite =
          raw.canWrite !== undefined ? !!raw.canWrite : !blockedFromStatus;

        const base: ThreadItem = {
          id: raw.id,
          taskId: raw.taskId,
          taskTitle: raw.taskTitle,
          counterpartName: raw.other?.name ?? 'user',
          counterpartAvatar: raw.other?.image ?? null,
          unreadForMe: unreadCount,
          lastMessage: raw.lastMessage ?? '',
          updatedAt: raw.lastAt,
          canWrite,
          isFavorite: fav.has(raw.id),
          blocked: raw.blocked ?? blockedFromStatus,
        };

        const isHidden = hidden.has(raw.id);

        // თუ დამალულია და ახალი უნკითხავი არ აქვს → სრულიად არ ვამატებთ
        if (isHidden && unreadCount <= 0) {
          continue;
        }

        // თუ დამალულზე ახალი მესიჯი მოვიდა → ჰიდენიდან ამოვიღოთ
        if (isHidden && unreadCount > 0) {
          nextHidden.delete(raw.id);
        }

        mapped.push(base);
      }

      saveIdSet(HIDDEN_KEY, nextHidden);

      const sorted = sortThreads(mapped);
      setThreads(sorted);

      if (!activeId && sorted.length > 0) {
        setActiveId(sorted[0].id);
      }
    } catch (e: any) {
      setThreadsErr(String(e?.message || e) || 'failed');
    } finally {
      setLoadingThreads(false);
    }
  }

  async function loadMessages(id: string) {
    setLoadingMsgs(true);
    setMsgsErr(null);
    try {
      const uid = getUidFromCookie();
      const email = getEmailFromCookie();

      const r = await fetch(`/api/chats/${id}/messages?limit=50&markRead=1`, {
        cache: 'no-store',
        headers: {
          'x-user-id': uid || '',
          'x-email': email || '',
        },
      });

      if (!r.ok) throw new Error('msgs_failed');
      const j = await r.json();
      const arr = Array.isArray(j?.items) ? (j.items as any[]) : [];

      const mapped: MessageItem[] = arr.map((m) => ({
        id: m.id,
        authorId: m.authorId,
        body: m.body,
        createdAt: m.createdAt,
        isMine: uid === m.authorId,
      }));

      setMsgs(mapped);
      scrollToBottom();

      // თრედების სიაში უნკითხავი განულდეს
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, unreadForMe: 0 } : t)),
      );

      if (typeof onAnyRead === 'function') {
        onAnyRead();
      }
    } catch (e: any) {
      setMsgsErr(String(e?.message || e) || 'failed');
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !activeId || sending || isLocked) return;
    setSending(true);

    const tempId = 'tmp_' + Date.now().toString(36);
    const optimistic: MessageItem = {
      id: tempId,
      authorId: 'me',
      body: text,
      createdAt: new Date().toISOString(),
      isMine: true,
      _local: true,
    };
    setMsgs((prev) => [...prev, optimistic]);
    setInput('');
    scrollToBottom();

    try {
      const uid = getUidFromCookie();
      const email = getEmailFromCookie();

      const r = await fetch(`/api/chats/${activeId}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': uid || '',
          'x-email': email || '',
        },
        body: JSON.stringify({ body: text }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'send_failed');

      const real: any = j?.message;
      if (real?.id) {
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: real.id,
                  authorId: real.authorId,
                  body: real.body,
                  createdAt: real.createdAt,
                  isMine: true,
                }
              : m,
          ),
        );
      } else {
        setMsgs((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, _local: false } : m)),
        );
      }

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? { ...t, lastMessage: text, updatedAt: new Date().toISOString() }
            : t,
        ),
      );
    } catch {
      setMsgs((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _error: true } : m)),
      );
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  /* ---------- Favorites / delete ---------- */

  function handleToggleFavorite(th: ThreadItem) {
    const fav = loadIdSet(FAV_KEY);
    const nextIsFav = !th.isFavorite;
    if (nextIsFav) fav.add(th.id);
    else fav.delete(th.id);
    saveIdSet(FAV_KEY, fav);

    setThreads((prev) => {
      const updated = prev.map((t) =>
        t.id === th.id ? { ...t, isFavorite: nextIsFav } : t,
      );
      return sortThreads(updated);
    });
    setMenuOpenId(null);
  }

  function handleDeleteThread(th: ThreadItem) {
    const ok = window.confirm(t.menuDeleteConfirm);
    if (!ok) return;

    const hidden = loadIdSet(HIDDEN_KEY);
    hidden.add(th.id);
    saveIdSet(HIDDEN_KEY, hidden);

    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== th.id);
      // თუ აქტიურს ვშლით — სხვა ამოვარჩიოთ
      if (activeId === th.id) {
        const nextActive = next[0]?.id ?? null;
        setActiveId(nextActive);
        setMsgs([]);
      }
      return next;
    });

    setMenuOpenId(null);
  }

  /* ---------- Effects ---------- */

  // გახსნისას — ჩავტვირთოთ თრედები
  useEffect(() => {
    if (!open) return;
    void loadThreads();

    // თრედების პოლინგი
    threadPollRef.current = window.setInterval(() => {
      loadThreads().catch(() => {});
    }, 25000);

    return () => {
      if (threadPollRef.current) clearInterval(threadPollRef.current);
      threadPollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // ჩატის გახსნისას — ხმა (chat-open.mp3)
  useEffect(() => {
    if (!open) return;

    if (!openSoundRef.current) {
      const a = new Audio('/sfx/chat-open.mp3');
      a.preload = 'auto';
      a.volume = 0.9;
      openSoundRef.current = a;
    }

    try {
      openSoundRef.current.currentTime = 0;
      openSoundRef.current.play()?.catch(() => {});
    } catch {
      // ignore
    }
  }, [open]);

  // აქტიური თრედის შეცვლაზე — ჩავტვირთოთ მესიჯები
  useEffect(() => {
    if (!open || !activeId) return;
    void loadMessages(activeId);

    // მესიჯების პოლინგი
    pollRef.current = window.setInterval(() => {
      loadMessages(activeId).catch(() => {});
    }, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeId]);

  // Esc → დახურვა
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 3 წერტილის მენიუ — ქლიქი გარეთ რომ დაიხუროს
  useEffect(() => {
    if (!menuOpenId) return;

    function handleDown(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpenId(null);
    }

    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpenId]);
// როცა მოდალი იხსნება – გავასუფთავოთ და დავაყენოთ loading=true,
// რომ პირველი კადრი იყოს MatrixLoader
useEffect(() => {
  if (!open) return;
  setThreads([]);
  setActiveId(threadId ?? null);
  setLoadingThreads(true);
  setThreadsErr(null);
}, [open, threadId]);

  if (!open) return null;

// სანამ ჩატების სია იტვირთება და ჯერ არც ერთი თრედია
if (loadingThreads && threads.length === 0) {
  return (
    <div className="fixed inset-0 z-[2147483647]">
      <MatrixLoader />
    </div>
  );
}


  return (
    <div className="fixed inset-0 z-[2147483647]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 top-6 mx-auto w-[min(100%,1100px)]">
        <div
          className="chat-modal-panel rounded-2xl ring-1 ring-cyan/30 bg-[#0b0f16]/95 shadow-[0_0_40px_rgba(0,255,255,.15)] overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan" />
              <div className="font-semibold">{t.header}</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="grid lg:grid-cols-[340px,1fr] min-h-[420px] h-[70vh] overflow-hidden">
            {/* Threads */}
            <aside className="border-r border-white/10 overflow-y-auto">
              <div className="p-3 sticky top-0 bg-[#0b0f16]/95 border-b border-white/10 z-10">
                <div className="text-sm text-white/70">
                  {loadingThreads ? t.loading : t.conversations}
                  {threadsErr && (
                    <span className="text-red-400 ml-2">{threadsErr}</span>
                  )}
                </div>
              </div>

              {threads.length === 0 && !loadingThreads ? (
                <div className="p-6 text-white/60 text-sm">
                  {t.noConversations}
                </div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {threads.map((th) => (
                    <li key={th.id} className="relative">
                      {/* main row */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(th.id);
                          setMenuOpenId(null);
                        }}
                        className={`w-full text-left pr-10 pl-3 py-3 flex gap-3 hover:bg-white/5 transition ${
                          activeId === th.id ? 'bg-white/5' : ''
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                          {th.counterpartAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={th.counterpartAvatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-white/60 text-sm">
                              {(th.counterpartName || 'U')[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">
                              {th.counterpartName || 'User'}
                            </span>
                            <span className="text-white/40 text-xs flex-shrink-0">
                              →
                            </span>
                            <span className="text-white/80 text-xs font-medium truncate flex-1">
                              {th.taskTitle || th.taskId || 'Task'}
                            </span>
                          </div>
                          {th.lastMessage ? (
                            <div className="text-white/50 text-xs truncate mt-0.5">
                              {th.lastMessage}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                          {th.isFavorite && (
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          )}
                          {th.unreadForMe ? (
                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] leading-5 font-bold">
                              {th.unreadForMe > 99 ? '99+' : th.unreadForMe}
                            </span>
                          ) : null}
                        </div>
                      </button>

                      {/* 3 წერტილი */}
                      <button
                        type="button"
                        onClick={() =>
                          setMenuOpenId((prev) =>
                            prev === th.id ? null : th.id,
                          )
                        }
                        className="absolute top-3 right-2 p-1 rounded-lg hover:bg-white/10 text-white/60"
                        aria-label="More"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpenId === th.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-2 top-9 z-20 w-44 rounded-xl bg-[#05080d] ring-1 ring-white/15 shadow-lg py-1 text-sm"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(th)}
                            className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center justify-between gap-2"
                          >
                            <span>
                              {th.isFavorite
                                ? t.menuUnfavorite
                                : t.menuFavorite}
                            </span>
                            {th.isFavorite && (
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteThread(th)}
                            className="w-full text-left px-3 py-2 hover:bg-white/10 text-red-300"
                          >
                            {t.menuDelete}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* Messages */}
            <section className="flex flex-col">
              {/* Active header */}
              <div className="p-3 border-b border-white/10">
                {activeThread ? (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="font-semibold">
                      {activeThread.counterpartName || 'User'}
                    </div>
                    <div className="text-white/60">•</div>
                    <div className="text-white/70 truncate">
                      {activeThread.taskTitle ||
                        activeThread.taskId ||
                        'Task'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-white/60">
                    {t.selectConversation}
                  </div>
                )}
              </div>

              {/* Message list */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {loadingMsgs && msgs.length === 0 ? (
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t.loading}
                  </div>
                ) : msgsErr ? (
                  <div className="text-sm text-red-400">{msgsErr}</div>
                ) : msgs.length === 0 ? (
                  <div className="text-sm text-white/60">{t.noMessages}</div>
                ) : (
                  <>
                    {msgs.map((m) => (
                      // შენს map-ის შიგთავსი ზუსტად 그대로 დატოვე
                      <div
                        key={m.id}
                        className={`flex ${
                          m.isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm ring-1 ${
                            m.isMine
                              ? 'bg-cyan text-black ring-cyan/40'
                              : 'bg-white/10 text-white ring-white/15'
                          }`}
                          title={new Date(m.createdAt).toLocaleString()}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            {m.body}
                          </div>
                          {m._error && (
                            <div className="mt-1 text-[11px] text-red-300">
                              Failed to send
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isLocked && (
                      <div className="text-xs text-red-300 text-center mt-2">
                        {t.locked}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Composer / locked notice */}
              <div className="p-3 border-t border-white/10">
                {isLocked ? (
                  <div className="text-sm text-red-300">{t.locked}</div>
                ) : (
                  <>
                    <div className="flex items-end gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={t.inputPlaceholder}
                        className="flex-1 min-h-[44px] max-h-[140px] resize-y rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-cyan/40"
                      />

                      <button
                        onClick={sendMessage}
                        disabled={!activeId || !input.trim() || sending}
                        className="shrink-0 btn-hero-primary text-sm inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>{t.send}</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-white/40 mt-1">
                      {t.hint}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
