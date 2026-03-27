

'use client';

import { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react';
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
  Gavel,
  ShieldAlert,
  UploadCloud,
} from 'lucide-react';
import MatrixLoader from '@/components/MatrixLoader';

type Locale = 'ka' | 'en';

/** ---- Dispute types (optional fields from backend; safe if missing) ---- */
type DisputeStatus =
  | 'NONE' // UI convenience when dispute is null
  | 'OPEN'
  | 'WAITING_OTHER'
  | 'BOTH_SUBMITTED'
  | 'SENT'
  | 'RESOLVED'
  | 'CANCELLED';

type DisputeInfo = {
  status: DisputeStatus;
  startedAt: string | null; // ISO
  deadlineAt: string | null; // ISO (optional server-provided)
  resultText?: string | null; // admin/arb decision summary
  splitJson?: string | null; // ✅ ADD
  resolvedAt?: string | null;
  // "seen" flags so we can show notification dots if backend provides them
  clientSeen?: boolean;
  workerSeen?: boolean;
  // submissions presence (server may send)
  clientSubmitted?: boolean;
  workerSubmitted?: boolean;
} | null;
type DisputeSideFull = {
  submitted: boolean;
  text: string;
  photos: string[];
  videos: string[];
  files: string[];
};

type DisputeFull = {
  status: DisputeStatus;
  startedAt: string | null;
  deadlineAt: string | null;
  resultText?: string | null;
  splitJson?: string | null;
  resolvedAt?: string | null;
  clientSeen?: boolean;
  workerSeen?: boolean;
  clientSubmitted?: boolean;
  workerSubmitted?: boolean;
  client: DisputeSideFull;
  worker: DisputeSideFull;
  hideOtherSide?: boolean;
} | null;
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
clientSubmitted?: boolean;
workerSubmitted?: boolean;
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
  fixResubmittedOnTime?: boolean;

  /** dispute fields (optional) */
  dispute?: DisputeInfo;

  clientEvidenceSeen?: boolean;

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

/** Dispute reply window = 4 days */
const HOURS_4D_MS = 96 * 60 * 60 * 1000;

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
type SplitParsed = {
  outcome?: 'CLIENT' | 'WORKER' | 'SPLIT';
  reward?: number;
  commission?: number;
  totalPaid?: number;
  workerAmount?: number;
  clientAmount?: number;
  workerPct?: number | null;
  clientPct?: number | null;
};

function parseSplitJson(raw?: string | null): SplitParsed | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object') return null;
    return j as SplitParsed;
  } catch {
    return null;
  }
}

function formatDecisionLine(args: {
  isKa: boolean;
  reward: number;
  clientName: string;
  workerName: string;
  sp: SplitParsed | null;
}) {
  const { isKa, reward, clientName, workerName, sp } = args;

  const outcome = sp?.outcome;
  const wAmt = Number(sp?.workerAmount ?? 0);
  const cAmt = Number(sp?.clientAmount ?? 0);

  if (outcome === 'CLIENT') {
    return {
      badge: isKa ? 'გაიმარჯვა დამკვეთმა' : 'Client wins',
      lines: [
        `${clientName}: ₾${cAmt || reward}`,
        `${workerName}: ₾${wAmt || 0}`,
      ],
      tone: 'emerald' as const,
    };
  }

  if (outcome === 'WORKER') {
    return {
      badge: isKa ? 'გაიმარჯვა შემსრულებელმა' : 'Worker wins',
      lines: [
        `${workerName}: ₾${wAmt || reward}`,
        `${clientName}: ₾${cAmt || 0}`,
      ],
      tone: 'cyan' as const,
    };
  }

  if (outcome === 'SPLIT') {
    const wp = sp?.workerPct ?? null;
    const cp = sp?.clientPct ?? null;
    const wLine = wp != null ? `${workerName}: ${wp}% (₾${wAmt})` : `${workerName}: ₾${wAmt}`;
    const cLine = cp != null ? `${clientName}: ${cp}% (₾${cAmt})` : `${clientName}: ₾${cAmt}`;
    return {
      badge: isKa ? 'თანხა გაიყო' : 'Amount split',
      lines: [wLine, cLine],
      tone: 'fuchsia' as const,
    };
  }

  // fallback: only text
  return {
    badge: isKa ? 'არბიტრაჟის გადაწყვეტილება' : 'Arbitration decision',
    lines: [],
    tone: 'emerald' as const,
  };
}

function decisionToneClasses(tone: 'emerald' | 'cyan' | 'fuchsia') {
  if (tone === 'cyan') return 'bg-cyan/15 ring-1 ring-cyan/25 text-cyan';
  if (tone === 'fuchsia') return 'bg-fuchsia-500/15 ring-1 ring-fuchsia-400/25 text-fuchsia-200';
  return 'bg-emerald-500/10 ring-1 ring-emerald-400/20 text-emerald-200';
}

function statusLabel(item: EvidenceItem, isKa: boolean) {
  if (item.dispute?.status && item.dispute.status !== 'NONE' && item.dispute.status !== 'RESOLVED') {
    return isKa ? 'დავა დაწყებულია' : 'Dispute started';
  }
  if (item.dispute?.status === 'RESOLVED') {
    return isKa ? 'დავის პასუხი მიღებულია' : 'Dispute resolved';
  }

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
  // dispute overrides visual stamp
  if (item.dispute?.status && item.dispute.status !== 'NONE' && item.dispute.status !== 'RESOLVED') {
    return 'border-fuchsia-400/70 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_14px_rgba(217,70,239,0.55)]';
  }
  if (item.dispute?.status === 'RESOLVED') {
    return 'border-emerald-400/70 bg-emerald-400/10 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.55)]';
  }

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

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    const msg = (data as any)?.error || 'Request failed';
    throw new Error(msg);
  }
  return data as T;
}

/* ---------------- Cloudinary sign+upload (same flow as submit page) ---------------- */

type ResourceKind = 'image' | 'video' | 'raw';

async function getSignature(kind: ResourceKind, folder: string) {
  const res = await fetch(
    `/api/cloudinary/sign?type=${kind}&folder=${encodeURIComponent(folder)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error('sign_failed');
  return (await res.json()) as {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    resourceType: ResourceKind;
  };
}

async function uploadToCloudinary(file: File, kind: ResourceKind, folder: string) {
  const sig = await getSignature(kind, folder);
  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;

  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', sig.apiKey);
  fd.append('timestamp', String(sig.timestamp));
  fd.append('signature', sig.signature);
  fd.append('folder', sig.folder);

  const up = await fetch(endpoint, { method: 'POST', body: fd });
  const j = await up.json();
  if (!up.ok || !j?.secure_url) throw new Error(j?.error?.message || 'upload_failed');
  return j.secure_url as string;
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
              {review.comment?.trim()
                ? review.comment
                : isKa
                  ? 'კომენტარი არ დაუტოვებია.'
                  : 'No comment.'}
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

      <div className="text-sm font-semibold text-white/90">{targetName}</div>

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
          data-text={
            busy
              ? isKa
                ? 'იგზავნება...'
                : 'Submitting...'
              : isKa
                ? 'გაგზავნა'
                : 'Submit'
          }
          onClick={() => onSubmit(stars, comment)}
        >
          <span className="btn-text">
            {busy
              ? isKa
                ? 'იგზავნება...'
                : 'Submitting...'
              : isKa
                ? 'გაგზავნა'
                : 'Submit'}
          </span>
        </button>
      </div>

      {disabled && (
        <div className="mt-2 text-xs text-white/55">
          {isKa
            ? 'უკვე შეფასებულია — შეცვლა აღარ შეიძლება.'
            : 'Already rated — cannot edit.'}
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
  item.status === 'APPROVED' ||
  item.status === 'EXPIRED' ||
  Boolean(item.dispute?.splitJson) ||
  Boolean(item.dispute?.resultText);

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

  const myReviewDone = isWorker
    ? Boolean(item.workerReviewed)
    : Boolean(item.clientReviewed);

  async function submitMyRating(stars: number, comment: string) {
    if (!canRate) return;
    if (busy) return;
    setBusy(true);
    setErr(null);

    try {
      if (isWorker) {
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

        onLocalPatch({
          workerReviewed: true,
          workerToClientReview: {
            stars,
            comment,
            fromUserId: '',
            createdAt: new Date().toISOString(),
          },
        } as any);

        try {
          window.dispatchEvent(new CustomEvent('evidences-updated'));
        } catch {}
      } else {
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

        onLocalPatch({
          clientReviewed: true,
          clientToWorkerReview: {
            stars,
            comment,
            fromUserId: '',
            createdAt: new Date().toISOString(),
          },
        } as any);

        try {
          window.dispatchEvent(new CustomEvent('evidences-updated'));
        } catch {}
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
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
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
              review={receivedReview}
              emptyText={emptyReceived}
            />

            {canRate && !myReviewDone ? (
              <SubmitRatingPanel
                locale={locale}
                title={bottomTitle}
                targetName={myTarget}
                disabled={busy}
                busy={busy}
                onSubmit={submitMyRating}
              />
            ) : (
              <RatingPanel
                locale={locale}
                title={isKa ? 'შენ მიერ გაგზავნილი შეფასება' : 'Your sent rating'}
                who={myTarget}
                review={isWorker ? item.workerToClientReview : item.clientToWorkerReview}
                emptyText={
                  isKa
                    ? 'შენ ჯერ არ გაგიგზავნია შეფასება.'
                    : 'You haven’t sent a rating yet.'
                }
              />
            )}

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

/* ---------------- Dispute Modal (Start / Respond) ---------------- */

function DisputeModal({
  locale,
  item,
  tab,
  mode,
  onClose,
  onLocalPatch,
}: {
  locale: Locale;
  item: EvidenceItem;
  tab: 'incoming' | 'outgoing';
  mode: 'start' | 'respond';
  onClose: () => void;
  onLocalPatch: (patch: Partial<EvidenceItem>) => void;
}) {
  const isKa = locale === 'ka';
  const isWorker = tab === 'outgoing';

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [details, setDetails] = useState<DisputeFull>(null);
  const [loadingDetails, setLoadingDetails] = useState(mode === 'respond');

    useEffect(() => {
    if (mode !== 'respond') return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingDetails(true);
        const res = await fetch(`/api/evidences/${item.id}/dispute`, {
          cache: 'no-store',
        });
        const j = await res.json().catch(() => ({} as any));
        if (!res.ok) throw new Error(j?.error || 'Failed to load dispute');
        if (!cancelled) setDetails((j?.dispute as DisputeFull) ?? null);
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message || e) || (isKa ? 'ვერ ჩაიტვირთა დავა.' : 'Failed to load dispute.'));
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, item.id, isKa]);
  const keyFor = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;

  const onPhotosChange = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (!list.length) return;
    setPhotos((prev) => {
      const map = new Map(prev.map((f) => [keyFor(f), f]));
      for (const f of list) map.set(keyFor(f), f);
      return Array.from(map.values()).slice(0, 6);
    });
    e.target.value = '';
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const onVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setVideo(f);
    e.target.value = '';
  };

  const clearVideo = () => setVideo(null);

  const onFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (!list.length) return;
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [keyFor(f), f]));
      for (const f of list) map.set(keyFor(f), f);
      return Array.from(map.values());
    });
    e.target.value = '';
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const topTitle = mode === 'start'
    ? (isKa ? 'დავის დაწყება' : 'Start dispute')
: (isKa ? 'პასუხის გაცემა' : 'Respond');

  const hint = mode === 'start'
    ? (isKa
        ? 'დაწერე მოკლედ რა გიჭირს და დაამატე მტკიცებულებები. მეორე მხარეს გაეგზავნება შეტყობინება.'
        : 'Explain briefly and attach evidence. The other side will be notified.')
    : (isKa
        ? 'წარადგინე შენი პოზიცია არბიტრაჟისთვის. გაგზავნის შემდეგ ვეღარ შეცვლი.'
        : 'Submit your position for arbitration. After sending, you cannot edit.');

  const emptyErr = isKa
    ? 'მინიმუმ ერთი ველი უნდა იყოს შევსებული: ტექსტი, ფოტო, ვიდეო ან ZIP.'
    : 'Please provide at least one: text, photo, video or ZIP.';

  async function submit() {
    const hasText = text.trim().length > 0;
    const hasPhotos = photos.length > 0;
    const hasVideo = !!video;
    const hasFiles = files.length > 0;

    if (!hasText && !hasPhotos && !hasVideo && !hasFiles) {
      setErr(emptyErr);
      return;
    }
    if (busy) return;

    setBusy(true);
    setErr(null);

    try {
      const folder = `tasky/disputes/${item.task.id}/${item.id}`;

      const photoUrls: string[] = [];
      for (const f of photos) photoUrls.push(await uploadToCloudinary(f, 'image', folder));

      let videoUrl: string | null = null;
      if (video) videoUrl = await uploadToCloudinary(video, 'video', folder);

      const fileUrls: string[] = [];
      for (const f of files) fileUrls.push(await uploadToCloudinary(f, 'raw', folder));

      
      
      const res = await fetch(`/api/evidences/${item.id}/dispute`, {
      
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: mode === 'start' ? 'START' : 'RESPOND',
          role: isWorker ? 'WORKER' : 'CLIENT',
          text: text.trim(),
          photos: photoUrls,
          videos: videoUrl ? [videoUrl] : [],
          files: fileUrls,
        }),
      });

      const j = await res.json().catch(() => ({} as any));
      console.log("🔥 SERVER RESPONSE", j); // ✅ ეს დაამატე აქ

      if (!res.ok) {
        setErr(j?.error || (isKa ? 'ვერ გაიგზავნა.' : 'Failed to submit.'));
        setBusy(false);
        return;
      }

      // Expect backend to return updated dispute info (optional)
const disputePatch = (j?.dispute ?? {
  status: mode === 'start' ? 'OPEN' : 'SENT',
  startedAt: item.dispute?.startedAt ?? new Date().toISOString(),
  deadlineAt: null,
  clientSubmitted: isWorker ? (item.dispute?.clientSubmitted ?? false) : true,
  workerSubmitted: isWorker ? true : (item.dispute?.workerSubmitted ?? false),
}) as NonNullable<DisputeInfo>;
console.log("🔥 PATCH BEFORE", item.dispute);
console.log("🔥 PATCH APPLY", disputePatch);
onLocalPatch({
  dispute: {
    ...(item.dispute || {}),
    ...disputePatch,

    clientSubmitted: isWorker
      ? (item.dispute?.clientSubmitted ?? false)
      : true, // ✅ მე გავაგზავნე

    workerSubmitted: isWorker
      ? true // ✅ მე გავაგზავნე
      : (item.dispute?.workerSubmitted ?? false),
  },
} as any);


      try {
        window.dispatchEvent(new CustomEvent('evidences-updated'));
      } catch {}

      onClose();
    } catch (e: any) {
      setErr(String(e?.message || e) || (isKa ? 'ქსელის შეცდომა' : 'Network error'));
    } finally {
      setBusy(false);
    }
  }
const photoPreviews = useMemo(
  () => photos.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
  [photos],
);

useEffect(() => {
  return () => {
    photoPreviews.forEach((p) => URL.revokeObjectURL(p.url));
  };
}, [photoPreviews]);
const alreadySubmittedByMe = isWorker
  ? item.dispute?.workerSubmitted === true
  : item.dispute?.clientSubmitted === true;

const otherAlreadySubmitted = isWorker
  ? item.dispute?.clientSubmitted === true
  : item.dispute?.workerSubmitted === true;
  const sendLabel = busy
    ? isKa ? 'იგზავნება…' : 'Submitting…'
    : (isKa ? 'გაგზავნა' : 'Submit');

  return (
    <div className="fixed inset-0 z-[85]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={busy ? undefined : onClose} />

      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <div className="card w-full max-w-[820px] p-5 md:p-6 rounded-2xl ring-1 ring-fuchsia-400/30 bg-[#0b0f16]/95">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-fuchsia-300" />
              <div className="text-lg md:text-xl font-bold">{topTitle}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-60 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 text-sm text-white/65">{hint}</div>
          {mode === 'respond' && (
            <div className="mt-5 rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-4">
              <div className="text-xs uppercase tracking-wide text-white/50">
                {isKa ? 'მეორე მხარის პოზიცია' : 'Other side submission'}
              </div>

              {loadingDetails ? (
                <div className="text-sm text-white/60">
                  {isKa ? 'იტვირთება...' : 'Loading...'}
                </div>
              ) : (() => {
                const other = isWorker ? details?.client : details?.worker;
                if (!other?.submitted) {
                  return (
                    <div className="text-sm text-white/60">
                      {isKa ? 'მეორე მხარის პოზიცია ვერ მოიძებნა.' : 'Other side submission not found.'}
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-white/50 mb-1">
                        {isKa ? 'ტექსტი' : 'Text'}
                      </div>
                      <div className="text-sm text-white/85 whitespace-pre-wrap">
                        {other.text || (isKa ? 'ტექსტი ცარიელია.' : 'Empty text.')}
                      </div>
                    </div>

                    {other.photos?.length > 0 && (
                      <div>
                        <div className="text-xs text-white/50 mb-2">
                          {isKa ? 'ფოტოები' : 'Photos'}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {other.photos.map((src, i) => (
                            <a
                              key={i}
                              href={src}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-xl overflow-hidden ring-1 ring-white/10"
                            >
                              <img
                                src={src}
                                alt={`photo-${i + 1}`}
                                className="w-full h-24 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {other.videos?.length > 0 && (
                      <div>
                        <div className="text-xs text-white/50 mb-2">
                          {isKa ? 'ვიდეოები' : 'Videos'}
                        </div>
                        <div className="space-y-2">
                          {other.videos.map((src, i) => (
                            <a
                              key={i}
                              href={src}
                              target="_blank"
                              rel="noreferrer"
                              className="block underline text-cyan-300 hover:text-cyan-200 break-all text-sm"
                            >
                              {isKa ? 'ვიდეო' : 'Video'} #{i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {other.files?.length > 0 && (
                      <div>
                        <div className="text-xs text-white/50 mb-2">
                          {isKa ? 'ფაილები' : 'Files'}
                        </div>
                        <div className="space-y-2">
                          {other.files.map((src, i) => (
                            <a
                              key={i}
                              href={src}
                              target="_blank"
                              rel="noreferrer"
                              className="block underline text-cyan-300 hover:text-cyan-200 break-all text-sm"
                            >
                              {isKa ? 'ფაილი' : 'File'} #{i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
{alreadySubmittedByMe ? (
  <div className="mt-5 rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
    <div className="text-sm text-white/85">
      {otherAlreadySubmitted
        ? (isKa
            ? 'თქვენი პოზიცია უკვე წარდგენილია არბიტრაჟთან. დაელოდეთ არბიტრაჟის გადაწყვეტილებას.'
            : 'Your position has already been submitted to arbitration. Please wait for the arbitration decision.')
        : (isKa
            ? 'თქვენი პოზიცია უკვე წარდგენილია არბიტრაჟთან. ახლა ელოდებით მეორე მხარის პასუხს.'
            : 'Your position has already been submitted to arbitration. You are now waiting for the other side to respond.')}
    </div>
  </div>
) : (
  <>
    <div className="mt-5 grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/50 mb-2">
          {isKa ? 'ტექსტი' : 'Text'}
        </div>
        <textarea
          className="w-full min-h-[170px] rounded-xl bg-black/20 ring-1 ring-white/10 p-3 text-sm text-white/90 outline-none focus:ring-fuchsia-400/40"
          placeholder={isKa ? 'შენი პოზიცია / მიზეზი…' : 'Your position / reason…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <ShieldAlert className="w-4 h-4 text-fuchsia-300" />
          <span>{isKa ? 'მტკიცებულებები (არასავალდებულო)' : 'Attachments (optional)'}</span>
        </div>

        <div>
          <label className="block text-xs text-white/70 mb-1 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-cyan" />
            {isKa ? 'ფოტოები (მაქს. 6)' : 'Photos (max 6)'}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPhotosChange}
            disabled={busy}
            className="block w-full text-sm text-white/80
                     file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                     file:bg-white/10 file:text-white file:font-semibold
                     hover:file:bg-white/15 cursor-pointer bg-transparent disabled:opacity-60"
          />

          {photoPreviews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photoPreviews.map((p, i) => (
                <div
                  key={keyFor(p.file)}
                  className="relative rounded-lg bg-white/5 overflow-hidden ring-1 ring-white/10"
                >
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    disabled={busy}
                    className="absolute right-1 top-1 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs px-2 py-1 disabled:opacity-60"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                  <img
                    src={p.url}
                    alt={p.file.name}
                    className="w-full h-16 object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-white/70 mb-1 flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-400" />
            {isKa ? 'ვიდეო (1)' : 'Video (1)'}
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={onVideoChange}
            disabled={busy}
            className="block w-full text-sm text-white/80
                     file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                     file:bg-white/10 file:text-white file:font-semibold
                     hover:file:bg-white/15 cursor-pointer bg-transparent disabled:opacity-60"
          />
          {video && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-black/20 ring-1 ring-white/10 px-3 py-2 text-xs">
              <span className="truncate max-w-[75%]">{video.name}</span>
              <button
                type="button"
                onClick={clearVideo}
                disabled={busy}
                className="text-xs text-red-300 hover:text-red-200 disabled:opacity-60"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-white/70 mb-1 flex items-center gap-2">
            <FileArchive className="w-4 h-4 text-amber-400" />
            {isKa ? 'ZIP / ფაილები' : 'ZIP / files'}
          </label>
          <input
            type="file"
            accept=".zip,.rar,.7z,.pdf,.doc,.docx,.txt,.rtf,image/*"
            multiple
            onChange={onFilesChange}
            disabled={busy}
            className="block w-full text-sm text-white/80
                     file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                     file:bg-white/10 file:text-white file:font-semibold
                     hover:file:bg-white/15 cursor-pointer bg-transparent disabled:opacity-60"
          />

          {files.length > 0 && (
            <div className="mt-2 space-y-1 text-xs">
              {files.map((f, i) => (
                <div key={keyFor(f)} className="flex items-center justify-between rounded-lg bg-black/20 ring-1 ring-white/10 px-3 py-1.5">
                  <span className="truncate max-w-[75%]">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={busy}
                    className="text-xs text-red-300 hover:text-red-200 disabled:opacity-60"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {err && (
      <div className="mt-4 flex items-center gap-2 text-sm text-red-300">
        <AlertTriangle className="w-4 h-4" />
        <span>{err}</span>
      </div>
    )}

    <div className="mt-5 flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="btn-hero-ghost text-sm disabled:opacity-60"
        data-text={isKa ? 'გაუქმება' : 'Cancel'}
      >
        <span className="btn-text">{isKa ? 'გაუქმება' : 'Cancel'}</span>
      </button>

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="btn-hero-secondary text-sm disabled:opacity-60 relative"
        data-text={sendLabel}
      >
        <span className="btn-text flex items-center gap-2">
          <UploadCloud className="w-4 h-4" />
          {sendLabel}
        </span>
      </button>
    </div>
  </>
)}
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
      if (isWorker && item.workerDecisionSeen === false) {
        await markSeen(item.id, 'worker_decision');
        onLocalPatch({ workerDecisionSeen: true });
        try {
          window.dispatchEvent(new CustomEvent('evidences-updated'));
        } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reason =
    item.needsFixesReason?.trim() ||
    (isKa ? 'ხარვეზი არ მოიძებნა.' : 'Fix reason not found.');

  return (
    <div className="fixed inset-0 z-[75]">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
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
                <span className="btn-text">
                  {isKa ? 'ხელახლა გაგზავნა' : 'Resubmit'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Needs Fixes Modal ---------------- */

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
              <span>
                {busy
                  ? isKa
                    ? 'იგზავნება...'
                    : 'Submitting...'
                  : isKa
                    ? 'გაგზავნა'
                    : 'Submit'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Evidence Modal (details + actions) ---------------- */

function EvidenceModal({
  locale,
  item,
  tab,
  tick,
  canNeedsFixes,
  onClose,
  onUpdate,
  onOpenRating,
  onOpenDefect,
  onOpenDisputeStart,
  onOpenDisputeRespond,
}: {
  locale: Locale;
  item: EvidenceItem;
  tab: 'incoming' | 'outgoing';
  tick: number;
  canNeedsFixes: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<EvidenceItem>) => void;
  onOpenRating: (ev: EvidenceItem) => void;
  onOpenDefect: (ev: EvidenceItem) => void;
  onOpenDisputeStart: (ev: EvidenceItem) => void;
  onOpenDisputeRespond: (ev: EvidenceItem) => void;
}) {

  const isKa = locale === 'ka';
  const isIncoming = tab === 'incoming';
  const isWorker = tab === 'outgoing';
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [showNeedsFixes, setShowNeedsFixes] = useState(false);

  // second submission detection (resubmission after fixes)
  const isSecondSubmission = Boolean(item.fixForId);
const disputeStatus = item.dispute?.status ?? 'NONE';

const hasDecision =
  Boolean(item.dispute?.splitJson && String(item.dispute?.splitJson).trim() !== '') ||
  Boolean(item.dispute?.resultText && String(item.dispute?.resultText).trim() !== '');

const disputeResolved = disputeStatus === 'RESOLVED' || hasDecision;
const disputeActive =
  disputeStatus !== 'NONE' &&
  disputeStatus !== 'RESOLVED' &&
  disputeStatus !== 'CANCELLED';
  const confirmLabel = busy
    ? isKa
      ? 'დადასტურება...'
      : 'Confirming...'
    : isKa
      ? 'დადასტურება'
      : 'Confirm';

  const isExpired = item.status === 'EXPIRED';
  const isDoneApproved = item.status === 'APPROVED';
  const isDoneNeedsFixes = item.status === 'NEEDS_FIXES';
  const isDoneRejected = item.status === 'REJECTED';

  // Dispute countdown: 4 days after dispute started
const disputeCountdown = useMemo(() => {
  void tick; // ✅ force recompute every second

  if (
    item.dispute?.workerSubmitted === true &&
    item.dispute?.clientSubmitted === true
  ) {
    return { show: false, remaining: 0, label: '' };
  }

  if (!item.dispute?.startedAt) return { show: false, remaining: 0, label: '' };
  if (disputeResolved) return { show: false, remaining: 0, label: '' };

  const base = new Date(item.dispute.startedAt).getTime();
  if (Number.isNaN(base)) return { show: false, remaining: 0, label: '' };

  const dl = item.dispute.deadlineAt
    ? new Date(item.dispute.deadlineAt).getTime()
    : base + HOURS_4D_MS;

  const remaining = dl - Date.now();
  if (remaining <= 0) return { show: false, remaining: 0, label: '' };

  const meSubmitted = isWorker
    ? Boolean(item.dispute?.workerSubmitted)
    : Boolean(item.dispute?.clientSubmitted);

  const otherSubmitted = isWorker
    ? Boolean(item.dispute?.clientSubmitted)
    : Boolean(item.dispute?.workerSubmitted);

  const finalLabel =
    meSubmitted && !otherSubmitted
      ? (isKa ? 'მეორე მხარეს დარჩა პასუხის გასაცემად:' : 'Other side time to respond:')
      : (isKa ? 'შენ დაგრჩა პოზიციის გაგზავნა:' : 'Your time to submit:');

  return { show: true, remaining, label: finalLabel };
}, [item.dispute, disputeResolved, isKa, isWorker, tick]);

useEffect(() => {
  (async () => {
    // existing seen logic
    if (tab === 'outgoing') {
      if (
        (item.status === 'APPROVED' ||
          item.status === 'NEEDS_FIXES' ||
          item.status === 'EXPIRED') &&
        item.workerDecisionSeen === false
      ) {
        await markSeen(item.id, 'worker_decision');
        onUpdate(item.id, { workerDecisionSeen: true });
        try {
          window.dispatchEvent(new CustomEvent('evidences-updated'));
        } catch {}
      }
    } else {
      if (
        (item.status === 'APPROVED' || item.status === 'EXPIRED') &&
        item.clientSystemSeen === false
      ) {
        await markSeen(item.id, 'client_system');
        onUpdate(item.id, { clientSystemSeen: true });
        try {
          window.dispatchEvent(new CustomEvent('evidences-updated'));
        } catch {}
      }
    }


  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  async function handleConfirm() {
    if (!isIncoming) return;
    if (busy) return;
    if (isExpired) return;
// allow confirm ONLY if dispute was started by worker and client has not submitted yet
const allowConfirmDuringDispute =
  !isWorker &&
  item.dispute?.status &&
  item.dispute.status !== "NONE" &&
  item.dispute.status !== "RESOLVED" &&
  item.dispute.workerSubmitted === true &&
  item.dispute.clientSubmitted === false;

if ((disputeActive || disputeResolved) && !allowConfirmDuringDispute) return;

    setBusy(true);
    setActionErr(null);

    try {
      const res = await fetch(`/api/evidences/${item.id}/confirm`, {
        method: 'POST',
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setActionErr(j?.error || 'Request failed');
        setBusy(false);
        return;
      }

      const patched: EvidenceItem = {
        ...item,
        status: 'APPROVED',
        autoApproved: false,
      };

onUpdate(item.id, { 
  status: 'APPROVED', 
  autoApproved: false,
  clientEvidenceSeen: true // ✅ ADD THIS
});
      try {
        window.dispatchEvent(new CustomEvent('evidences-updated'));
      } catch {}

      onOpenRating(patched);
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
    if (disputeActive || disputeResolved) return; // lock if dispute

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
  clientEvidenceSeen: true // ✅ ADD
});

      try {
        window.dispatchEvent(new CustomEvent('evidences-updated'));
      } catch {}
      setShowNeedsFixes(false);
    } catch (e: any) {
      setActionErr(String(e?.message || e) || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  const canShowDisputeStart =
    isSecondSubmission &&
    (item.status === 'PENDING') &&
    !disputeActive &&
    !disputeResolved;

const mySubmitted = isWorker
  ? Boolean(item.dispute?.workerSubmitted)
  : Boolean(item.dispute?.clientSubmitted);

const canShowDisputeRespond =
  disputeActive && !mySubmitted;
    // show only if my side hasn't submitted yet (if backend supplies flags)

  const lockAllActions =
    disputeResolved ||
    (item.dispute?.status === 'SENT') ||
    (item.dispute?.status === 'BOTH_SUBMITTED');
const allowConfirmDuringDispute =
  !isWorker &&
  item.dispute?.status &&
  item.dispute.status !== 'NONE' &&
  item.dispute.status !== 'RESOLVED' &&
  item.dispute.workerSubmitted === true &&
  item.dispute.clientSubmitted === false;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

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
                    ? isKa
                      ? 'დისტანციური'
                      : 'Remote'
                    : isKa
                      ? 'ადგილზე'
                      : 'On-site'}
                </span>
              </div>

      {disputeActive && (
  <>
    {item.dispute?.workerSubmitted &&
     item.dispute?.clientSubmitted ? (
      <div className="mt-3 text-xs text-fuchsia-200 font-semibold">
        {isKa
          ? 'ორივე მხარემ გააგზავნა — ელოდებით არბიტრაჟს'
          : 'Both sides submitted — waiting for arbitration'}
      </div>
    ) : disputeCountdown.show ? (
      <div className="mt-3 text-xs text-white/70">
        <span className="text-white/50">{disputeCountdown.label}</span>{' '}
        <span className="font-semibold text-fuchsia-200">
          {fmtCountdown(disputeCountdown.remaining, isKa)}
        </span>
      </div>
    ) : null}
  </>
)}


{item.dispute?.status === 'RESOLVED' && (item.dispute?.resultText || item.dispute?.splitJson) && (() => {
  const sp = parseSplitJson(item.dispute?.splitJson ?? null);
  const clientName = item.client.name || item.client.email || item.client.id;
  const workerName = item.worker.name || item.worker.email || item.worker.id;

  const decision = formatDecisionLine({
    isKa,
    reward: item.task.reward,
    clientName,
    workerName,
    sp,
  });

  return (
    <div className="mt-4 rounded-2xl bg-emerald-400/10 ring-1 ring-emerald-400/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-emerald-200">
          {isKa ? 'არბიტრაჟის პასუხი' : 'Arbitration result'}
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${decisionToneClasses(decision.tone)}`}>
          {decision.badge}
        </div>
      </div>

      {decision.lines.length > 0 && (
        <div className="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
          <div className="text-xs text-white/60 mb-2">
            {isKa ? 'გადაწყვეტილება / განაწილება' : 'Decision / distribution'}
          </div>
          <div className="space-y-1 text-sm text-white/85">
            {decision.lines.map((l, idx) => (
              <div key={idx}>{l}</div>
            ))}
          </div>
        </div>
      )}

      {item.dispute?.resultText?.trim() && (
        <div className="mt-3">
          <div className="text-xs text-white/60 mb-1">
            {isKa ? 'ადმინის კომენტარი' : 'Admin note'}
          </div>
          <div className="text-sm text-white/85 whitespace-pre-wrap">
            {item.dispute.resultText}
          </div>
        </div>
      )}


    </div>
  );
})()}

            </div>

            {item.fixFor?.needsFixesReason && (
              <div className="mt-5 rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/30 p-4">
                <div className="text-xs text-amber-200 mb-2">
                  {isKa
                    ? 'დამკვეთის წარდგენილი ხარვეზი'
                    : 'Client requested fixes'}
                </div>
                <div className="text-sm text-white/85 whitespace-pre-wrap">
                  {item.fixFor.needsFixesReason}
                </div>
              </div>
            )}

            <div className="mt-5 grid lg:grid-cols-[1.4fr,1fr] gap-6">
              <div className="space-y-5">
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
                        {item.worker.name || item.worker.email || '—'}
                      </div>
                      {item.worker.email && (
                        <div className="text-xs text-white/60 truncate">
                          {item.worker.email}
                        </div>
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
                        {item.worker.ratingWorkerCount ?? 0}{' '}
                        {isKa ? 'შეფასება' : 'reviews'}
                      </span>
                    </div>
                  </div>
                </div>

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
                    {isSecondSubmission && (
                      <span className="px-2 py-1 rounded-full border border-fuchsia-400/60 bg-fuchsia-400/10 text-fuchsia-200">
                        {isKa ? 'მეორედ გამოგზავნილი' : 'Resubmitted'}
                      </span>
                    )}
                    {disputeActive && (
                      <span className="px-2 py-1 rounded-full border border-fuchsia-400/60 bg-fuchsia-400/10 text-fuchsia-200">
                        {isKa ? 'დავა' : 'Dispute'}
                      </span>
                    )}
                    {disputeResolved && (
                      <span className="px-2 py-1 rounded-full border border-emerald-400/60 bg-emerald-400/10 text-emerald-200">
                        {isKa ? 'პასუხი' : 'Resolved'}
                      </span>
                    )}
                  </div>

                  {(disputeActive || disputeResolved) && (
                    <div className="mt-3 text-xs text-white/65">
                      {disputeResolved
                        ? (isKa ? 'ინტერაქცია დასრულებულია — ელოდებით შედეგს აღარ.' : 'Interaction finished.')
                        : (isKa ? 'დავა დაწყებულია — პოზიციების მიწოდება მიმდინარეობს.' : 'Dispute is active — submissions in progress.')}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                  <div className="text-xs text-white/60 mb-2">
                    {isKa ? (isWorker ? 'დამკვეთი' : 'დამკვეთი') : 'Client'}
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

                <div className="pt-2 flex flex-wrap gap-3 justify-end">
                  {actionErr && (
                    <div className="w-full text-sm text-red-300 mb-1">
                      {actionErr}
                    </div>
                  )}
                  {((isExpired || isDoneApproved) && !disputeActive) && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRating(item);
                        onClose();
                      }}
                      className="btn-hero-secondary text-sm relative"
                      data-text={isKa ? 'შეფასების ნახვა' : 'View rating'}
                    >
                      <span className="btn-text">
                        {isKa ? 'შეფასების ნახვა' : 'View rating'}
                      </span>
                    </button>
                  )}

                  {isDoneNeedsFixes && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDefect(item);
                        onClose();
                      }}
                      className="btn-evidence-warning text-sm relative"
                    >
                      <span>{isKa ? 'ხარვეზის ნახვა' : 'View defect'}</span>
                    </button>
                  )}

                  {isDoneRejected && (
                    <div className="btn-hero-secondary text-sm opacity-70 cursor-default">
                      <span>{isKa ? 'უარყოფილია' : 'Rejected'}</span>
                    </div>
                  )}

                  {/* Incoming pending actions (client) */}
{isIncoming && item.status === 'PENDING' && (
  <>
    <button
      type="button"
      onClick={handleConfirm}
      disabled={busy || (lockAllActions && !allowConfirmDuringDispute)}
      className="btn-hero-secondary text-sm disabled:opacity-60"
      data-text={confirmLabel}
    >
      <span className="btn-text">{confirmLabel}</span>
    </button>

    {canNeedsFixes ? (
      <button
        type="button"
        disabled={busy || lockAllActions}
        className="btn-evidence-warning text-sm disabled:opacity-60"
        onClick={() => {
          if (lockAllActions) return;
          setShowNeedsFixes(true);
        }}
      >
        <span>{isKa ? 'დახარვეზება' : 'Request fixes'}</span>
      </button>
    ) : canShowDisputeStart ? (
      <button
        type="button"
        disabled={busy || lockAllActions}
        className="btn-hero-secondary text-sm disabled:opacity-60 relative"
        onClick={() => {
          onOpenDisputeStart(item);
          onClose();
        }}
      >
        <span className="btn-text flex items-center gap-2">
          <Gavel className="w-4 h-4" />
          {isKa ? 'დავის დაწყება' : 'Start dispute'}
        </span>
      </button>
    ) : null}
  </>
)}


                  {/* Outgoing pending actions (worker) — dispute visible only on second submission */}
                  {isWorker && item.status === 'PENDING' && canShowDisputeStart && (
                    <button
                      type="button"
                      disabled={busy || lockAllActions}
                      className="btn-hero-secondary text-sm disabled:opacity-60 relative"
                      onClick={() => {
                        onOpenDisputeStart(item);
                        onClose();
                      }}
                    >
                      <span className="btn-text flex items-center gap-2">
                        <Gavel className="w-4 h-4" />
                        {isKa ? 'დავის დაწყება' : 'Start dispute'}
                      </span>
                    </button>
                  )}



                  {/* When dispute active: let each side submit their position (once) */}



{disputeActive && (() => {
  const mySubmitted = isWorker
    ? item.dispute?.workerSubmitted === true
    : item.dispute?.clientSubmitted === true;
console.log("🔥 BUTTON DEBUG", {
  isWorker,
  workerSubmitted: item.dispute?.workerSubmitted,
  clientSubmitted: item.dispute?.clientSubmitted,
  mySubmitted,
  fullDispute: item.dispute
});
  const otherSubmitted = isWorker
    ? item.dispute?.clientSubmitted === true
    : item.dispute?.workerSubmitted === true;

  if (!mySubmitted) {
    return (
      <button
        type="button"
        disabled={busy || lockAllActions}
        className="btn-hero-secondary text-sm disabled:opacity-60 relative"
        onClick={() => {
          onOpenDisputeRespond(item);
          onClose();
        }}
      >
        <span className="btn-text flex items-center gap-2">
          <UploadCloud className="w-4 h-4" />
          {isKa ? 'პასუხის გაცემა' : 'Respond'}
        </span>
      </button>
    );
  }

  return (
    <div className="btn-hero-secondary text-sm opacity-80 cursor-default">
      <span>
        {otherSubmitted
          ? (isKa
              ? 'თქვენი პოზიცია წარდგენილია — დაელოდეთ არბიტრაჟის გადაწყვეტილებას'
              : 'Your position submitted — waiting for arbitration decision')
          : (isKa
              ? 'თქვენი პოზიცია წარდგენილია — ელოდებით მეორე მხარეს'
              : 'Your position submitted — waiting for other side')}
      </span>
    </div>
  );
})()}

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

export default function ProofsClient({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const isKa = locale === 'ka';
  const router = useRouter();
  const search = useSearchParams();

  const initialTab = search.get('tab') === 'outgoing' ? 'outgoing' : 'incoming';
  const [tab, setTab] = useState<'incoming' | 'outgoing'>(initialTab);
useEffect(() => {
  const current = search.get('tab');
  setTab(current === 'outgoing' ? 'outgoing' : 'incoming');
}, [search]);
  const [incomingItems, setIncomingItems] = useState<EvidenceItem[]>([]);
  const [outgoingItems, setOutgoingItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);

  const items = tab === 'incoming' ? incomingItems : outgoingItems;

  const [selected, setSelected] = useState<EvidenceItem | null>(null);
  const [ratingTarget, setRatingTarget] = useState<EvidenceItem | null>(null);
  const [defectTarget, setDefectTarget] = useState<EvidenceItem | null>(null);
  const [disputeTarget, setDisputeTarget] = useState<{ item: EvidenceItem; mode: 'start' | 'respond' } | null>(null);

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
      countdownClient: isKa ? 'დამკვეთს დარჩა პასუხის გასაცემად:' : 'Client time to respond:',
      countdownAutoApprove: isKa ? 'ავტომატური დადასტურება:' : 'Auto-approve in:',
      countdownFixesWorker: isKa ? 'შემსრულებელს დარჩა ხარვეზის გამოსასწორებლად:' : 'Worker time to fix:',
      countdownFixesYou: isKa ? 'შენ დაგრჩა ხარვეზის გამოსასწორებლად:' : 'Your time to fix:',
      countdownDispute: isKa ? 'დავის ვადა:' : 'Dispute deadline:',
      viewRating: isKa ? 'შეფასების ნახვა' : 'View rating',
      viewDefect: isKa ? 'ხარვეზის ნახვა' : 'View defect',
      disputeStarted: isKa ? 'დავა დაწყებულია' : 'Dispute started',
      submitPosition: isKa ? 'პასუხის გაცემა' : 'Respond',
    }),
    [isKa],
  );

  const changeTab = (next: 'incoming' | 'outgoing') => {
    if (next === tab) return;
    setTab(next);
    setSelected(null);
    setRatingTarget(null);
    setDefectTarget(null);
    setDisputeTarget(null);
    const sp = new URLSearchParams(search.toString());
    sp.set('tab', next);
    router.replace(`/${locale}/mypage/proofs?${sp.toString()}`);
  };

  const handleEvidenceUpdated = (id: string, patch: Partial<EvidenceItem>) => {
    setIncomingItems((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
    );
    setOutgoingItems((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
    );

    setSelected((prev) =>
      prev && prev.id === id ? ({ ...prev, ...patch } as EvidenceItem) : prev,
    );
    setRatingTarget((prev) =>
      prev && prev.id === id ? ({ ...prev, ...patch } as EvidenceItem) : prev,
    );
    setDefectTarget((prev) =>
      prev && prev.id === id ? ({ ...prev, ...patch } as EvidenceItem) : prev,
    );
    setDisputeTarget((prev) =>
      prev && prev.item.id === id ? ({ ...prev, item: { ...prev.item, ...patch } as EvidenceItem }) : prev,
    );
  };

  async function loadBothTabs() {
    // cancel previous request if any
    try {
      loadAbortRef.current?.abort();
    } catch {}

    const ac = new AbortController();
    loadAbortRef.current = ac;

    setLoading(true);
    setErr(null);

    try {
      const [incoming, outgoing] = await Promise.all([
        fetchJson<EvidenceItem[]>(`/api/my/evidences?tab=incoming`, {
          cache: 'no-store',
          signal: ac.signal,
        }),
        fetchJson<EvidenceItem[]>(`/api/my/evidences?tab=outgoing`, {
          cache: 'no-store',
          signal: ac.signal,
        }),
      ]);

      // if another request started after this one, ignore
      if (loadAbortRef.current !== ac) return;

      setIncomingItems(incoming || []);
      setOutgoingItems(outgoing || []);
    } catch (e: any) {
      // abort is not an error we should show
      if (e?.name === 'AbortError') return;
      if (loadAbortRef.current !== ac) return;
      setErr(e?.message || 'Error');
    } finally {
      if (loadAbortRef.current === ac) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadBothTabs();
    return () => {
      try {
        loadAbortRef.current?.abort();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUpd = () => loadBothTabs();
    window.addEventListener('evidences-updated', onUpd);
    return () => window.removeEventListener('evidences-updated', onUpd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canNeedsFixesForSelected = useMemo(() => {
    if (!selected) return false;
    if (tab !== 'incoming') return false;
    if (selected.status !== 'PENDING') return false;

    // if there was already NEEDS_FIXES for same task+worker, client can no longer needs-fixes again
    const already = incomingItems.some(
      (x) =>
        x.task?.id === selected.task?.id &&
        x.worker?.id === selected.worker?.id &&
        x.status === 'NEEDS_FIXES',
    );
    return !already;
  }, [selected, incomingItems, tab]);

  const empty = !loading && !err && items.length === 0;

  const openRating = (ev: EvidenceItem) => setRatingTarget(ev);
  const openDefect = (ev: EvidenceItem) => setDefectTarget(ev);

  const openDisputeStart = (ev: EvidenceItem) => setDisputeTarget({ item: ev, mode: 'start' });
  const openDisputeRespond = (ev: EvidenceItem) => setDisputeTarget({ item: ev, mode: 'respond' });

  const goResubmit = (ev: EvidenceItem) => {
    router.push(
      `/${locale}/mypage/proofs/submit?task=${encodeURIComponent(ev.task.id)}&fixFor=${encodeURIComponent(ev.id)}`,
    );
  };

  function countdownInfo(ev: EvidenceItem) {
    void tick;

    // Dispute countdown has priority (both sides can see it)
if (
  ev.dispute?.startedAt &&
  ev.dispute.status &&
  ev.dispute.status !== 'NONE' &&
  ev.dispute.status !== 'RESOLVED'
) {
  // ✅ stop countdown if both submitted
  const bothSubmitted =
    ev.dispute?.workerSubmitted === true && ev.dispute?.clientSubmitted === true;
  if (bothSubmitted) return { show: false, label: '', remaining: 0 };

  const base = new Date(ev.dispute.startedAt).getTime();
  const dl = ev.dispute.deadlineAt
    ? new Date(ev.dispute.deadlineAt).getTime()
    : base + HOURS_4D_MS;

  const remaining = dl - Date.now();
  if (remaining > 0) return { show: true, label: labels.countdownDispute, remaining };
  return { show: false, label: '', remaining: 0 };
}


    if (ev.status === 'PENDING') {
      const created = new Date(ev.createdAt).getTime();
      const deadline = created + HOURS_96_MS;
      const remaining = deadline - Date.now();

      if (tab === 'incoming') {
        return { show: true, label: labels.countdownAutoApprove, remaining };
      }
      return { show: true, label: labels.countdownClient, remaining };
    }

    if (ev.status === 'NEEDS_FIXES') {
      const base = ev.needsFixesAt
        ? new Date(ev.needsFixesAt).getTime()
        : new Date(ev.createdAt).getTime();
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
      return ev.status === 'NEEDS_FIXES' && ev.workerDecisionSeen === false;
    }
    return false;
  }

function hasSystemNotif(ev: EvidenceItem) {
  if (tab === 'incoming') {
    const newEvidence =
      ev.status === 'PENDING' &&
      (!ev.dispute || ev.dispute.status === 'NONE') &&
      ev.clientEvidenceSeen !== true;

    const systemDecision =
      (ev.status === 'APPROVED' || ev.status === 'EXPIRED') &&
      ev.clientSystemSeen === false;

    return Boolean(newEvidence || systemDecision);
  }

  return (
    (ev.status === 'APPROVED' ||
      ev.status === 'NEEDS_FIXES' ||
      ev.status === 'EXPIRED') &&
    ev.workerDecisionSeen === false
  );
}



  function hasDisputeNotif(ev: EvidenceItem) {
    if (!ev.dispute || ev.dispute.status === 'NONE') return false;
    if (tab === 'incoming') return ev.dispute.clientSeen === false;
    return ev.dispute.workerSeen === false;
  }

  function hasAnyNotif(ev: EvidenceItem) {
    return hasSystemNotif(ev) || hasDefectNotif(ev) || hasRatingNotif(ev) || hasDisputeNotif(ev);
  }

const incomingNotifCount = useMemo(() => {
  return incomingItems.filter((ev) => {
    const newEvidence =
      ev.status === 'PENDING' &&
      (!ev.dispute || ev.dispute.status === 'NONE') &&
      ev.clientEvidenceSeen !== true;

    const system =
      (ev.status === 'APPROVED' || ev.status === 'EXPIRED') &&
      ev.clientSystemSeen === false;

    const rating =
      ev.clientSawWorkerReview === false ||
      (ev.status === 'EXPIRED' && ev.clientSawRatingPrompt === false);

    const dispute =
      ev.dispute &&
      ev.dispute.status !== 'NONE' &&
      ev.dispute.clientSeen === false;

    return Boolean(newEvidence || system || rating || dispute);
  }).length;
}, [incomingItems]);

  const outgoingNotifCount = useMemo(() => {
    return outgoingItems.filter((ev) => {
      const decision =
        (ev.status === 'APPROVED' ||
          ev.status === 'NEEDS_FIXES' ||
          ev.status === 'EXPIRED') &&
        ev.workerDecisionSeen === false;

      const rating =
        ev.workerSawClientReview === false ||
        (ev.status === 'EXPIRED' && ev.workerSawRatingPrompt === false);

      const dispute = ev.dispute && ev.dispute.status !== 'NONE' && ev.dispute.workerSeen === false;

      return Boolean(decision || rating || dispute);
    }).length;
  }, [outgoingItems]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      if (disputeTarget) setDisputeTarget(null);
      else if (ratingTarget) setRatingTarget(null);
      else if (defectTarget) setDefectTarget(null);
      else if (selected) setSelected(null);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, ratingTarget, defectTarget, disputeTarget]);

  useEffect(() => {
    const anyModalOpen = Boolean(selected || ratingTarget || defectTarget || disputeTarget);
    if (!anyModalOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected, ratingTarget, defectTarget, disputeTarget]);

const disputeButtonLabel = (ev: EvidenceItem) => {
  const isWorker = tab === 'outgoing';
  const status = ev.dispute?.status ?? 'NONE';

  // ✅ resolve check MUST be before narrowing/returns
  if (status === 'RESOLVED') return isKa ? 'დავის შედეგი' : 'Dispute result';

  const active = status !== 'NONE'; // (RESOLVED უკვე გავფილტრეთ ზემოთ)
  if (!active) return labels.disputeStarted;

  const meSubmitted = isWorker
    ? Boolean(ev.dispute?.workerSubmitted)
    : Boolean(ev.dispute?.clientSubmitted);

  // const otherSubmitted = isWorker
  //   ? Boolean(ev.dispute?.clientSubmitted)
  //   : Boolean(ev.dispute?.workerSubmitted);

  if (meSubmitted) return isKa ? 'ელოდები პასუხს' : 'Waiting';
  return labels.submitPosition;
};

const canCardSubmitPosition = (ev: EvidenceItem) => {
  const status = ev.dispute?.status ?? 'NONE';

  // თუ დავა არაა → არ აჩვენო
  if (status === 'NONE') return false;

  // თუ უკვე დასრულებულია → არ აჩვენო
  if (status === 'RESOLVED') return false;

  // ყველა სხვა შემთხვევაში აჩვენე
  return true;
};


  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{labels.title}</h1>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => changeTab('incoming')}
          className={tab === 'incoming' ? 'btn-tab-active text-sm' : 'btn-hero-ghost text-sm'}
          data-text={labels.incoming}
        >
          <span className="btn-text">{labels.incoming}</span>
          {incomingNotifCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold ring-1 ring-white/20">
              {incomingNotifCount > 99 ? '99+' : incomingNotifCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => changeTab('outgoing')}
          className={tab === 'outgoing' ? 'btn-tab-active text-sm' : 'btn-hero-ghost text-sm'}
          data-text={labels.outgoing}
        >
          <span className="btn-text">{labels.outgoing}</span>
          {outgoingNotifCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold ring-1 ring-white/20">
              {outgoingNotifCount > 99 ? '99+' : outgoingNotifCount}
            </span>
          )}
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
      const isSecondSubmission = Boolean(ev.fixForId);
const cd = countdownInfo(ev);

const disputeStatus = ev.dispute?.status ?? 'NONE';

const hasDecision =
  Boolean(ev.dispute?.splitJson && String(ev.dispute?.splitJson).trim() !== '') ||
  Boolean(ev.dispute?.resultText && String(ev.dispute?.resultText).trim() !== '');

const disputeResolved = disputeStatus === 'RESOLVED' || hasDecision;
const disputeActive =
  disputeStatus !== 'NONE' &&
  disputeStatus !== 'RESOLVED' &&
  disputeStatus !== 'CANCELLED';
const bothSubmitted =
  ev.dispute?.workerSubmitted === true && ev.dispute?.clientSubmitted === true;

const showCountdown =
  cd.show &&
  !bothSubmitted &&
  cd.remaining > 0 &&
  (ev.status === 'PENDING' || ev.status === 'NEEDS_FIXES' || disputeActive);


      const showResubmittedMsg =
        ev.status === 'NEEDS_FIXES' && ev.fixResubmittedOnTime;


      const showStamp =
        ev.status !== 'PENDING' ||
        disputeActive ||
        disputeResolved;

      const canOpenDefectBtn = ev.status === 'NEEDS_FIXES';

const canOpenRatingBtn =
  (ev.dispute?.status === 'NONE' || !ev.dispute) &&
  (
    ev.status === 'APPROVED' ||
    ev.status === 'EXPIRED'
  );
const mySubmitted =
  tab === 'outgoing'
    ? ev.dispute?.workerSubmitted === true
    : ev.dispute?.clientSubmitted === true;


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
          {hasAnyNotif(ev) && (
            <span className="absolute top-3 right-3 w-3.5 h-3.5 rounded-full bg-red-500 ring-2 ring-black/80" />
          )}

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

              {showResubmittedMsg ? (
                <div className="text-xs text-white/70">
                  <span className="text-white/50">{isKa ? 'სტატუსი:' : 'Status:'}</span>{' '}
                  <span className="font-semibold text-emerald-300">
                    {isKa
                      ? 'მტკიცებულებები ხელმეორედ გაგზავნილია დროულად.'
                      : 'Evidence was resubmitted on time.'}
                  </span>
                </div>
) : disputeActive && bothSubmitted ? (
  <div className="text-xs text-fuchsia-200 font-semibold">
    {isKa
      ? 'ორივე მხარემ დააფიქსირა დავაში პოზიცია — ელოდებით არბიტრაჟის გადაწყვეტილებას.'
      : 'Both sides submitted their positions — waiting for arbitration decision.'}
  </div>
) : showCountdown ? (
  <div className="text-xs text-white/70">
    <span className="text-white/50">{cd.label}</span>{' '}
    <span
      className={
        'font-semibold ' +
        (disputeActive ? 'text-fuchsia-200' : 'text-sky-300')
      }
    >
      {fmtCountdown(cd.remaining, isKa)}
    </span>
  </div>
) : null}


              {ev.text && (
                <div className="mt-1 text-sm text-white/80 line-clamp-2 group-hover:text-white/90">
                  {ev.text}
                </div>
              )}

{ev.dispute?.status === 'RESOLVED' && ev.dispute?.resultText?.trim() && (
                <div className="mt-1 text-xs text-emerald-200/90 line-clamp-2">
                  {isKa ? 'არბიტრაჟის პასუხი: ' : 'Result: '}
                  <span className="text-white/80">{ev.dispute.resultText}</span>
                </div>
              )}


             
            </div>

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
                {tab === 'incoming'
                  ? isKa
                    ? 'შენი დავალებისთვის გამოგზავნილი.'
                    : 'Sent to your task.'
                  : (
                    <>
                      {isKa ? 'დამკვეთი: ' : 'Client: '}
                      {ev.client.name || ev.client.email || '—'}
                    </>
                  )}
              </div>

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

{disputeActive && (() => {
  const mySubmitted =
    tab === 'outgoing'
      ? ev.dispute?.workerSubmitted === true
      : ev.dispute?.clientSubmitted === true;

  const otherSubmitted =
    tab === 'outgoing'
      ? ev.dispute?.clientSubmitted === true
      : ev.dispute?.workerSubmitted === true;

  if (mySubmitted) {
    return (
      <div className="btn-hero-secondary text-xs opacity-80 cursor-default">
        <span>
          {otherSubmitted
            ? (isKa
                ? 'თქვენი პოზიცია წარდგენილია — დაელოდეთ არბიტრაჟის გადაწყვეტილებას'
                : 'Your position submitted — waiting for arbitration decision')
            : (isKa
                ? 'თქვენი პოზიცია წარდგენილია — ელოდებით მეორე მხარეს'
                : 'Your position submitted — waiting for other side')}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openDisputeRespond(ev);
      }}
      className="btn-hero-secondary text-xs relative"
      data-text={labels.submitPosition}
    >
      <span className="btn-text flex items-center gap-2">
        <UploadCloud className="w-4 h-4" />
        {labels.submitPosition}
      </span>
      {hasDisputeNotif(ev) && <NotifDot />}
    </button>
  );
})()}


              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}

{selected && (
  <EvidenceModal
    locale={locale}
    item={selected}
    tab={tab}
    tick={tick}
    canNeedsFixes={canNeedsFixesForSelected}
    onClose={() => setSelected(null)}
    onUpdate={handleEvidenceUpdated}
    onOpenRating={(ev) => openRating(ev)}
    onOpenDefect={(ev) => openDefect(ev)}
    onOpenDisputeStart={(ev) => openDisputeStart(ev)}
    onOpenDisputeRespond={(ev) => openDisputeRespond(ev)}
  />
)}


{ratingTarget && (
  <RatingModal
    locale={locale}
    item={ratingTarget}
    tab={tab}
    onClose={() => setRatingTarget(null)}
    onLocalPatch={(patch) => handleEvidenceUpdated(ratingTarget.id, patch)}
  />
)}

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

{disputeTarget && (
  <DisputeModal
    locale={locale}
    item={disputeTarget.item}
    tab={tab}
    mode={disputeTarget.mode}
    onClose={() => setDisputeTarget(null)}
    onLocalPatch={(patch) => handleEvidenceUpdated(disputeTarget.item.id, patch)}
  />
)}
</div>
);
}
