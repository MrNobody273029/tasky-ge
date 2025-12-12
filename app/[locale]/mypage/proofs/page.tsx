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
  AlertTriangle,
} from 'lucide-react';
import MatrixLoader from '@/components/MatrixLoader';

type Locale = 'ka' | 'en';

type FixForInfo = {
  id: string;
  needsFixesReason: string | null;
  needsFixesAt: string | null;
} | null;

type ReviewMini = {
  stars: number;
  comment: string;
  fromUserId: string;
  createdAt: string;
} | null;

type EvidenceItem = {
  id: string;
  createdAt: string;
  decidedAt: string | null;
  text: string;
  photos: string[];
  videos: string[];
  files: string[];

  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_FIXES' | 'EXPIRED';
  clientReviewed?: boolean;
  workerReviewed?: boolean;

  needsFixesReason?: string | null;
  needsFixesAt?: string | null;
  autoApproved?: boolean;

  fixForId?: string | null;
  fixFor?: FixForInfo;

  workerDecisionSeen?: boolean;
  clientSystemSeen?: boolean;
  workerSawClientReview?: boolean;
  clientSawWorkerReview?: boolean;
  clientSawRatingPrompt?: boolean;
  workerSawRatingPrompt?: boolean;

  clientToWorkerReview: ReviewMini; // client rated worker
  workerToClientReview: ReviewMini; // worker rated client

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
    ratingClientAvg?: number | null;
    ratingClientCount?: number | null;
  };

  client: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    ratingClientAvg?: number | null;
    ratingClientCount?: number | null;
  };
};

const HOURS_96_MS = 96 * 60 * 60 * 1000;

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
    return locale === 'ka' ? `დარჩა ${days} დღე` : `${days} day(s) left`;
  }
  const hours = Math.ceil(ms / 3600000);
  return locale === 'ka' ? `დარჩა ${hours} სთ` : `${hours} hour(s) left`;
}

function fmtCountdown(ms: number, isKa: boolean) {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const totalHr = Math.floor(totalMin / 60);
  const hr = totalHr % 24;
  const days = Math.floor(totalHr / 24);

  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) {
    return isKa
      ? `${days}დ ${pad(hr)}:${pad(min)}:${pad(sec)}`
      : `${days}d ${pad(hr)}:${pad(min)}:${pad(sec)}`;
  }
  return `${pad(totalHr)}:${pad(min)}:${pad(sec)}`;
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

function statusLabel(item: EvidenceItem, isKa: boolean) {
  if (item.status === 'APPROVED' && item.autoApproved) {
    return isKa
      ? 'დადასტურდა პასუხის არ გაცემის გამო'
      : 'Auto-approved (no response)';
  }
  switch (item.status) {
    case 'APPROVED':
      return isKa ? 'დადასტურებულია' : 'Approved';
    case 'NEEDS_FIXES':
      return isKa ? 'დახარვეზებულია' : 'Needs fixes';
    case 'REJECTED':
      return isKa ? 'უარყოფილია' : 'Rejected';
    case 'EXPIRED':
      return isKa ? 'ვადა გავიდა — გაუქმებულია' : 'Expired — cancelled';
    default:
      return '';
  }
}

function statusClasses(item: EvidenceItem) {
  if (item.status === 'EXPIRED') {
    return 'border-rose-500/70 bg-rose-500/10 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.55)]';
  }
  if (item.status === 'APPROVED' && item.autoApproved) {
    return 'border-sky-400/70 bg-sky-400/10 text-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.55)]';
  }
  switch (item.status) {
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

function NotifDot() {
  return (
    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 ring-2 ring-black/80" />
  );
}

async function markSeen(evidenceId: string, kind: string) {
  try {
    await fetch(`/api/evidences/${evidenceId}/seen`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind }),
    });
  } catch {}
}

/* ---------------- Rating Modal (two sections) ---------------- */

function RatingPanel({
  locale,
  title,
  who,
  review,
  emptyText,
}: {
  locale: Locale;
  title: string;
  who: string;
  review: ReviewMini;
  emptyText: string;
}) {
  const isKa = locale === 'ka';
  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-white/50 mb-2">
        {title}
      </div>
      <div className="text-sm font-semibold text-white/90">{who}</div>
      <div className="mt-2">
        {review ? (
          <>
            <div className="flex items-center gap-2">
              <StarRow value={review.stars} />
              <div className="text-xs text-white/60">
                {review.stars} / 5 • {formatDateTime(review.createdAt, locale)}
              </div>
            </div>
            <div className="mt-2 text-sm text-white/85 whitespace-pre-wrap">
              {review.comment?.trim() ? review.comment : (isKa ? 'კომენტარი არ დაუტოვებია.' : 'No comment.')}
            </div>
          </>
        ) : (
          <div className="text-sm text-white/70">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function SubmitRatingPanel({
  locale,
  title,
  targetName,
  disabled,
  busy,
  onSubmit,
}: {
  locale: Locale;
  title: string;
  targetName: string;
  disabled: boolean;
  busy: boolean;
  onSubmit: (stars: number, comment: string) => void;
}) {
  const isKa = locale === 'ka';
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
      <div className="text-xs uppercase tracking-wide text-white/50 mb-2">
        {title}
      </div>

      <div className="text-sm font-semibold text-white/90">
        {targetName}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => {
          const n = i + 1;
          const active = n <= stars;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              className="p-1"
              disabled={disabled || busy}
              aria-label={`star-${n}`}
            >
              <Star
                className={
                  'w-8 h-8 ' +
                  (active
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-white/30')
                }
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <textarea
          className="w-full min-h-[96px] rounded-xl bg-white/5 ring-1 ring-white/10 p-3 text-sm text-white/90 outline-none focus:ring-cyan/40"
          placeholder={isKa ? 'კომენტარი (არასავალდებულო)' : 'Comment (optional)'}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={disabled || busy}
        />
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={disabled || busy}
          className="btn-hero-secondary text-sm disabled:opacity-60"
          data-text={busy ? (isKa ? 'იგზავნება...' : 'Submitting...') : (isKa ? 'გაგზავნა' : 'Submit')}
          onClick={() => onSubmit(stars, comment)}
        >
          <span className="btn-text">
            {busy ? (isKa ? 'იგზავნება...' : 'Submitting...') : (isKa ? 'გაგზავნა' : 'Submit')}
          </span>
        </button>
      </div>

      {disabled && (
        <div className="mt-2 text-xs text-white/55">
          {isKa ? 'უკვე შეფასებულია — შეცვლა აღარ შეიძლება.' : 'Already rated — cannot edit.'}
        </div>
      )}
    </div>
  );
}

function RatingModal({
  locale,
  item,
  tab,
  onClose,
  onLocalPatch,
}: {
  locale: Locale;
  item: EvidenceItem;
  tab: 'incoming' | 'outgoing';
  onClose: () => void;
  onLocalPatch: (patch: Partial<EvidenceItem>) => void;
}) {
  const isKa = locale === 'ka';
  const isWorker = tab === 'outgoing';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const workerName = item.worker.name || item.worker.email || item.worker.id;
  const clientName = item.client.name || item.client.email || item.client.id;

  const canRate =
    item.status === 'APPROVED' || item.status === 'EXPIRED';

  // notify seen when opened
  useEffect(() => {
    (async () => {
      if (item.status === 'EXPIRED') {
        if (isWorker && item.workerSawRatingPrompt === false) {
          await markSeen(item.id, 'worker_rating_prompt');
          onLocalPatch({ workerSawRatingPrompt: true });
        }
        if (!isWorker && item.clientSawRatingPrompt === false) {
          await markSeen(item.id, 'client_rating_prompt');
          onLocalPatch({ clientSawRatingPrompt: true });
        }
      }

      if (isWorker && item.workerSawClientReview === false) {
        await markSeen(item.id, 'worker_client_review');
        onLocalPatch({ workerSawClientReview: true });
      }
      if (!isWorker && item.clientSawWorkerReview === false) {
        await markSeen(item.id, 'client_worker_review');
        onLocalPatch({ clientSawWorkerReview: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myReviewDone = isWorker ? Boolean(item.workerReviewed) : Boolean(item.clientReviewed);

  async function submitMyRating(stars: number, comment: string) {
    if (!canRate) return;
    if (busy) return;
    setBusy(true);
    setErr(null);

    try {
      if (isWorker) {
        // worker rates client
        const res = await fetch('/api/reviews/client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUserId: item.client.id,
            taskId: item.task.id,
            evidenceId: item.id,
            stars,
            comment,
          }),
        });
        const j = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          setErr(j?.error || 'Rating failed');
          setBusy(false);
          return;
        }
        onLocalPatch({ workerReviewed: true });

        try { window.dispatchEvent(new CustomEvent('evidences-updated')); } catch {}
      } else {
        // client rates worker (your existing endpoint)
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUserId: item.worker.id,
            taskId: item.task.id,
            evidenceId: item.id,
            stars,
            comment,
          }),
        });
        const j = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          setErr(j?.error || 'Rating failed');
          setBusy(false);
          return;
        }
        onLocalPatch({ clientReviewed: true });

        try { window.dispatchEvent(new CustomEvent('evidences-updated')); } catch {}
      }
    } catch (e: any) {
      setErr(String(e?.message || e) || 'Rating failed');
    } finally {
      setBusy(false);
    }
  }

  const topTitle = isKa ? 'შენთვის მიღებული შეფასება' : 'Rating you received';
  const bottomTitle = isKa ? 'შენგან გასაგზავნი შეფასება' : 'Your rating to send';

  const receivedReview = isWorker ? item.clientToWorkerReview : item.workerToClientReview;
  const receivedWho = isWorker ? clientName : workerName;

  const myTarget = isWorker ? clientName : workerName;

  const emptyReceived = isKa
    ? 'ამ მომხმარებელს ჯერ შეფასება არ გაუგზავნია.'
    : 'No rating from this user yet.';

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <div className="card w-full max-w-[720px] p-5 md:p-6 rounded-2xl ring-1 ring-cyan/30 bg-[#0b0f16]/95">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg md:text-xl font-bold">
              {isKa ? 'შეფასებები' : 'Ratings'}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
          <RatingPanel
            locale={locale}
            title={topTitle}
            who={receivedWho}
            review={receivedReview /* აქ ჩასვი რეალური ობიექტი */ }
            emptyText={emptyReceived}
          />


            <SubmitRatingPanel
              locale={locale}
              title={bottomTitle}
              targetName={myTarget}
              disabled={!canRate || myReviewDone}
              busy={busy}
              onSubmit={submitMyRating}
            />

            {err && (
              <div className="flex items-center gap-2 text-sm text-red-300">
                <AlertTriangle className="w-4 h-4" />
                <span>{err}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Defect Modal (Needs fixes) ---------------- */

function DefectModal({
  locale,
  item,
  tab,
  onClose,
  onLocalPatch,
  onResubmit,
}: {
  locale: Locale;
  item: EvidenceItem;
  tab: 'incoming' | 'outgoing';
  onClose: () => void;
  onLocalPatch: (patch: Partial<EvidenceItem>) => void;
  onResubmit: () => void;
}) {
  const isKa = locale === 'ka';
  const isWorker = tab === 'outgoing';

  useEffect(() => {
    (async () => {
      // worker should mark decision seen when opening defect modal
      if (isWorker && item.workerDecisionSeen === false) {
        await markSeen(item.id, 'worker_decision');
        onLocalPatch({ workerDecisionSeen: true });
        try { window.dispatchEvent(new CustomEvent('evidences-updated')); } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reason = item.needsFixesReason?.trim() || (isKa ? 'ხარვეზი არ მოიძებნა.' : 'Fix reason not found.');

  return (
    <div className="fixed inset-0 z-[75]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <div className="card w-full max-w-[720px] p-5 md:p-6 rounded-2xl ring-1 ring-amber-400/30 bg-[#0b0f16]/95">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg md:text-xl font-bold">
              {isKa ? 'ხარვეზის ნახვა' : 'View defect'}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/30 p-4">
            <div className="text-xs text-amber-200 mb-2">
              {isKa ? 'დამკვეთის კომენტარი' : 'Client comment'}
            </div>
            <div className="text-sm text-white/85 whitespace-pre-wrap">
              {reason}
            </div>
          </div>

          {isWorker && item.status === 'NEEDS_FIXES' && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onResubmit}
                className="btn-hero-ghost btn-topbar-solid text-sm relative"
                data-text={isKa ? 'ხელახლა გაგზავნა' : 'Resubmit'}
              >
                <span className="btn-text">{isKa ? 'ხელახლა გაგზავნა' : 'Resubmit'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Evidence Modal (details + client actions) ---------------- */

function NeedsFixesModal({
  locale,
  onClose,
  onSubmit,
  busy,
}: {
  locale: Locale;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  busy: boolean;
}) {
  const isKa = locale === 'ka';
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <div className="card w-full max-w-[640px] p-5 md:p-6 rounded-2xl ring-1 ring-amber-400/30 bg-[#0b0f16]/95">
          <div className="text-xs uppercase tracking-wide text-white/50 mb-2">
            {isKa ? 'დახარვეზება (ერთხელ)' : 'Needs fixes (once)'}
          </div>
          <div className="text-lg md:text-xl font-bold">
            {isKa
              ? 'დაწერე რა უნდა გამოასწოროს შემსრულებელმა'
              : 'Write what the worker must fix'}
          </div>

          <div className="mt-4">
            <textarea
              className="w-full min-h-[140px] rounded-xl bg-white/5 ring-1 ring-white/10 p-3 text-sm text-white/90 outline-none focus:ring-amber-400/40"
              placeholder={isKa ? 'მიზეზი / მითითებები...' : 'Reason / instructions...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              className="btn-hero-ghost text-sm disabled:opacity-60"
              data-text={isKa ? 'გაუქმება' : 'Cancel'}
              onClick={onClose}
            >
              <span className="btn-text">{isKa ? 'გაუქმება' : 'Cancel'}</span>
            </button>

            <button
              type="button"
              disabled={busy || !reason.trim()}
              className="btn-evidence-warning text-sm disabled:opacity-60"
              onClick={() => onSubmit(reason.trim())}
            >
              <span>{busy ? (isKa ? 'იგზავნება...' : 'Submitting...') : (isKa ? 'გაგზავნა' : 'Submit')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceModal({
  locale,
  item,
  tab,
  canNeedsFixes,
  onClose,
  onUpdate,
  onOpenRating,
  onOpenDefect,
}: {
  locale: Locale;
  item: EvidenceItem;
  tab: 'incoming' | 'outgoing';
  canNeedsFixes: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<EvidenceItem>) => void;
  onOpenRating: () => void;
  onOpenDefect: () => void;
}) {
  const isKa = locale === 'ka';
  const isIncoming = tab === 'incoming';
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [showNeedsFixes, setShowNeedsFixes] = useState(false);

  const confirmLabel = busy
    ? (isKa ? 'დადასტურება...' : 'Confirming...')
    : (isKa ? 'დადასტურება' : 'Confirm');

  const isExpired = item.status === 'EXPIRED';
  const isDoneApproved = item.status === 'APPROVED';
  const isDoneNeedsFixes = item.status === 'NEEDS_FIXES';
  const isDoneRejected = item.status === 'REJECTED';

  // mark seen for system/worker decision when opening details
  useEffect(() => {
    (async () => {
      if (tab === 'outgoing') {
        if (
          (item.status === 'APPROVED' || item.status === 'NEEDS_FIXES' || item.status === 'EXPIRED') &&
          item.workerDecisionSeen === false
        ) {
          await markSeen(item.id, 'worker_decision');
          onUpdate(item.id, { workerDecisionSeen: true });
          try { window.dispatchEvent(new CustomEvent('evidences-updated')); } catch {}
        }
      } else {
        if (
          (item.status === 'APPROVED' || item.status === 'EXPIRED') &&
          item.clientSystemSeen === false
        ) {
          await markSeen(item.id, 'client_system');
          onUpdate(item.id, { clientSystemSeen: true });
          try { window.dispatchEvent(new CustomEvent('evidences-updated')); } catch {}
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirm() {
    if (!isIncoming) return;
    if (busy) return;
    if (isExpired) return;

    setBusy(true);
    setActionErr(null);

    try {
      const res = await fetch(`/api/evidences/${item.id}/confirm`, { method: 'POST' });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setActionErr(j?.error || 'Request failed');
        setBusy(false);
        return;
      }

      onUpdate(item.id, { status: 'APPROVED', autoApproved: false });

      try { window.dispatchEvent(new CustomEvent('evidences-updated')); } catch {}

      // keep your old flow: mandatory rating happens elsewhere (you already had it),
      // but now we simply open rating modal for consistency
      onOpenRating();
      onClose();
    } catch (e: any) {
      setActionErr(String(e?.message || e) || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendNeedsFixes(reason: string) {
    if (!isIncoming) return;
    if (busy) return;
    if (isExpired) return;

    setBusy(true);
    setActionErr(null);

    try {
      const res = await fetch(`/api/evidences/${item.id}/needs-fixes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setActionErr(j?.error || 'Request failed');
        setBusy(false);
        return;
      }

      onUpdate(item.id, {
        status: 'NEEDS_FIXES',
        needsFixesReason: reason,
        needsFixesAt: new Date().toISOString(),
      });

      try { window.dispatchEvent(new CustomEvent('evidences-updated')); } catch {}
      setShowNeedsFixes(false);
    } catch (e: any) {
      setActionErr(String(e?.message || e) || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex items-start justify-center h-full overflow-y-auto">
        <div className="w-full max-w-[1000px] px-4 md:px-0 py-10">
          <div className="relative card rounded-2xl bg-[#0b0f16]/95 ring-1 ring-cyan/30 p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

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
                    ? isKa ? 'დისტანციური' : 'Remote'
                    : isKa ? 'ადგილზე' : 'On-site'}
                </span>
              </div>
            </div>

            {/* Fix reason for resubmission (child evidence) */}
            {item.fixFor?.needsFixesReason && (
              <div className="mt-5 rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/30 p-4">
                <div className="text-xs text-amber-200 mb-2">
                  {isKa ? 'დამკვეთის წარდგენილი ხარვეზი' : 'Client requested fixes'}
                </div>
                <div className="text-sm text-white/85 whitespace-pre-wrap">
                  {item.fixFor.needsFixesReason}
                </div>
              </div>
            )}

            <div className="mt-5 grid lg:grid-cols-[1.4fr,1fr] gap-6">
              {/* Left */}
              <div className="space-y-5">
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                  <div className="text-xs text-white/60 mb-2">
                    {isKa ? 'შემსრულებელი' : 'Worker'}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10 flex items-center justify-center">
                      {item.worker.image ? (
                        <img src={item.worker.image} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User2 className="w-6 h-6 text-white/70" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {item.worker.name || item.worker.email || '—'}
                      </div>
                      {item.worker.email && (
                        <div className="text-xs text-white/60 truncate">{item.worker.email}</div>
                      )}
                    </div>
                    <div className="ml-auto text-right text-xs text-white/60">
                      <div>{formatDateTime(item.createdAt, locale)}</div>
                      <div>{isKa ? 'გამოგზავნის დრო' : 'Submitted at'}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs md:text-sm text-white/70">
                    <div className="flex items-center gap-2">
                      <StarRow value={item.worker.ratingWorkerAvg ?? 0} />
                      <span>
                        {(item.worker.ratingWorkerAvg ?? 0).toFixed(1)} / 5 •{' '}
                        {item.worker.ratingWorkerCount ?? 0} {isKa ? 'შეფასება' : 'reviews'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Needs fixes reason on same evidence */}
                {item.status === 'NEEDS_FIXES' && item.needsFixesReason && (
                  <div className="rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/30 p-4">
                    <div className="text-xs text-amber-200 mb-2">
                      {isKa ? 'დახარვეზების მიზეზი' : 'Fixes requested'}
                    </div>
                    <div className="text-sm text-white/85 whitespace-pre-wrap">
                      {item.needsFixesReason}
                    </div>
                  </div>
                )}

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

              {/* Right */}
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
                        ? isKa ? 'დისტანციური' : 'Remote'
                        : isKa ? 'ადგილზე' : 'On-site'}
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
                        <img src={item.client.image} alt="client-avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User2 className="w-5 h-5 text-white/70" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {item.client.name || item.client.email || '—'}
                      </div>
                      {item.client.email && (
                        <div className="text-xs text-white/60 truncate">
                          {item.client.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="pt-2 flex flex-wrap gap-3 justify-end">
                  {actionErr && (
                    <div className="w-full text-sm text-red-300 mb-1">
                      {actionErr}
                    </div>
                  )}

                  {/* When expired: only view rating is allowed */}
                  {isExpired && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRating();
                        onClose();
                      }}
                      className="btn-hero-secondary text-sm relative"
                      data-text={isKa ? 'შეფასების ნახვა' : 'View rating'}
                    >
                      <span className="btn-text">{isKa ? 'შეფასების ნახვა' : 'View rating'}</span>
                    </button>
                  )}

                  {/* approved: view rating */}
                  {isDoneApproved && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRating();
                        onClose();
                      }}
                      className="btn-hero-secondary text-sm relative"
                      data-text={isKa ? 'შეფასების ნახვა' : 'View rating'}
                    >
                      <span className="btn-text">{isKa ? 'შეფასების ნახვა' : 'View rating'}</span>
                    </button>
                  )}

                  {/* needs fixes: view defect */}
                  {isDoneNeedsFixes && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDefect();
                        onClose();
                      }}
                      className="btn-evidence-warning text-sm relative"
                    >
                      <span>{isKa ? 'ხარვეზის ნახვა' : 'View defect'}</span>
                    </button>
                  )}

                  {/* rejected: no actions */}
                  {isDoneRejected && (
                    <div className="btn-hero-secondary text-sm opacity-70 cursor-default">
                      <span>{isKa ? 'უარყოფილია' : 'Rejected'}</span>
                    </div>
                  )}

                  {/* PENDING actions for incoming only */}
                  {isIncoming && item.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={busy}
                        className="btn-hero-secondary text-sm disabled:opacity-60"
                        data-text={confirmLabel}
                      >
                        <span className="btn-text">{confirmLabel}</span>
                      </button>

                      <button
                        type="button"
                        disabled={busy || !canNeedsFixes}
                        className={
                          canNeedsFixes
                            ? 'btn-evidence-warning text-sm disabled:opacity-60'
                            : 'btn-evidence-warning text-sm opacity-60 cursor-not-allowed'
                        }
                        onClick={() => {
                          if (!canNeedsFixes) return;
                          setShowNeedsFixes(true);
                        }}
                      >
                        <span>{isKa ? 'დახარვეზება' : 'Request fixes'}</span>
                      </button>
                    </>
                  )}
                </div>
              </aside>
            </div>

            {showNeedsFixes && (
              <NeedsFixesModal
                locale={locale}
                busy={busy}
                onClose={() => setShowNeedsFixes(false)}
                onSubmit={(reason) => sendNeedsFixes(reason)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main Page ---------------- */

export default function MyPageProofs({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const isKa = locale === 'ka';
  const router = useRouter();
  const search = useSearchParams();

  const initialTab = search.get('tab') === 'outgoing' ? 'outgoing' : 'incoming';
  const [tab, setTab] = useState<'incoming' | 'outgoing'>(initialTab);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<EvidenceItem | null>(null);
  const [ratingTarget, setRatingTarget] = useState<EvidenceItem | null>(null);
  const [defectTarget, setDefectTarget] = useState<EvidenceItem | null>(null);

  // live ticker for countdown
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

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
      countdownClient: isKa ? 'დამკვეთს დარჩა პასუხის გასაცემად:' : 'Client time to respond:',
      countdownAutoApprove: isKa ? 'ავტომატური დადასტურება:' : 'Auto-approve in:',
      countdownFixesWorker: isKa ? 'შემსრულებელს დარჩა ხარვეზის გამოსასწორებლად:' : 'Worker time to fix:',
      countdownFixesYou: isKa ? 'შენ დაგრჩა ხარვეზის გამოსასწორებლად:' : 'Your time to fix:',
      viewRating: isKa ? 'შეფასების ნახვა' : 'View rating',
      viewDefect: isKa ? 'ხარვეზის ნახვა' : 'View defect',
    }),
    [isKa],
  );

  const changeTab = (next: 'incoming' | 'outgoing') => {
    if (next === tab) return;
    setTab(next);
    setSelected(null);
    setRatingTarget(null);
    setDefectTarget(null);
    const sp = new URLSearchParams(search.toString());
    sp.set('tab', next);
    router.replace(`/${locale}/mypage/proofs?${sp.toString()}`);
  };

  const handleEvidenceUpdated = (id: string, patch: Partial<EvidenceItem>) => {
    setItems((prev) => prev.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)));
    setSelected((prev) => (prev && prev.id === id ? ({ ...prev, ...patch } as EvidenceItem) : prev));
    setRatingTarget((prev) => (prev && prev.id === id ? ({ ...prev, ...patch } as EvidenceItem) : prev));
    setDefectTarget((prev) => (prev && prev.id === id ? ({ ...prev, ...patch } as EvidenceItem) : prev));
  };

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

  // UI rule: needs fixes only once per task+worker (incoming only)
  const canNeedsFixesForSelected = useMemo(() => {
    if (!selected) return false;
    if (tab !== 'incoming') return false;
    if (selected.status !== 'PENDING') return false;

    const already = items.some(
      (x) =>
        x.task?.id === selected.task?.id &&
        x.worker?.id === selected.worker?.id &&
        x.status === 'NEEDS_FIXES',
    );
    return !already;
  }, [selected, items, tab]);

  const empty = !loading && !err && items.length === 0;

  const openRating = (ev: EvidenceItem) => {
    setRatingTarget(ev);
  };

  const openDefect = (ev: EvidenceItem) => {
    setDefectTarget(ev);
  };

  const goResubmit = (ev: EvidenceItem) => {
    // resubmit for NEEDS_FIXES evidence id
    router.push(`/${locale}/mypage/proofs/submit?task=${encodeURIComponent(ev.task.id)}&fixFor=${encodeURIComponent(ev.id)}`);
  };

  function countdownInfo(ev: EvidenceItem) {
    // uses tick to re-render
    void tick;

    if (ev.status === 'PENDING') {
      const created = new Date(ev.createdAt).getTime();
      const deadline = created + HOURS_96_MS;
      const remaining = deadline - Date.now();

      // show for both sides:
      // incoming (client) -> auto-approve in; outgoing (worker) -> client time to respond
      if (tab === 'incoming') {
        return { show: true, label: labels.countdownAutoApprove, remaining };
      }
      return { show: true, label: labels.countdownClient, remaining };
    }

    if (ev.status === 'NEEDS_FIXES') {
      const base = ev.needsFixesAt ? new Date(ev.needsFixesAt).getTime() : new Date(ev.createdAt).getTime();
      const deadline = base + HOURS_96_MS;
      const remaining = deadline - Date.now();

      if (tab === 'incoming') {
        return { show: true, label: labels.countdownFixesWorker, remaining };
      }
      return { show: true, label: labels.countdownFixesYou, remaining };
    }

    return { show: false, label: '', remaining: 0 };
  }

  function hasRatingNotif(ev: EvidenceItem) {
    if (tab === 'outgoing') {
      const byClient = ev.workerSawClientReview === false;
      const expiredPrompt = ev.status === 'EXPIRED' && ev.workerSawRatingPrompt === false;
      return Boolean(byClient || expiredPrompt);
    }
    const byWorker = ev.clientSawWorkerReview === false;
    const expiredPrompt = ev.status === 'EXPIRED' && ev.clientSawRatingPrompt === false;
    return Boolean(byWorker || expiredPrompt);
  }

  function hasDefectNotif(ev: EvidenceItem) {
    if (tab === 'outgoing') {
      // worker sees client decision (NEEDS_FIXES) as notif
      return ev.status === 'NEEDS_FIXES' && ev.workerDecisionSeen === false;
    }
    return false;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{labels.title}</h1>

      {/* tabs */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => changeTab('incoming')}
          className={tab === 'incoming' ? 'btn-tab-active text-sm' : 'btn-hero-ghost text-sm'}
          data-text={labels.incoming}
        >
          <span className="btn-text">{labels.incoming}</span>
        </button>

        <button
          type="button"
          onClick={() => changeTab('outgoing')}
          className={tab === 'outgoing' ? 'btn-tab-active text-sm' : 'btn-hero-ghost text-sm'}
          data-text={labels.outgoing}
        >
          <span className="btn-text">{labels.outgoing}</span>
        </button>
      </div>

      {loading ? (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/80">
          <MatrixLoader />
        </div>
      ) : err ? (
        <div className="card p-5 text-sm text-red-300">{err}</div>
      ) : empty ? (
        <div className="card p-5 text-sm text-white/70">
          {tab === 'incoming' ? labels.emptyIncoming : labels.emptyOutgoing}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((ev) => {
            const cd = countdownInfo(ev);
            const showCountdown = cd.show && (ev.status === 'PENDING' || ev.status === 'NEEDS_FIXES') && cd.remaining > 0;

            const showStamp = ev.status !== 'PENDING';
            const canOpenDefectBtn = ev.status === 'NEEDS_FIXES';
            const canOpenRatingBtn = ev.status === 'APPROVED' || ev.status === 'EXPIRED';

            return (
              <div
                key={ev.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(ev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelected(ev);
                }}
                className="relative w-full text-left card p-5 md:p-6 hover:bg-white/[0.03] transition group cursor-pointer"
              >
                {/* big stamp when not pending */}
                {showStamp && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center pr-24 md:pr-40">
                    <div
                      className={
                        'px-6 py-3 rounded-full border-2 text-xs md:text-sm font-bold tracking-[0.35em] uppercase -rotate-3 ' +
                        statusClasses(ev)
                      }
                    >
                      {statusLabel(ev, isKa)}
                    </div>
                  </div>
                )}

                <div className="relative flex flex-col lg:flex-row gap-4">
                  {/* left */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10 flex items-center justify-center">
                        {ev.worker.image ? (
                          <img src={ev.worker.image} alt="avatar" className="w-full h-full object-cover" />
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
                            ? isKa ? 'მიღებული' : 'Received'
                            : isKa ? 'გაგზავნილი' : 'Sent'}
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

                    {showCountdown && (
                      <div className="text-xs text-white/70">
                        <span className="text-white/50">{cd.label}</span>{' '}
                        <span className="font-semibold text-sky-300">
                          {fmtCountdown(cd.remaining, isKa)}
                        </span>
                      </div>
                    )}

                    {ev.text && (
                      <div className="mt-1 text-sm text-white/80 line-clamp-2 group-hover:text-white/90">
                        {ev.text}
                      </div>
                    )}
                  </div>

                  {/* right mini task */}
                  <div className="w-full lg:w-[340px] rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 flex flex-col justify-between">
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
                            ? isKa ? 'დისტანციური' : 'Remote'
                            : isKa ? 'ადგილზე' : 'On-site'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-white/50">
                      {tab === 'incoming'
                        ? (isKa ? 'შენი დავალებისთვის გამოგზავნილი.' : 'Sent to your task.')
                        : (
                          <>
                            {isKa ? 'დამკვეთი: ' : 'Client: '}
                            {ev.client.name || ev.client.email || '—'}
                          </>
                        )}
                    </div>

                    {/* Buttons (do not open details) */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-end">
                      {canOpenDefectBtn && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDefect(ev);
                          }}
                          className="btn-evidence-warning text-xs relative"
                        >
                          <span>{labels.viewDefect}</span>
                          {hasDefectNotif(ev) && <NotifDot />}
                        </button>
                      )}

                      {canOpenRatingBtn && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRating(ev);
                          }}
                          className="btn-hero-secondary text-xs relative"
                          data-text={labels.viewRating}
                        >
                          <span className="btn-text">{labels.viewRating}</span>
                          {hasRatingNotif(ev) && <NotifDot />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details modal */}
      {selected && (
        <EvidenceModal
          locale={locale}
          item={selected}
          tab={tab}
          canNeedsFixes={canNeedsFixesForSelected}
          onClose={() => setSelected(null)}
          onUpdate={handleEvidenceUpdated}
          onOpenRating={() => openRating(selected)}
          onOpenDefect={() => openDefect(selected)}
        />
      )}

      {/* Rating modal */}
      {ratingTarget && (
        <RatingModal
          locale={locale}
          item={ratingTarget}
          tab={tab}
          onClose={() => setRatingTarget(null)}
          onLocalPatch={(patch) => handleEvidenceUpdated(ratingTarget.id, patch)}
        />
      )}

      {/* Defect modal */}
      {defectTarget && (
        <DefectModal
          locale={locale}
          item={defectTarget}
          tab={tab}
          onClose={() => setDefectTarget(null)}
          onLocalPatch={(patch) => handleEvidenceUpdated(defectTarget.id, patch)}
          onResubmit={() => goResubmit(defectTarget)}
        />
      )}
    </div>
  );
}
