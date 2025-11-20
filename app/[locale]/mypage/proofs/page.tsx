'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarClock,
  MapPin,
  User2,
  Image as ImageIcon,
  Film,
  FileArchive,
  Star,
  X,
} from 'lucide-react';

type Locale = 'ka' | 'en';

type EvidenceItem = {
  id: string;
  createdAt: string;
  text: string;
  photos: string[];
  videos: string[];
  files: string[];

  // ახალი ველები status-ისთვის
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_FIXES';
  clientReviewed?: boolean;
  workerReviewed?: boolean;

  task: {
    id: string;
    title: string;
    reward: number;
    deadline: string | null;
    where: 'REMOTE' | 'ONSITE';
    exclusive: boolean;
    locale: string;
    category: string;
    skill: string;
  };
  worker: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    ratingWorkerAvg?: number | null;
    ratingWorkerCount?: number | null;
  };

  client: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};


function formatDateTime(value: string, locale: Locale) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(locale === 'ka' ? 'ka-GE' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDeadline(deadline: string | null, locale: Locale) {
  if (!deadline) return locale === 'ka' ? 'ვადა დაყენებული არაა' : 'No deadline';
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime()))
    return locale === 'ka' ? 'ვადა დაყენებული არაა' : 'No deadline';
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return locale === 'ka' ? 'ვადა გასულია' : 'Expired';
  const days = Math.floor(ms / 86400000);
  if (days >= 1) {
    return locale === 'ka'
      ? `დარჩა ${days} დღე`
      : `${days} day(s) left`;
  }
  const hours = Math.ceil(ms / 3600000);
  return locale === 'ka'
    ? `დარჩა ${hours} სთ`
    : `${hours} hour(s) left`;
}

function StarRow({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = n <= Math.round(v);
        return (
          <Star
            key={n}
            className={
              'w-4 h-4 ' +
              (filled ? 'fill-yellow-400 text-yellow-400' : 'text-white/40')
            }
          />
        );
      })}
    </div>
  );
}
function statusLabel(status: EvidenceItem['status'], isKa: boolean) {
  switch (status) {
    case 'APPROVED':
      return isKa ? 'დადასტურებულია' : 'Approved';
    case 'NEEDS_FIXES':
      return isKa ? 'დახარვეზებულია' : 'Needs fixes';
    case 'REJECTED':
      return isKa ? 'უარყოფილია' : 'Rejected';
    default:
      return '';
  }
}

function statusClasses(status: EvidenceItem['status']) {
  switch (status) {
    case 'APPROVED':
      return 'border-emerald-400/70 bg-emerald-400/10 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.6)]';
    case 'NEEDS_FIXES':
      return 'border-amber-400/70 bg-amber-400/10 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.6)]';
    case 'REJECTED':
      return 'border-rose-400/70 bg-rose-400/10 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.6)]';
    default:
      return 'border-white/20 bg-white/5 text-white/70';
  }
}

/* ---------------- Modal ---------------- */

function EvidenceModal({
  locale,
  item,
  isIncoming,
  onClose,
  onUpdate,
}: {
  locale: Locale;
  item: EvidenceItem;
  isIncoming: boolean; // გადავცემთ, არის თუ არა „ჩემთან გამოგზავნილში“
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<EvidenceItem>) => void;
}) {
  const isKa = locale === 'ka';
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  async function handleConfirm() {
    if (!isIncoming) return;
    if (busy) return;
    setBusy(true);
    setActionErr(null);
    try {
      const res = await fetch(`/api/evidences/${item.id}/confirm`, {
        method: 'POST',
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setActionErr(j?.error || 'Request failed');
        return;
      }
      // front-ზე სტატუსის განახლება
      onUpdate(item.id, { status: 'APPROVED' });
    } catch (e: any) {
      setActionErr(String(e?.message || e) || 'Request failed');
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* scrollable container */}
      <div className="relative z-10 flex items-start justify-center h-full overflow-y-auto">
        <div className="w-full max-w-[1000px] px-4 md:px-0 py-10">
          <div className="relative card rounded-2xl bg-[#0b0f16]/95 ring-1 ring-cyan/30 p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="pr-10">
              <div className="text-xs uppercase tracking-wide text-white/50 mb-1">
                {isKa ? 'მტკიცებულება დავალებისთვის' : 'Evidence for task'}
              </div>
              <div className="text-xl md:text-2xl font-bold leading-snug">
                {item.task.title}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="px-3 py-1 rounded-full bg-cyan/20 text-cyan font-semibold">
                  ₾{item.task.reward}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 text-sky-400" />
                  {formatShortDeadline(item.task.deadline, locale)}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  {item.task.where === 'REMOTE'
                    ? isKa
                      ? 'დისტანციური'
                      : 'Remote'
                    : isKa
                      ? 'ადგილზე'
                      : 'On-site'}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="mt-5 grid lg:grid-cols-[1.4fr,1fr] gap-6">
              {/* Left – worker + content */}
              <div className="space-y-5">
                {/* Worker */}
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                  <div className="text-xs text-white/60 mb-2">
                    {isKa ? 'შემსრულებელი' : 'Worker'}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10 flex items-center justify-center">
                      {item.worker.image ? (
                        <img
                          src={item.worker.image}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User2 className="w-6 h-6 text-white/70" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {item.worker.name ||
                          item.worker.email ||
                          '—'}
                      </div>
                      {item.worker.email && (
                        <div className="text-xs text-white/60 truncate">
                          {item.worker.email}
                        </div>
                      )}
                    </div>
                    <div className="ml-auto text-right text-xs text-white/60">
                      <div>{formatDateTime(item.createdAt, locale)}</div>
                      <div>
                        {isKa ? 'გამოგზავნის დრო' : 'Submitted at'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs md:text-sm text-white/70">
                    <div className="flex items-center gap-2">
                     <StarRow value={item.worker.ratingWorkerAvg ?? 0} />
                      <span>
                        {(item.worker.ratingWorkerAvg ?? 0).toFixed(1)} / 5 •{' '}
                        {item.worker.ratingWorkerCount ?? 0}{' '}
                        {isKa ? 'შეფასება' : 'reviews'}
                      </span>

                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <div className="font-semibold text-sm">
                      {isKa ? 'ტექსტი / კომენტარი' : 'Text / comment'}
                    </div>
                  </div>
                  <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                    {item.text || (isKa ? 'ცარიელია.' : 'Empty.')}
                  </div>
                </div>

                {/* Photos */}
                {item.photos.length > 0 && (
                  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-cyan" />
                      <div className="font-semibold text-sm">
                        {isKa ? 'ფოტოები' : 'Photos'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {item.photos.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="block group relative w-full aspect-video overflow-hidden rounded-xl ring-1 ring-white/10"
                        >
                          <img
                            src={src}
                            alt={`photo-${i + 1}`}
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Videos */}
                {item.videos.length > 0 && (
                  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Film className="w-4 h-4 text-sky-400" />
                      <div className="font-semibold text-sm">
                        {isKa ? 'ვიდეო' : 'Video'}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-white/80">
                      {item.videos.map((v, i) => (
                        <a
                          key={i}
                          href={v}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-cyan-300 hover:text-cyan-200 break-all"
                        >
                          {isKa ? 'ვიდეო' : 'Video'} #{i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {item.files.length > 0 && (
                  <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileArchive className="w-4 h-4 text-amber-400" />
                      <div className="font-semibold text-sm">
                        {isKa ? 'ZIP / ფაილები' : 'Files'}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-white/80">
                      {item.files.map((f, i) => (
                        <a
                          key={i}
                          href={f}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-cyan-300 hover:text-cyan-200 break-all"
                        >
                          {isKa ? 'ფაილი' : 'File'} #{i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right – mini task summary + client */}
              <aside className="space-y-4">
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                  <div className="text-xs text-white/60 mb-1">
                    {isKa ? 'დავალების მოკლე ნახვა' : 'Task summary'}
                  </div>
                  <div className="font-semibold text-sm md:text-base leading-snug mb-2">
                    {item.task.title}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/70">
                    <span className="px-2 py-1 rounded-full bg-white/10">
                      {item.task.where === 'REMOTE'
                        ? isKa
                          ? 'დისტანციური'
                          : 'Remote'
                        : isKa
                          ? 'ადგილზე'
                          : 'On-site'}
                    </span>
                    {item.task.exclusive && (
                      <span className="px-2 py-1 rounded-full border border-yellow-400/70 bg-yellow-400/10 text-yellow-300">
                        {isKa ? 'ექსკლუზიური' : 'Exclusive'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                  <div className="text-xs text-white/60 mb-2">
                    {isKa ? 'დამკვეთი' : 'Client'}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10 flex items-center justify-center">
                      {item.client.image ? (
                        <img
                          src={item.client.image}
                          alt="client-avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User2 className="w-5 h-5 text-white/70" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {item.client.name ||
                          item.client.email ||
                          '—'}
                      </div>
                      {item.client.email && (
                        <div className="text-xs text-white/60 truncate">
                          {item.client.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons – უნდა ჩანდეს მხოლოდ incoming-ზე */}
                {isIncoming && (
                  <div className="pt-2 flex flex-wrap gap-3 justify-end">
                    {actionErr && (
                      <div className="w-full text-sm text-red-300 mb-1">
                        {actionErr}
                      </div>
                    )}

                    {item.status === 'APPROVED' ? (
                      <div className="btn-hero-secondary text-sm opacity-70 cursor-default">
                        <span>
                          {isKa ? 'უკვე დადასტურებულია' : 'Already confirmed'}
                        </span>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleConfirm}
                          disabled={busy}
                          className="btn-hero-secondary text-sm disabled:opacity-60"
                        >
                          <span>
                            {busy
                              ? isKa
                                ? 'დადასტურება...'
                                : 'Confirming...'
                              : isKa
                                ? 'დადასტურება'
                                : 'Confirm'}
                          </span>
                        </button>

                        {/* Fix / Reject ჯერჯერობით გამორთული — მერე ავამუშავებთ */}
                        <button
                          type="button"
                          className="btn-evidence-warning text-sm opacity-60 cursor-not-allowed"
                          disabled
                        >
                          <span>{isKa ? 'დახარვეზება' : 'Request fixes'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn-evidence-danger text-sm opacity-60 cursor-not-allowed"
                          disabled
                        >
                          <span>{isKa ? 'უარყოფა' : 'Reject'}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ---------------- Main Page ---------------- */

export default function MyPageProofs({
  params,
}: {
  params: { locale: Locale };
}) {
  const { locale } = params;
  const isKa = locale === 'ka';
  const router = useRouter();
  const search = useSearchParams();

  const initialTab =
    search.get('tab') === 'outgoing' ? 'outgoing' : 'incoming';
  const [tab, setTab] = useState<'incoming' | 'outgoing'>(initialTab);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<EvidenceItem | null>(null);
    const handleEvidenceUpdated = (id: string, patch: Partial<EvidenceItem>) => {
    setItems((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
    );
    setSelected((prev) =>
      prev && prev.id === id ? ({ ...prev, ...patch } as EvidenceItem) : prev,
    );
  };

  const labels = useMemo(
    () => ({
      title: isKa ? 'მტკიცებულებები' : 'Evidence',
      incoming: isKa ? 'ჩემთან გამოგზავნილი' : 'Sent to me',
      outgoing: isKa ? 'ჩემი გაგზავნილი' : 'Sent by me',
      emptyIncoming: isKa
        ? 'ჯერჯერობით არ გაქვს მიღებული მტკიცებულებები.'
        : 'You haven’t received any evidence yet.',
      emptyOutgoing: isKa
        ? 'ჯერჯერობით არ გაქვს გაგზავნილი მტკიცებულებები.'
        : 'You haven’t sent any evidence yet.',
      loading: isKa ? 'იტვირთება…' : 'Loading…',
    }),
    [isKa],
  );

  // tab switch + URL query update
  const changeTab = (next: 'incoming' | 'outgoing') => {
    if (next === tab) return;
    setTab(next);
    setSelected(null); // ტაბის შეცვლაზე მოდალი დაიხუროს
    const sp = new URLSearchParams(search.toString());
    sp.set('tab', next);
    router.replace(`/${locale}/mypage/proofs?${sp.toString()}`);
  };

  // fetch evidences on tab change
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    setItems([]);

    fetch(`/api/my/evidences?tab=${tab}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({} as any));
          throw new Error(j?.error || 'Request failed');
        }
        return r.json() as Promise<EvidenceItem[]>;
      })
      .then((list) => {
        if (!alive) return;
        setItems(list);
      })
      .catch((e: any) => {
        if (!alive) return;
        setErr(e?.message || 'Error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [tab]);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{labels.title}</h1>

      {/* tabs */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => changeTab('incoming')}
          className={
            tab === 'incoming'
              ? 'btn-tab-active text-sm'
              : 'btn-hero-ghost text-sm'
          }
        >
          <span>{labels.incoming}</span>
        </button>

        <button
          type="button"
          onClick={() => changeTab('outgoing')}
          className={
            tab === 'outgoing'
              ? 'btn-tab-active text-sm'
              : 'btn-hero-ghost text-sm'
          }
        >
          <span>{labels.outgoing}</span>
        </button>
      </div>

      {/* content */}
      {loading ? (
        <div className="card p-5 text-sm text-white/70">
          {labels.loading}
        </div>
      ) : err ? (
        <div className="card p-5 text-sm text-red-300">{err}</div>
      ) : items.length === 0 ? (
        <div className="card p-5 text-sm text-white/70">
          {tab === 'incoming'
            ? labels.emptyIncoming
            : labels.emptyOutgoing}
        </div>
      ) : (
        <div className="space-y-4">
{items.map((ev) => (
  <button
    key={ev.id}
    type="button"
    onClick={() => setSelected(ev)}
    className="relative w-full text-left card p-5 md:p-6 hover:bg-white/[0.03] transition group cursor-pointer"
  >
    {/* ცენტრში დიდი შტამპი */}
    {ev.status !== 'PENDING' && (
<div className="pointer-events-none absolute inset-0 flex items-center justify-center pr-24 md:pr-40">
        <div
          className={
            'px-6 py-3 rounded-full border-2 text-xs md:text-sm font-bold tracking-[0.35em] uppercase -rotate-3 ' +
            statusClasses(ev.status)
          }
        >
          {statusLabel(ev.status, isKa)}
        </div>
      </div>
    )}

    {/* შიგთავსი – ძველი left/right, უბრალოდ შუა ბლოკი აღარ არსებობს */}
    <div className="relative flex flex-col lg:flex-row gap-4">
      {/* left – worker & snippet */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10 flex items-center justify-center">
            {ev.worker.image ? (
              <img
                src={ev.worker.image}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User2 className="w-6 h-6 text-white/70" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-white/60">
              {isKa ? 'შემსრულებელი' : 'Worker'}
            </div>
            <div className="font-semibold truncate">
              {ev.worker.name || ev.worker.email || '—'}
            </div>
            {ev.worker.email && (
              <div className="text-xs text-white/60 truncate">
                {ev.worker.email}
              </div>
            )}
          </div>
          <div className="ml-auto text-right text-xs text-white/60">
            <div>{formatDateTime(ev.createdAt, locale)}</div>
            <div>
              {tab === 'incoming'
                ? isKa
                  ? 'მიღებული'
                  : 'Received'
                : isKa
                  ? 'გაგზავნილი'
                  : 'Sent'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/70">
          <StarRow value={ev.worker.ratingWorkerAvg ?? 0} />
          <span>
            {(ev.worker.ratingWorkerAvg ?? 0).toFixed(1)} / 5 •{' '}
            {ev.worker.ratingWorkerCount ?? 0}{' '}
            {isKa ? 'შეფასება' : 'reviews'}
          </span>
        </div>

        {ev.text && (
          <div className="mt-1 text-sm text-white/80 line-clamp-2 group-hover:text-white/90">
            {ev.text}
          </div>
        )}
      </div>

      {/* right – mini task card */}
      <div className="w-full lg:w-[320px] rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 flex flex-col justify-between">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wide text-white/50">
              {isKa ? 'დავალება' : 'Task'}
            </div>
            <div className="font-semibold text-sm md:text-base line-clamp-2">
              {ev.task.title}
            </div>
          </div>
          <div className="ml-2 px-3 py-1 rounded-full bg-cyan/20 text-cyan text-sm font-semibold">
            ₾{ev.task.reward}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
          {ev.task.deadline && (
            <div className="flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-sky-400" />
              <span>{formatShortDeadline(ev.task.deadline, locale)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>
              {ev.task.where === 'REMOTE'
                ? isKa
                  ? 'დისტანციური'
                  : 'Remote'
                : isKa
                  ? 'ადგილზე'
                  : 'On-site'}
            </span>
          </div>
        </div>

        <div className="mt-3 text-xs text-white/50">
          {tab === 'incoming' ? (
            isKa ? (
              'შენი დავალებისთვის გამოგზავნილი.'
            ) : (
              'Sent to your task.'
            )
          ) : (
            <>
              {isKa ? 'დამკვეთი: ' : 'Client: '}
              {ev.client.name || ev.client.email || '—'}
            </>
          )}
        </div>
      </div>
    </div>
  </button>
))}

          
        </div>
      )}

      {selected && (
        <EvidenceModal
          locale={locale}
          item={selected}
          isIncoming={tab === 'incoming'} // აქ გადავცემთ
          onClose={() => setSelected(null)}
          onUpdate={handleEvidenceUpdated}
        />
      )}

    </div>
  );
}
