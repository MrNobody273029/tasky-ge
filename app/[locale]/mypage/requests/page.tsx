'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import TaskCard, { TaskCardInput } from '@/components/TaskCard';
import MatrixLoader from '@/components/MatrixLoader';

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
  decidedAt?: string | null;
  message?: string | null;
  threadId?: string | null;

  // DB notification flags
  ownerSeen?: boolean;
  ownerSeenAt?: string | null;

  task: (TaskCardInput & { exclusive?: boolean }) | TaskCardInput;
  worker: Worker;
};

type ListResp = { items: ApplicationItem[] };

const API = {
  list: '/api/applications?incoming=1&exclusive=1',
  approve: (id: string) => `/api/applications/${id}/approve`,
  reject: (id: string) => `/api/applications/${id}/reject`,
  seen: '/api/applications/seen',
};

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
    newBadge: 'ახალი',
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
    newBadge: 'New',
  },
} as const;

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

export default function RequestsPage() {
  const params = useParams<{ locale?: string }>();
  const locale: Locale = params?.locale === 'en' ? 'en' : 'ka';
  const t = tdict[locale];

  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(API.list, { cache: 'no-store' });
      if (!r.ok) throw new Error('fetch_fail');
      const j: ListResp = await r.json();
      const list = (j?.items || []).filter((x) => (x?.task as any)?.exclusive !== false);
      setItems(list);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ✅ DB-ზე: როგორც კი გვერდი გაიხსნება, ყველა pending unseen მოინიშნე seen=true
  async function markAllRequestsSeenOptimistic() {
    try {
      await fetch(API.seen, { method: 'POST', cache: 'no-store' });

      // optimistic UI
      setItems((prev) =>
        prev.map((it) =>
          it.status === 'PENDING' && it.ownerSeen === false
            ? { ...it, ownerSeen: true, ownerSeenAt: new Date().toISOString() }
            : it,
        ),
      );

      // topbar badges refresh trigger (თუ სადმე უსმენ)
      window.dispatchEvent(new CustomEvent('notifications-refresh'));
      window.dispatchEvent(new CustomEvent('requests-updated'));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    (async () => {
      await load();
      await markAllRequestsSeenOptimistic();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openChatInternal(threadId?: string | null) {
    try {
      window.dispatchEvent(
        new CustomEvent('open-chat', { detail: { threadId: threadId || null } }),
      );
    } catch {
      if (threadId) location.href = `/${locale}/chats/${threadId}`;
    }
  }

  function openChatFor(app: ApplicationItem) {
    // გვერდზე შესვლისას seen უკვე დავსვით,
    // მაგრამ თუ მაინც დარჩა რამე — UI-შიც მოვნიშნოთ და მერე გავხსნათ
    setItems((prev) =>
      prev.map((it) => (it.id === app.id ? { ...it, ownerSeen: true } : it)),
    );
    openChatInternal(app.threadId || undefined);
  }

  async function approve(app: ApplicationItem) {
    if (!window.confirm(t.confirmApprove)) return;
    setActingId(app.id);
    setErr(null);

    try {
      const r = await fetch(API.approve(app.id), { method: 'POST' });
      if (!r.ok) throw new Error('approve_fail');

      // Optimistic UI
      setItems((prev) =>
        prev.map((it) => {
          if (it.id === app.id) return { ...it, status: 'APPROVED', ownerSeen: true };
          if (it.task.id === (app.task as any).id) return { ...it, status: 'REJECTED' };
          return it;
        }),
      );

      window.dispatchEvent(new CustomEvent('notifications-refresh'));
      window.dispatchEvent(new CustomEvent('requests-updated'));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setActingId(null);
    }
  }

  async function reject(app: ApplicationItem) {
    setActingId(app.id);
    setErr(null);

    try {
      const r = await fetch(API.reject(app.id), { method: 'POST' });
      if (!r.ok) throw new Error('reject_fail');

      setItems((prev) =>
        prev.map((it) =>
          it.id === app.id ? { ...it, status: 'REJECTED', ownerSeen: true } : it,
        ),
      );

      window.dispatchEvent(new CustomEvent('notifications-refresh'));
      window.dispatchEvent(new CustomEvent('requests-updated'));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setActingId(null);
    }
  }

  function toCardTask(src: ApplicationItem['task']): TaskCardInput {
    const tsk = src as any;
    return {
      id: tsk.id,
      locale,
      title: tsk.title,
      desc: tsk.desc ?? tsk.description ?? '',
      category: tsk.category ?? undefined,
      skill: tsk.skill ?? undefined,
      reward: Number(tsk.reward) || 0,
      deadline: tsk.deadline ?? null,
      where: tsk.where as TaskCardInput['where'],
      exclusive: Boolean(tsk.exclusive),
      status: tsk.status ?? 'PUBLISHED',
    };
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/80">
        <MatrixLoader />
      </div>
    );
  }

  const empty = !items.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-extrabold">{t.title}</h1>

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

          const isNew = status === 'PENDING' && app.ownerSeen === false;

          return (
            <div
              key={app.id}
              className="card p-0 overflow-hidden ring-1 ring-white/10 bg-white/5 rounded-2xl"
            >
              <div className="grid md:grid-cols-[1.25fr,1fr]">
                <div className="p-4 border-b md:border-b-0 md:border-r border-white/10">
                  <TaskCard task={toCardTask(app.task)} />
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{t.wants}</div>
                    {isNew && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30">
                        {t.newBadge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-white/15 bg-white/10 flex items-center justify-center">
                      {w.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
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

                  <div className="pt-1 flex flex-wrap gap-3">
                    {status !== 'REJECTED' && (
                      <button
                        onClick={() => openChatFor(app)}
                        className="btn-hero-secondary text-sm"
                        data-text={t.chat}
                        type="button"
                        disabled={actingId === app.id}
                      >
                        <span className="btn-text">{t.chat}</span>
                      </button>
                    )}

                    {status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => approve(app)}
                          className="btn-hero-secondary text-sm"
                          data-text={t.approve}
                          type="button"
                          disabled={actingId === app.id}
                        >
                          <span className="btn-text">
                            {actingId === app.id ? '...' : t.approve}
                          </span>
                        </button>

                        <button
                          onClick={() => reject(app)}
                          className="btn-logout text-sm"
                          type="button"
                          disabled={actingId === app.id}
                        >
                          <span>{actingId === app.id ? '...' : t.reject}</span>
                        </button>
                      </>
                    )}

                    {status === 'APPROVED' && (
                      <div className="pill-status-approved">{t.approved}</div>
                    )}
                    {status === 'REJECTED' && (
                      <div className="pill-status-rejected">{t.rejected}</div>
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
