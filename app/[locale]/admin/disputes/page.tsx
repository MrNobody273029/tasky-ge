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
} from 'lucide-react';

type Locale = 'ka' | 'en';

type AdminDispute = {
  id: string;
  status: string;
  startedAt: string | null;
  deadlineAt: string | null;

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

  client: { id: string; name: string | null; email: string | null; phone: string | null; image: string | null; commissionPct: number };
  worker: { id: string; name: string | null; email: string | null; phone: string | null; image: string | null; commissionPct: number };
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

function Attachments({
  photos,
  videos,
  files,
}: {
  photos: string[];
  videos: string[];
  files: string[];
}) {
  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
            <ImageIcon className="w-4 h-4 text-cyan-300" />
            ფოტოები
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {photos.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden ring-1 ring-white/10 bg-black/20">
                <img src={u} alt="photo" className="w-full h-24 object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
            <Film className="w-4 h-4 text-sky-300" />
            ვიდეოები
          </div>
          <div className="space-y-1 text-sm">
            {videos.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="underline text-cyan-300 hover:text-cyan-200 break-all">
                Video #{i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
            <FileArchive className="w-4 h-4 text-amber-300" />
            ფაილები
          </div>
          <div className="space-y-1 text-sm">
            {files.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="underline text-cyan-300 hover:text-cyan-200 break-all">
                File #{i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && videos.length === 0 && files.length === 0 && (
        <div className="text-sm text-white/60">ფაილები არ არის.</div>
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
              on
                ? 'bg-cyan/20 text-cyan ring-cyan/30'
                : 'bg-white/5 text-white/80 ring-white/10 hover:bg-white/10'
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

  const [openClient, setOpenClient] = useState<AdminDispute | null>(null);
  const [openWorker, setOpenWorker] = useState<AdminDispute | null>(null);

  // client modal tabs
  const [clientTab, setClientTab] = useState<'TASK' | 'REASON'>('TASK');
  // worker modal tabs
  const [workerTab, setWorkerTab] = useState<'E1' | 'E2' | 'REASON'>('E1');

  // resolve state
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolveErr, setResolveErr] = useState<string | null>(null);

  // split inputs (percent)
  const [splitOpenId, setSplitOpenId] = useState<string | null>(null);
  const [workerPct, setWorkerPct] = useState<number>(50);
  const [clientPct, setClientPct] = useState<number>(50);
  const [resultText, setResultText] = useState<string>('');

  const t = useMemo(
    () => ({
      title: isKa ? 'Admin • დისპიუტები' : 'Admin • Disputes',
      search: isKa ? 'ძებნა' : 'Search',
      status: isKa ? 'სტატუსი' : 'Status',
      all: isKa ? 'ყველა' : 'All',
      empty: isKa ? 'დისპიუტები ვერ მოიძებნა.' : 'No disputes found.',
      apply: isKa ? 'ფილტრი' : 'Apply',
      countdown: isKa ? 'დარჩენილია' : 'Remaining',

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

      phone: isKa ? 'ტელ' : 'Phone',
    }),
    [isKa],
  );

  function pushQuery(nextQ: string, nextStatus: string) {
    const p = new URLSearchParams(sp.toString());
    if (nextQ.trim()) p.set('q', nextQ.trim());
    else p.delete('q');
    if (nextStatus.trim()) p.set('status', nextStatus.trim());
    else p.delete('status');
    router.replace(`/${locale}/admin/disputes?${p.toString()}`);
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const p = new URLSearchParams();
      if (q.trim()) p.set('q', q.trim());
      if (status.trim()) p.set('status', status.trim());
      p.set('take', '120');

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

  // tick countdown
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
      setItems((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'RESOLVED', resultText: note } : x)));
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
      setItems((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'RESOLVED', resultText: note } : x)));
      setSplitOpenId(null);
      setResultText('');
    } finally {
      setBusyId(null);
    }
  }

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
            <option value="SENT">SENT</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <button
            type="button"
            onClick={() => {
              pushQuery(q, status);
              load();
            }}
            className="btn-hero-secondary text-sm"
            data-text={t.apply}
          >
            <span className="btn-text">{t.apply}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-5 text-sm text-white/70">{isKa ? 'იტვირთება…' : 'Loading…'}</div>
      ) : err ? (
        <div className="card p-5 text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{err}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="card p-5 text-sm text-white/70">{t.empty}</div>
      ) : (
        <div className="space-y-4">
          {items.map((d) => {
            const ms = remainingMs(d.deadlineAt);
            const showCd = d.status !== 'RESOLVED' && d.status !== 'CANCELLED' && ms > 0;

            const reward = d.task?.reward ?? 0;

            const isResolved = d.status === 'RESOLVED';

            return (
              <div key={d.id} className="card p-4 md:p-5">
                {/* top meta */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-white/90 line-clamp-1">{d.task?.title || '—'}</div>
                    <div className="text-xs text-white/60 mt-1">
                      dispute: <span className="font-mono text-white/70">{d.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-cyan/20 text-cyan text-sm font-semibold">
                      ₾{reward}
                    </span>
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

                {/* 2-side cards + neon X */}
                <div className="mt-4 grid lg:grid-cols-[1fr,120px,1fr] gap-3 items-stretch">
                  {/* client card */}
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
                        <div className="text-sm text-white/85 line-clamp-1">
                          {d.client.name || '—'}
                        </div>
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

                  {/* neon X + decision buttons */}
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

                        {resolveErr && (
                          <div className="text-[12px] text-red-300">{resolveErr}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {t.resolved}
                      </div>
                    )}
                  </div>

                  {/* worker card */}
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
                        <div className="text-sm text-white/85 line-clamp-1">
                          {d.worker.name || '—'}
                        </div>
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

                {/* split panel (inline) */}
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
                            setWorkerPct(v);
                            setClientPct(100 - (Number.isFinite(v) ? v : 0));
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
                            setClientPct(v);
                            setWorkerPct(100 - (Number.isFinite(v) ? v : 0));
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

                {isResolved && d.resultText && (
                  <div className="mt-4 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/20 p-4 text-sm text-emerald-100">
                    <div className="font-semibold">{isKa ? 'არბიტრაჟის გადაწყვეტილება:' : 'Arbitration decision:'}</div>
                    <div className="mt-1 text-white/85 whitespace-pre-wrap">{d.resultText}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
                <div className="text-xl font-bold">{openClient.task?.title || '—'}</div>
                <div className="text-sm text-white/80 whitespace-pre-wrap">{openClient.task?.desc || '—'}</div>

                <div className="flex flex-wrap gap-2 text-xs text-white/70">
                  <span className="px-3 py-1 rounded-full bg-white/10">₾{openClient.task?.reward ?? 0}</span>
                  <span className="px-3 py-1 rounded-full bg-white/10">{openClient.task?.where || '—'}</span>
                  <span className="px-3 py-1 rounded-full bg-white/10">{openClient.task?.category || '—'}</span>
                  <span className="px-3 py-1 rounded-full bg-white/10">{openClient.task?.skill || '—'}</span>
                </div>

                {openClient.task?.photos?.length ? (
                  <div>
                    <div className="text-sm text-white/80 mb-2">Photos</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {openClient.task.photos.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden ring-1 ring-white/10 bg-black/20">
                          <img src={u} alt="task" className="w-full h-24 object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
                <div className="text-sm font-semibold text-white/90">{isKa ? 'დავის ტექსტი' : 'Dispute text'}</div>
                <div className="text-sm text-white/85 whitespace-pre-wrap">{openClient.clientText || '—'}</div>

                <Attachments
                  photos={openClient.clientPhotos}
                  videos={openClient.clientVideos}
                  files={openClient.clientFiles}
                />
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
                <div className="text-sm font-semibold text-white/90">{isKa ? 'პირველი მტკიცებულება' : 'First evidence'}</div>

                {/* if evidence has fixFor -> that is first evidence; else evidence itself is first */}
                {openWorker.evidence?.fixFor ? (
                  <>
                    <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.evidence.fixFor.text || '—'}</div>
                    <Attachments
                      photos={openWorker.evidence.fixFor.photos}
                      videos={openWorker.evidence.fixFor.videos}
                      files={openWorker.evidence.fixFor.files}
                    />
                  </>
                ) : (
                  <>
                    <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.evidence?.text || '—'}</div>
                    <Attachments
                      photos={openWorker.evidence?.photos || []}
                      videos={openWorker.evidence?.videos || []}
                      files={openWorker.evidence?.files || []}
                    />
                  </>
                )}
              </div>
            ) : workerTab === 'E2' ? (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
                <div className="text-sm font-semibold text-white/90">{isKa ? 'მეორე მტკიცებულება' : 'Second evidence'}</div>

                {/* child fix evidence: evidence.fixes[0] */}
                {openWorker.evidence?.fixes?.[0] ? (
                  <>
                    <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.evidence.fixes[0].text || '—'}</div>
                    <Attachments
                      photos={openWorker.evidence.fixes[0].photos}
                      videos={openWorker.evidence.fixes[0].videos}
                      files={openWorker.evidence.fixes[0].files}
                    />
                  </>
                ) : (
                  <div className="text-sm text-white/70">{isKa ? 'მეორე მტკიცებულება არ არსებობს.' : 'No second evidence.'}</div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
                <div className="text-sm font-semibold text-white/90">{isKa ? 'დავის მიზეზი (შემსრულებელი)' : 'Dispute reason (worker)'}</div>
                <div className="text-sm text-white/85 whitespace-pre-wrap">{openWorker.workerText || '—'}</div>
                <Attachments
                  photos={openWorker.workerPhotos}
                  videos={openWorker.workerVideos}
                  files={openWorker.workerFiles}
                />
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
