// app/[locale]/mypage/requests/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TaskCard, { TaskCardInput } from '@/components/TaskCard';

/* ---------- Types ---------- */
type Locale = 'ka' | 'en';

type Worker = {
  id: string;
  name?: string | null;
  image?: string | null;
  ratingWorkerAvg?: number | null;
  ratingWorkerCount?: number | null;
};

type ApplicationItem = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
  message?: string | null;
  threadId?: string | null;
  task: (TaskCardInput & { exclusive?: boolean }) | TaskCardInput;
  worker: Worker;
};

type ListResp = { items: ApplicationItem[] };

/* ---------- API endpoints ---------- */
const API = {
  list: '/api/applications?incoming=1&exclusive=1', // ← სწორია
  approve: (id: string) => `/api/applications/${id}/approve`,
  reject: (id: string) => `/api/applications/${id}/reject`,
};

/* ---------- i18n ---------- */
const tdict = {
  ka: {
    title: 'მოთხოვნები (ექსკლუზიური)',
    empty: 'ჯერ არ გაქვს მოთხოვნები.',
    wants: 'ამ დავალებაზე მუშაობა სურს',
    chat: 'ჩატის გახსნა',
    approve: 'დადასტურება',
    reject: 'უარყოფა',
    approved: 'დადასტურებულია ✓',
    rejected: 'უარყოფილია',
    confirmApprove:
      'დაუდასტურებ ამ შემსრულებელს? (დანარჩენი მოთხოვნები ავტომატურად უარყოფილი იქნება და დავალება სხვებს აღარ გამოუჩნდებათ)',
    rating: 'შეფასება (როგორც შემსრულებელი)',
    retry: 'თავიდან ცდა',
    loading: 'იტვირთება…',
  },
  en: {
    title: 'Requests (exclusive)',
    empty: 'No requests yet.',
    wants: 'wants to work on this task',
    chat: 'Open chat',
    approve: 'Approve',
    reject: 'Reject',
    approved: 'Approved ✓',
    rejected: 'Rejected',
    confirmApprove:
      'Approve this applicant? (other requests will be auto-rejected and the task will be hidden from others)',
    rating: 'Rating (as worker)',
    retry: 'Retry',
    loading: 'Loading…',
  },
} as const;

/* ---------- Small UI helpers ---------- */
function StarRow({ value = 0 }: { value?: number | null }) {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(v);
        return (
          <svg
            key={i}
            className={`w-4 h-4 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-white/40'}`}
            viewBox="0 0 24 24"
          >
            <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.401 8.168L12 18.896l-7.335 3.868 1.401-8.168L.132 9.21l8.2-1.192z" />
          </svg>
        );
      })}
    </div>
  );
}

/* ---------- Page ---------- */
export default function RequestsPage() {
  const params = useParams<{ locale?: string }>();
  const locale: Locale = params?.locale === 'en' ? 'en' : 'ka';
  const t = tdict[locale];

  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const SEEN_PREFIX = 'tasky:reqSeen:';

  function markRequestSeen(id: string) {
    try {
      localStorage.setItem(SEEN_PREFIX + id, '1');
    } catch {
      // ignore
    }
    try {
      // TopTabs-ს ვამცნობთ, რომ ანგარიშმა შეიცვალა
      window.dispatchEvent(new CustomEvent('requests-updated'));
    } catch {
      // ignore
    }
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(API.list, { cache: 'no-store' });
      if (!r.ok) throw new Error('fetch_fail');
      const j: ListResp = await r.json();
      const list = (j?.items || []).filter(
        (x) => (x?.task as any)?.exclusive !== false
      );
      setItems(list);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openChatInternal(threadId?: string | null) {
    try {
      if (threadId) localStorage.setItem('chat:openThread', threadId);
      window.dispatchEvent(new CustomEvent('open-chat'));
    } catch {
      if (threadId) location.href = `/${locale}/chats/${threadId}`;
    }
  }

  function openChatFor(app: ApplicationItem) {
    // ჩატის გახსნა უკვე ითვლება „ნახვად“
    markRequestSeen(app.id);
    openChatInternal(app.threadId || undefined);
  }

  async function approve(app: ApplicationItem) {
    if (!window.confirm(t.confirmApprove)) return;

    // დადასტურება → ეს მოთხოვნაც „ნახულად“ ვითვლით
    markRequestSeen(app.id);

    try {
      const r = await fetch(API.approve(app.id), { method: 'POST' });
      if (!r.ok) throw new Error('approve_fail');

      // Optimistic UI
      setItems((prev) =>
        prev.map((it) => {
          if (it.id === app.id) return { ...it, status: 'APPROVED' };
          if (it.task.id === app.task.id) return { ...it, status: 'REJECTED' };
          return it;
        })
      );
    } catch (e) {
      console.warn(e);
    }
  }

  async function reject(app: ApplicationItem) {
    // უარყოფაც ნიშნავს, რომ ნახე
    markRequestSeen(app.id);

    try {
      const r = await fetch(API.reject(app.id), { method: 'POST' });
      if (!r.ok) throw new Error('reject_fail');
      setItems((prev) =>
        prev.map((it) => (it.id === app.id ? { ...it, status: 'REJECTED' } : it))
      );
    } catch (e) {
      console.warn(e);
    }
  }
  // API-დან მოსული task ვაქციოთ იმავე ფორმატად, რასაც TaskCard ელოდება
  function toCardTask(src: ApplicationItem['task']): TaskCardInput {
    const t = src as any;

    return {
      id: t.id,
      locale, // ქარდის ენა — გვერდის ენას ვიყენებთ
      title: t.title,
      desc: t.desc ?? t.description ?? '',

      // category / skill ვტოვებთ raw მნიშვნელობებად, თარგმნას TaskCard აკეთებს
      category: t.category ?? undefined,
      skill: t.skill ?? undefined,

      reward: Number(t.reward) || 0,

      // deadline 그대로 ვტოვებთ (ISO/string/null)
      deadline: t.deadline ?? null,

      // where: "REMOTE" | "ONSITE" | "remote" | "onsite"
      where: t.where as TaskCardInput['where'],

      exclusive: Boolean(t.exclusive),
      status: t.status ?? 'PUBLISHED',
    };
  }

  const empty = !loading && !items.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-extrabold">{t.title}</h1>
        {loading && <span className="text-white/60 text-sm">{t.loading}</span>}

{!!err && (
  <button
    onClick={load}
    className="ml-2 btn-hero-secondary text-sm"
    data-text={t.retry}
    type="button"
  >
    <span className="btn-text">{t.retry}</span>
  </button>
)}

      </div>

      {err && (
        <div className="p-3 rounded-xl bg-red-500/10 text-red-300 text-sm">
          {String(err)}
        </div>
      )}
      {empty && <div className="card p-6 text-white/75">{t.empty}</div>}

      <div className="grid grid-cols-1 gap-6">
        {items.map((app) => {
          const w = app.worker || {};
          const status = app.status;
          return (
            <div
              key={app.id}
              className="card p-0 overflow-hidden ring-1 ring-white/10 bg-white/5 rounded-2xl"
            >
              <div className="grid md:grid-cols-[1.25fr,1fr]">
                {/* LEFT: Task */}
                <div className="p-4 border-b md:border-b-0 md:border-r border-white/10">
                <TaskCard task={toCardTask(app.task)} />
                </div>

                {/* RIGHT: Applicant */}
                <div className="p-4 space-y-4">
                  <div className="font-semibold">{t.wants}</div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-white/15 bg-white/10 flex items-center justify-center">
                      {w.image ? (
                        <img
                          src={w.image}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/30" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{w.name || w.id}</div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <StarRow value={w.ratingWorkerAvg || 0} />
                        <span>
                          {Number(w.ratingWorkerAvg || 0).toFixed(1)} / 5 •{' '}
                          {w.ratingWorkerCount || 0}
                        </span>
                        <span className="text-white/50">— {t.rating}</span>
                      </div>
                    </div>
                  </div>
                

{/* Actions */}
<div className="pt-1 flex flex-wrap gap-3">
  {/* ჩატის გახსნა — გლიჩიანი ლურჯი */}
  {status !== 'REJECTED' && (
    <button
      onClick={() => openChatFor(app)}
      className="btn-hero-secondary text-sm"
      data-text={t.chat}
      type="button"
    >
      <span className="btn-text">{t.chat}</span>
    </button>
  )}

  {status === 'PENDING' && (
    <>
      {/* დადასტურება — გლიჩიანი ლურჯი */}
      <button
        onClick={() => approve(app)}
        className="btn-hero-secondary text-sm"
        data-text={t.approve}
        type="button"
      >
        <span className="btn-text">{t.approve}</span>
      </button>

      {/* უარყოფა — წითელი, გლიჩის გარეშე */}
      <button
        onClick={() => reject(app)}
        className="btn-logout text-sm"
        type="button"
      >
        <span>{t.reject}</span>
      </button>
    </>
  )}

  {/* უკვე დადასტურებულია — მწვანე ბეჯი */}
  {status === 'APPROVED' && (
    <div className="pill-status-approved">
      {t.approved}
    </div>
  )}

  {/* უკვე უარყოფილია — თეთრი ბეჯი */}
  {status === 'REJECTED' && (
    <div className="pill-status-rejected">
      {t.rejected}
    </div>
  )}
</div>



                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
