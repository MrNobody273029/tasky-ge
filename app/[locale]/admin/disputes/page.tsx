'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  User2,
  Mail,
  Phone,
  CalendarClock,
  MapPin,
  Gavel,
  Image as ImageIcon,
  Film,
  FileArchive,
  AlertTriangle,
  CheckCircle2,
  SplitSquareHorizontal,
  Crown,
  PlayCircle,
} from 'lucide-react';

import TaskModal from '@/components/task/TaskModal';

type Locale = 'ka' | 'en';

type AdminDispute = {
  id: string;
  status: string;
  startedAt: string | null;
  deadlineAt: string | null;

  clientSubmitted: boolean;
  workerSubmitted: boolean;

  clientText: string;
  workerText: string;

  clientPhotos: string[];
  clientVideos: string[];
  clientFiles: string[];

  workerPhotos: string[];
  workerVideos: string[];
  workerFiles: string[];

  resultText: string;
  splitJson: string;

  task: null | {
    id: string;
    title: string;
    desc: string;
    reward: number;
    deadline: string | null;
    where: 'REMOTE' | 'ONSITE';
    address: string | null;
    exclusive: boolean;
    locale: string;
    category: string;
    skill: string;
    photos: string[];
    proof: string;
    createdAt: string | null;
    authorId: string;
  };

  evidence: null | {
    id: string;
    createdAt: string | null;
    status: string;
    text: string;
    photos: string[];
    videos: string[];
    files: string[];

    fixForId: string | null;
    fixFor: null | {
      id: string;
      createdAt: string | null;
      status: string;
      text: string;
      photos: string[];
      videos: string[];
      files: string[];
      needsFixesReason: string | null;
    };
    fixes: Array<{
      id: string;
      createdAt: string | null;
      status: string;
      text: string;
      photos: string[];
      videos: string[];
      files: string[];
    }>;
  };

  client: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    image: string | null;
    commissionPct: number;
  };
  worker: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    image: string | null;
    commissionPct: number;
  };
};

type TaskResp = {
  id: string;
  authorId: string;
  isMine: boolean;
  isExpired?: boolean;

  hasTakenByMe?: boolean;
  myAppStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  myThreadId?: string | null;

  locale: 'ka' | 'en';
  title: string;
  desc: string;
  category: string;
  skill: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | string;
  reward: number;
  deadline: string | null;
  where: 'REMOTE' | 'ONSITE';
  address: string | null;
  exclusive: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  photos: string[];
  proof: string;
};

type OwnerInfo = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
};

function fmtDT(v: string | null, loc: Locale) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString(loc === 'ka' ? 'ka-GE' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function remainingMs(deadlineAt: string | null) {
  if (!deadlineAt) return 0;
  const dl = new Date(deadlineAt).getTime();
  if (Number.isNaN(dl)) return 0;
  return dl - Date.now();
}

function fmtCountdown(ms: number) {
  const clamped = Math.max(0, ms);
  const s = Math.floor(clamped / 1000);
  const sec = s % 60;
  const m = Math.floor(s / 60);
  const min = m % 60;
  const h = Math.floor(m / 60);
  const hr = h % 24;
  const days = Math.floor(h / 24);
  const pad = (n: number) => String(n).padStart(2, '0');
  return days > 0 ? `${days}d ${pad(hr)}:${pad(min)}:${pad(sec)}` : `${pad(h)}:${pad(min)}:${pad(sec)}`;
}

function Avatar({ src }: { src: string | null }) {
  return (
    <div className="w-12 h-12 rounded-2xl bg-white/10 overflow-hidden ring-1 ring-white/10 flex items-center justify-center">
      {src ? <img src={src} alt="avatar" className="w-full h-full object-cover" /> : <User2 className="w-5 h-5 text-white/60" />}
    </div>
  );
}

function InfoLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/75">
      <span className="text-white/50">{icon}</span>
      <span className="break-all">{text}</span>
    </div>
  );
}

type ViewerItem =
  | { kind: 'photo'; src: string }
  | { kind: 'video'; src: string };

function fileNameFromUrl(u: string) {
  try {
    const url = new URL(u);
    const last = url.pathname.split('/').filter(Boolean).pop();
    return last || u;
  } catch {
    const clean = u.split('?')[0];
    return clean.split('/').filter(Boolean).pop() || u;
  }
}

function Attachments({
  photos,
  videos,
  files,
  locale,
}: {
  photos: string[];
  videos: string[];
  files: string[];
  locale: Locale;
}) {
  const [viewer, setViewer] = useState<ViewerItem | null>(null);
  const hasAny = (photos?.length || 0) + (videos?.length || 0) + (files?.length || 0) > 0;

  if (!hasAny) return <div className="text-sm text-white/60">{locale === 'ka' ? 'ფაილები არ არის.' : 'No files.'}</div>;

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
            <ImageIcon className="w-4 h-4 text-cyan-300" />
            {locale === 'ka' ? 'ფოტოები' : 'Photos'}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {photos.map((u, i) => (
              <button
                key={u + i}
                type="button"
                onClick={() => setViewer({ kind: 'photo', src: u })}
                className="block rounded-xl overflow-hidden ring-1 ring-white/10 bg-black/20 w-full h-28 md:h-32 p-2 hover:bg-black/30 transition"
                title={locale === 'ka' ? 'გახსნა' : 'Open'}
              >
                <img src={u} alt="photo" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
            <Film className="w-4 h-4 text-sky-300" />
            {locale === 'ka' ? 'ვიდეოები' : 'Videos'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {videos.map((u, i) => (
              <button
                key={u + i}
                type="button"
                onClick={() => setViewer({ kind: 'video', src: u })}
                className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3 py-2 text-sm text-white/85 transition"
                title={locale === 'ka' ? 'ვიდეოს გახსნა' : 'Open video'}
              >
                <PlayCircle className="w-5 h-5 text-white/75" />
                <span className="truncate">{fileNameFromUrl(u) || `Video #${i + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
            <FileArchive className="w-4 h-4 text-amber-300" />
            {locale === 'ka' ? 'ფაილები' : 'Files'}
          </div>
          <div className="space-y-1 text-sm">
            {files.map((u, i) => (
              <a
                key={u + i}
                href={u}
                target="_blank"
                rel="noreferrer"
                className="flex items-center rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3 py-2 text-sm text-cyan-300 hover:text-cyan-200 transition break-all"
              >
                {fileNameFromUrl(u) || `File #${i + 1}`}
              </a>
            ))}
          </div>
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-[2147483647] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={() => setViewer(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10"
            aria-label="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-full max-w-6xl">
            {viewer.kind === 'photo' ? (
              <img src={viewer.src} alt="attachment" className="w-full max-h-[85vh] object-contain rounded-2xl bg-black/20" />
            ) : (
              <video src={viewer.src} controls playsInline className="w-full max-h-[85vh] rounded-2xl bg-black" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex items-start justify-center h-full overflow-y-auto px-4 py-10">
        <div className="card w-full max-w-[1100px] p-5 md:p-6 rounded-2xl ring-1 ring-fuchsia-400/20 bg-[#0b0f16]/95">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xl md:text-2xl font-bold line-clamp-2">{title}</div>
            </div>
            <button
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Tabs({
  tabs,
  active,
  setActive,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  setActive: (k: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`px-4 h-10 rounded-xl text-sm font-semibold ring-1 transition ${
              on ? 'bg-cyan/20 text-cyan ring-cyan/30' : 'bg-white/5 text-white/80 ring-white/10 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminDisputesPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const isKa = locale === 'ka';
  const sp = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState(sp.get('q') || '');
  const [status, setStatus] = useState(sp.get('status') || '');
const [pageTab, setPageTab] = useState<'ACTIVE' | 'DONE'>(
  sp.get('tab') === 'done' ? 'DONE' : 'ACTIVE'
);

  const [openClient, setOpenClient] = useState<AdminDispute | null>(null);
  const [openWorker, setOpenWorker] = useState<AdminDispute | null>(null);

  const [clientTab, setClientTab] = useState<'TASK' | 'REASON'>('TASK');
  const [workerTab, setWorkerTab] = useState<'E1' | 'E2' | 'REASON'>('E1');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolveErr, setResolveErr] = useState<string | null>(null);

  const [splitOpenId, setSplitOpenId] = useState<string | null>(null);
  const [workerPct, setWorkerPct] = useState<number>(50);
  const [clientPct, setClientPct] = useState<number>(50);
  const [resultText, setResultText] = useState<string>('');

  // ✅ TaskModal view state (ADMIN readOnly)
  const [taskViewOpen, setTaskViewOpen] = useState(false);
  const [taskViewId, setTaskViewId] = useState<string | null>(null);
  const [taskViewInitial, setTaskViewInitial] = useState<TaskResp | null>(null);
  const [taskViewOwner, setTaskViewOwner] = useState<OwnerInfo | null>(null);

  const t = useMemo(
    () => ({
      title: isKa ? 'Admin • დისპიუტები' : 'Admin • Disputes',
      search: isKa ? 'ძებნა' : 'Search',
      status: isKa ? 'სტატუსი' : 'Status',
      all: isKa ? 'ყველა' : 'All',
      emptyActive: isKa ? 'აქტიური დისპიუტები არ არის.' : 'No active disputes.',
      emptyDone: isKa ? 'დასრულებული დისპიუტები არ არის.' : 'No completed disputes.',
      apply: isKa ? 'ფილტრი' : 'Apply',
      countdown: isKa ? 'დარჩენილია' : 'Remaining',

      sectionActive: isKa ? 'აქტიური დავები' : 'Active disputes',
      sectionDone: isKa ? 'დასრულებული დავები' : 'Completed disputes',

      client: isKa ? 'დამკვეთი' : 'Client',
      worker: isKa ? 'შემსრულებელი' : 'Worker',

      tabTask: isKa ? 'დავალება' : 'Task',
      tabReason: isKa ? 'დავის მიზეზი' : 'Dispute reason',

      tabE1: isKa ? 'პირველი მტკიცებულება' : 'First evidence',
      tabE2: isKa ? 'მეორე მტკიცებულება' : 'Second evidence',

      decisionTitle: isKa ? 'არბიტრაჟის გადაწყვეტილება' : 'Arbitration decision',
      decisionPh: isKa ? 'მოკლე გადაწყვეტილება (სავალდებულო)…' : 'Short decision (required)…',

      winClient: isKa ? 'გაიმარჯვა დამკვეთმა' : 'Client wins',
      winWorker: isKa ? 'გაიმარჯვა შემსრულებელმა' : 'Worker wins',
      split: isKa ? 'თანხის გაყოფა' : 'Split amount',

      save: isKa ? 'დადასტურება' : 'Confirm',
      cancel: isKa ? 'გაუქმება' : 'Cancel',
      resolved: isKa ? 'გადაწყვეტილია' : 'Resolved',

      viewTask: isKa ? 'დავალების ნახვა' : 'View task',
    }),
    [isKa],
  );

function pushQuery(nextQ: string, nextStatus: string, nextTab: 'ACTIVE' | 'DONE') {
  const p = new URLSearchParams(sp.toString());

  if (nextQ.trim()) p.set('q', nextQ.trim());
  else p.delete('q');

  if (nextStatus.trim()) p.set('status', nextStatus.trim());
  else p.delete('status');

  // ✅ tab in url
  p.set('tab', nextTab === 'DONE' ? 'done' : 'active');

  router.replace(`/${locale}/admin/disputes?${p.toString()}`);
}


  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const p = new URLSearchParams();
      if (q.trim()) p.set('q', q.trim());
      if (status.trim()) p.set('status', status.trim());
      p.set('take', '200');

      const res = await fetch(`/api/admin/disputes?${p.toString()}`, { cache: 'no-store' });
      const j = await res.json().catch(() => ([] as any));
      if (!res.ok) {
        setErr(j?.error || 'Request failed');
        setItems([]);
        return;
      }
      setItems(Array.isArray(j) ? j : []);
    } catch (e: any) {
      setErr(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  function neonX() {
    return (
      <div className="relative flex items-center justify-center w-16 h-16">
        <div className="absolute inset-0 rounded-2xl bg-fuchsia-500/10 blur-xl" />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-fuchsia-400/30" />
        <div className="text-4xl font-black text-fuchsia-200 drop-shadow-[0_0_18px_rgba(232,121,249,0.55)] select-none">
          ×
        </div>
      </div>
    );
  }

  async function resolveDispute(d: AdminDispute, outcome: 'CLIENT' | 'WORKER', note: string) {
    setBusyId(d.id);
    setResolveErr(null);
    try {
      const res = await fetch(`/api/admin/disputes/${d.id}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ outcome, resultText: note }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResolveErr(j?.error || 'failed');
        return;
      }
      // ✅ this moves it from Active -> Done automatically via memo
setItems((prev) =>
  prev.map((x) =>
    x.id === d.id
      ? {
          ...x,
          status: 'RESOLVED',
          resultText: note,
          splitJson: JSON.stringify({ outcome }), // ✅ store outcome for UI
        }
      : x,
  ),
);
      setSplitOpenId(null);
      setResultText('');
    } finally {
      setBusyId(null);
    }
  }

  async function resolveSplit(d: AdminDispute) {
    const note = resultText.trim();
    if (!note) {
      setResolveErr('missing_result_text');
      return;
    }
    const w = Math.max(0, Math.min(100, Math.trunc(Number(workerPct))));
    const c = Math.max(0, Math.min(100, Math.trunc(Number(clientPct))));
    if (w + c !== 100) {
      setResolveErr('split_must_sum_100');
      return;
    }

    setBusyId(d.id);
    setResolveErr(null);
    try {
      const res = await fetch(`/api/admin/disputes/${d.id}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ outcome: 'SPLIT', resultText: note, workerPct: w, clientPct: c }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResolveErr(j?.error || 'failed');
        return;
      }
      // ✅ this moves it from Active -> Done automatically via memo
setItems((prev) =>
  prev.map((x) =>
    x.id === d.id
      ? {
          ...x,
          status: 'RESOLVED',
          resultText: note,
          splitJson: JSON.stringify({ outcome: 'SPLIT', workerPct: w, clientPct: c }), // ✅ store split
        }
      : x,
  ),
);
      setSplitOpenId(null);
      setResultText('');
    } finally {
      setBusyId(null);
    }
  }

  const { activeItems, doneItems } = useMemo(() => {
    // ✅ Active: only BOTH submitted + status BOTH_SUBMITTED or SENT
    const active = items.filter((d) => {
      const both = Boolean(d.clientSubmitted) && Boolean(d.workerSubmitted);
      const okStatus = d.status === 'BOTH_SUBMITTED' || d.status === 'SENT';
      return both && okStatus;
    });

    // ✅ Done: resolved or cancelled
    const done = items.filter((d) => d.status === 'RESOLVED' || d.status === 'CANCELLED');

    return { activeItems: active, doneItems: done };
  }, [items]);

  function openTaskViewFromDispute(d: AdminDispute) {
    if (!d.task?.id) return;

    const taskLocale = (d.task.locale === 'en' ? 'en' : 'ka') as 'ka' | 'en';

    const initialTask: TaskResp = {
      id: d.task.id,
      authorId: d.task.authorId,
      isMine: false,

      locale: taskLocale,
      title: d.task.title || '—',
      desc: d.task.desc || '',
      category: d.task.category || '',
      skill: d.task.skill || '',
      reward: Number(d.task.reward || 0),
      deadline: d.task.deadline ?? null,
      where: d.task.where,
      address: d.task.address ?? null,
      exclusive: Boolean(d.task.exclusive),
      status: 'PUBLISHED',
      photos: Array.isArray(d.task.photos) ? d.task.photos : [],
      proof: d.task.proof || '',
    };

    const owner: OwnerInfo = {
      name: d.client.name || (d.client.email ? String(d.client.email).split('@')[0] : null),
      email: d.client.email || null,
      phone: d.client.phone || null,
      avatar: d.client.image || null,
      ratingAvg: 0,
      ratingCount: 0,
    };

    setTaskViewInitial(initialTask);
    setTaskViewOwner(owner);
    setTaskViewId(d.task.id);
    setTaskViewOpen(true);
  }
function parseSplitJson(s: string | null | undefined): null | { outcome?: string; workerPct?: number; clientPct?: number } {
  if (!s) return null;
  try {
    const j = JSON.parse(s);
    if (!j || typeof j !== 'object') return null;
    return j;
  } catch {
    return null;
  }
}

function gelAmount(total: number, pct: number) {
  const n = (Number(total || 0) * Number(pct || 0)) / 100;
  return Math.round(n * 100) / 100;
}

function decisionLabel(loc: Locale, outcome?: string) {
  const o = String(outcome || '').toUpperCase();
  if (o === 'CLIENT') return loc === 'ka' ? 'გაიმარჯვა დამკვეთმა' : 'Client wins';
  if (o === 'WORKER') return loc === 'ka' ? 'გაიმარჯვა შემსრულებელმა' : 'Worker wins';
  if (o === 'SPLIT') return loc === 'ka' ? 'თანხა გაიყო' : 'Amount split';
  return loc === 'ka' ? 'გადაწყვეტილება' : 'Decision';
}

  const renderDisputeCard = (d: AdminDispute) => {
    const ms = remainingMs(d.deadlineAt);
    const showCd = d.status !== 'RESOLVED' && d.status !== 'CANCELLED' && ms > 0;

    const reward = d.task?.reward ?? 0;
    const isResolved = d.status === 'RESOLVED';

    return (
      <div key={d.id} className="card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-white/90 line-clamp-1">{d.task?.title || '—'}</div>
            <div className="text-xs text-white/60 mt-1">
              dispute: <span className="font-mono text-white/70">{d.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan/20 text-cyan text-sm font-semibold">₾{reward}</span>
            <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs">
              <span className="font-semibold">{d.status}</span>
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5 text-sky-400" />
            {fmtDT(d.startedAt, locale)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            {d.task?.where || '—'}
          </span>
          {showCd && (
            <span className="inline-flex items-center gap-1 text-fuchsia-200">
              {t.countdown}: <span className="font-semibold">{fmtCountdown(ms)}</span>
            </span>
          )}
        </div>

        <div className="mt-4 grid lg:grid-cols-[1fr,120px,1fr] gap-3 items-stretch">
          <button
            type="button"
            className="text-left rounded-2xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition p-4"
            onClick={() => {
              setOpenClient(d);
              setClientTab('TASK');
            }}
          >
            <div className="flex items-center gap-3">
              <Avatar src={d.client.image} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white/90 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-300" />
                  {t.client}
                </div>
                <div className="text-sm text-white/85 line-clamp-1">{d.client.name || '—'}</div>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <InfoLine icon={<Mail className="w-3.5 h-3.5" />} text={d.client.email || '—'} />
              <InfoLine icon={<Phone className="w-3.5 h-3.5" />} text={d.client.phone || '—'} />
            </div>

            <div className="mt-3 text-xs text-white/70 line-clamp-2">
              {isKa ? 'დავის ტექსტი: ' : 'Dispute: '}
              <span className="text-white/80">{(d.clientText || d.workerText || '').slice(0, 140) || '—'}</span>
            </div>
          </button>

          <div className="flex flex-col items-center justify-center gap-3">
            {neonX()}

            {!isResolved ? (
              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setSplitOpenId(null);
                    setResolveErr(null);
                    const note = prompt(isKa ? 'გადაწყვეტის ტექსტი:' : 'Decision text:') || '';
                    if (!note.trim()) return;
                    resolveDispute(d, 'CLIENT', note.trim());
                  }}
                  disabled={busyId === d.id}
                  className="w-full h-10 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/20 text-emerald-200 font-semibold text-sm hover:bg-emerald-500/25 transition disabled:opacity-60"
                >
                  {t.winClient}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSplitOpenId(d.id);
                    setResolveErr(null);
                    setWorkerPct(50);
                    setClientPct(50);
                    setResultText('');
                  }}
                  disabled={busyId === d.id}
                  className="w-full h-10 rounded-xl bg-fuchsia-500/15 ring-1 ring-fuchsia-400/20 text-fuchsia-200 font-semibold text-sm hover:bg-fuchsia-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <SplitSquareHorizontal className="w-4 h-4" />
                  {t.split}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSplitOpenId(null);
                    setResolveErr(null);
                    const note = prompt(isKa ? 'გადაწყვეტის ტექსტი:' : 'Decision text:') || '';
                    if (!note.trim()) return;
                    resolveDispute(d, 'WORKER', note.trim());
                  }}
                  disabled={busyId === d.id}
                  className="w-full h-10 rounded-xl bg-cyan/15 ring-1 ring-cyan/25 text-cyan font-semibold text-sm hover:bg-cyan/25 transition disabled:opacity-60"
                >
                  {t.winWorker}
                </button>

                {resolveErr && <div className="text-[12px] text-red-300">{resolveErr}</div>}
              </div>
            ) : (
              <div className="text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {t.resolved}
              </div>
            )}
          </div>

          <button
            type="button"
            className="text-left rounded-2xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition p-4"
            onClick={() => {
              setOpenWorker(d);
              setWorkerTab('E1');
            }}
          >
            <div className="flex items-center gap-3">
              <Avatar src={d.worker.image} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white/90">{t.worker}</div>
                <div className="text-sm text-white/85 line-clamp-1">{d.worker.name || '—'}</div>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <InfoLine icon={<Mail className="w-3.5 h-3.5" />} text={d.worker.email || '—'} />
              <InfoLine icon={<Phone className="w-3.5 h-3.5" />} text={d.worker.phone || '—'} />
            </div>

            <div className="mt-3 text-xs text-white/70 line-clamp-2">
              {isKa ? 'დავის ტექსტი: ' : 'Dispute: '}
              <span className="text-white/80">{(d.workerText || d.clientText || '').slice(0, 140) || '—'}</span>
            </div>
          </button>
        </div>

        {splitOpenId === d.id && !isResolved && (
          <div className="mt-4 rounded-2xl bg-fuchsia-500/10 ring-1 ring-fuchsia-400/20 p-4">
            <div className="text-sm font-semibold text-fuchsia-200">{t.decisionTitle}</div>

            <div className="mt-3 grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-white/70 mb-1">{isKa ? 'შემსრულებელი %' : 'Worker %'}</div>
                <input
                  className="w-full h-11 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 text-white outline-none"
                  value={workerPct}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const vv = Number.isFinite(v) ? v : 0;
                    setWorkerPct(vv);
                    setClientPct(100 - vv);
                  }}
                  type="number"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <div className="text-xs text-white/70 mb-1">{isKa ? 'დამკვეთი %' : 'Client %'}</div>
                <input
                  className="w-full h-11 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 text-white outline-none"
                  value={clientPct}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const vv = Number.isFinite(v) ? v : 0;
                    setClientPct(vv);
                    setWorkerPct(100 - vv);
                  }}
                  type="number"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs text-white/70 mb-1">{t.decisionPh}</div>
              <textarea
                className="w-full min-h-[110px] rounded-xl bg-black/20 ring-1 ring-white/10 p-3 text-sm text-white/90 outline-none focus:ring-fuchsia-400/40"
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder={t.decisionPh}
              />
            </div>

            {resolveErr && <div className="mt-2 text-sm text-red-300">{resolveErr}</div>}

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="btn-hero-ghost text-sm"
                data-text={t.cancel}
                onClick={() => {
                  setSplitOpenId(null);
                  setResolveErr(null);
                }}
              >
                <span className="btn-text">{t.cancel}</span>
              </button>

              <button
                type="button"
                className="btn-hero-secondary text-sm"
                data-text={t.save}
                disabled={busyId === d.id}
                onClick={() => resolveSplit(d)}
              >
                <span className="btn-text">{t.save}</span>
              </button>
            </div>
          </div>
        )}

{isResolved && (d.resultText || d.splitJson) && (
  <div className="mt-4 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/20 p-4 text-sm text-emerald-100">
    {(() => {
      const sj = parseSplitJson(d.splitJson);
      const outcome = sj?.outcome;
      const wPct = typeof sj?.workerPct === 'number' ? sj!.workerPct! : null;
      const cPct = typeof sj?.clientPct === 'number' ? sj!.clientPct! : null;

      const total = Number(d.task?.reward ?? 0);

      return (
        <>
          <div className="font-semibold">
            {isKa ? 'არბიტრაჟის გადაწყვეტილება:' : 'Arbitration decision:'}{' '}
            <span className="text-white/85">
              {decisionLabel(locale, outcome)}
            </span>
          </div>

          {String(outcome || '').toUpperCase() === 'SPLIT' && wPct !== null && cPct !== null && (
            <div className="mt-2 text-white/85">
              <div>
                {isKa ? 'დამკვეთი:' : 'Client:'}{' '}
                <span className="font-semibold">{cPct}%</span>{' '}
                <span className="text-white/70">({gelAmount(total, cPct)} ₾)</span>
              </div>
              <div>
                {isKa ? 'შემსრულებელი:' : 'Worker:'}{' '}
                <span className="font-semibold">{wPct}%</span>{' '}
                <span className="text-white/70">({gelAmount(total, wPct)} ₾)</span>
              </div>
            </div>
          )}

          {d.resultText ? (
            <div className="mt-3 text-white/85 whitespace-pre-wrap">{d.resultText}</div>
          ) : null}
        </>
      );
    })()}
  </div>
)}

      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Gavel className="w-6 h-6 text-fuchsia-300" />
        <h1 className="text-3xl font-bold">{t.title}</h1>
      </div>

      <div className="card p-4 md:p-5 space-y-3">
        <div className="grid md:grid-cols-[1fr,220px,160px] gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-white/5 ring-1 ring-white/10 outline-none focus:ring-cyan/40 text-white"
              placeholder={`${t.search}: id / task / email`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="h-11 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 text-white outline-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{t.all}</option>
            <option value="OPEN">OPEN</option>
            <option value="WAITING_OTHER">WAITING_OTHER</option>
            <option value="BOTH_SUBMITTED">BOTH_SUBMITTED</option>
            <option value="SENT">SENT</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <button
            type="button"
         onClick={() => {
          pushQuery(q, status, pageTab);
          load();
        }}

            className="btn-hero-secondary text-sm"
            data-text={t.apply}
          >
            <span className="btn-text">{t.apply}</span>
          </button>
        </div>
      </div>
<div className="card p-3 md:p-4">
  <Tabs
    tabs={[
      { key: 'ACTIVE', label: `${t.sectionActive} (${activeItems.length})` },
      { key: 'DONE', label: `${t.sectionDone} (${doneItems.length})` },
    ]}
    active={pageTab}
    setActive={(k) => {
      const next = k as 'ACTIVE' | 'DONE';
      setPageTab(next);
      pushQuery(q, status, next);
    }}
  />
</div>

      {loading ? (
        <div className="card p-5 text-sm text-white/70">{isKa ? 'იტვირთება…' : 'Loading…'}</div>
      ) : err ? (
        <div className="card p-5 text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{err}</span>
        </div>
      ) : (
        <>
{pageTab === 'ACTIVE' ? (
  <div className="space-y-4">
    {activeItems.length === 0 ? (
      <div className="card p-5 text-sm text-white/70">{t.emptyActive}</div>
    ) : (
      <div className="space-y-4">{activeItems.map(renderDisputeCard)}</div>
    )}
  </div>
) : (
  <div className="space-y-4">
    {doneItems.length === 0 ? (
      <div className="card p-5 text-sm text-white/70">{t.emptyDone}</div>
    ) : (
      <div className="space-y-4">{doneItems.map(renderDisputeCard)}</div>
    )}
  </div>
)}

        </>
      )}

      {/* CLIENT MODAL */}
      {openClient && (
        <ModalShell
          title={`${t.client} • ${openClient.client.name || openClient.client.email || openClient.client.id}`}
          onClose={() => setOpenClient(null)}
        >
          <Tabs
            tabs={[
              { key: 'TASK', label: t.tabTask },
              { key: 'REASON', label: t.tabReason },
            ]}
            active={clientTab}
            setActive={(k) => setClientTab(k as any)}
          />

          <div className="mt-4">
            {clientTab === 'TASK' ? (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xl font-bold">{openClient.task?.title || '—'}</div>

                  <button
                    type="button"
                    className="btn-hero-secondary text-sm"
                    data-text={t.viewTask}
                    onClick={() => openTaskViewFromDispute(openClient)}
                    disabled={!openClient.task?.id}
                  >
                    <span className="btn-text">{t.viewTask}</span>
                  </button>
                </div>

                <div className="text-sm text-white/80 whitespace-pre-wrap">{openClient.task?.desc || '—'}</div>

                <div className="flex flex-wrap gap-2 text-xs text-white/70">
                  <span className="px-3 py-1 rounded-full bg-white/10">₾{openClient.task?.reward ?? 0}</span>
                  <span className="px-3 py-1 rounded-full bg-white/10">{openClient.task?.where || '—'}</span>
                  <span className="px-3 py-1 rounded-full bg-white/10">{openClient.task?.category || '—'}</span>
                  <span className="px-3 py-1 rounded-full bg-white/10">{openClient.task?.skill || '—'}</span>
                </div>

                <Attachments locale={locale} photos={openClient.task?.photos || []} videos={[]} files={[]} />
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
                <div className="text-sm font-semibold text-white/90">{isKa ? 'დავის ტექსტი' : 'Dispute text'}</div>
                <div className="text-sm text-white/85 whitespace-pre-wrap">{openClient.clientText || '—'}</div>

                <Attachments locale={locale} photos={openClient.clientPhotos} videos={openClient.clientVideos} files={openClient.clientFiles} />
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* WORKER MODAL */}
      {openWorker && (
        <ModalShell
          title={`${t.worker} • ${openWorker.worker.name || openWorker.worker.email || openWorker.worker.id}`}
          onClose={() => setOpenWorker(null)}
        >
          <Tabs
            tabs={[
              { key: 'E1', label: t.tabE1 },
              { key: 'E2', label: t.tabE2 },
              { key: 'REASON', label: t.tabReason },
            ]}
            active={workerTab}
            setActive={(k) => setWorkerTab(k as any)}
          />

          <div className="mt-4">
            {workerTab === 'E1' ? (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
                <div className="text-sm font-semibold text-white/90">{t.tabE1}</div>

                {openWorker.evidence?.fixFor ? (
                  <>
                    <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.evidence.fixFor.text || '—'}</div>
                    <Attachments locale={locale} photos={openWorker.evidence.fixFor.photos || []} videos={openWorker.evidence.fixFor.videos || []} files={openWorker.evidence.fixFor.files || []} />
                  </>
                ) : (
                  <>
                    <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.evidence?.text || '—'}</div>
                    <Attachments locale={locale} photos={openWorker.evidence?.photos || []} videos={openWorker.evidence?.videos || []} files={openWorker.evidence?.files || []} />
                  </>
                )}
              </div>
            ) : workerTab === 'E2' ? (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
                <div className="text-sm font-semibold text-white/90">{t.tabE2}</div>

                {openWorker.evidence?.fixFor?.needsFixesReason && (
                  <div className="rounded-2xl bg-amber-500/10 ring-1 ring-amber-400/20 p-3">
                    <div className="text-xs text-amber-200 mb-1">{isKa ? 'დახარვეზების მიზეზი (დამკვეთისგან)' : 'Fix reason (from client)'}</div>
                    <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.evidence.fixFor.needsFixesReason}</div>
                  </div>
                )}

                {openWorker.evidence ? (
                  openWorker.evidence.fixFor ? (
                    <>
                      <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.evidence.text || '—'}</div>
                      <Attachments locale={locale} photos={openWorker.evidence.photos || []} videos={openWorker.evidence.videos || []} files={openWorker.evidence.files || []} />
                    </>
                  ) : openWorker.evidence.fixes?.[0] ? (
                    <>
                      <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.evidence.fixes[0].text || '—'}</div>
                      <Attachments locale={locale} photos={openWorker.evidence.fixes[0].photos || []} videos={openWorker.evidence.fixes[0].videos || []} files={openWorker.evidence.fixes[0].files || []} />
                    </>
                  ) : (
                    <div className="text-sm text-white/70">{isKa ? 'მეორე მტკიცებულება არ არსებობს.' : 'No second evidence.'}</div>
                  )
                ) : (
                  <div className="text-sm text-white/70">{isKa ? 'მტკიცებულება ვერ მოიძებნა.' : 'Evidence not found.'}</div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
                <div className="text-sm font-semibold text-white/90">{isKa ? 'დავის მიზეზი (შემსრულებელი)' : 'Dispute reason (worker)'}</div>
                <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.workerText || '—'}</div>
                <Attachments locale={locale} photos={openWorker.workerPhotos} videos={openWorker.workerVideos} files={openWorker.workerFiles} />
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* ✅ REAL TaskModal VIEW (admin, readOnly) */}
      <TaskModal
        open={taskViewOpen}
        taskId={taskViewId}
        onClose={() => setTaskViewOpen(false)}
        readOnly
        initialTask={taskViewInitial}
        initialOwner={taskViewOwner}
      />
    </div>
  );
}
