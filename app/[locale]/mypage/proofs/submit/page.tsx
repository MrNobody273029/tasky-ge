'use client';

import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Image as ImageIcon, Film, FileArchive, AlertTriangle } from 'lucide-react';

type Locale = 'ka' | 'en';

type FixForInfo = {
  id: string;
  needsFixesReason: string | null;
  needsFixesAt: string | null;
};

type EvidenceItemMini = {
  id: string;
  fixFor: FixForInfo | null;
};

type ResourceKind = 'image' | 'video' | 'raw';

async function getSignature(kind: ResourceKind, folder: string) {
  const res = await fetch(`/api/cloudinary/sign?type=${kind}&folder=${encodeURIComponent(folder)}`, {
    cache: 'no-store',
  });
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

export default function ProofSubmitPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const isKa = locale === 'ka';
  const router = useRouter();
  const search = useSearchParams();

  const taskFromQuery = search.get('task') || '';
  const fixFor = (search.get('fixFor') || '').trim();

  const [taskId] = useState(() => {
    if (taskFromQuery) return taskFromQuery;
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('tasky:evidenceTaskId') || '';
    }
    return '';
  });

  const t = useMemo(
    () => ({
      title: isKa ? 'მტკიცებულებების გაგზავნა' : 'Submit evidence',
      titleFix: isKa ? 'ხარვეზის გამოსწორება — ხელახლა გაგზავნა' : 'Fix requested — resubmit evidence',
      textLabel: isKa ? 'აღწერა / კომენტარი' : 'Text / comment',
      textPh: isKa ? 'დაწერე რა გააკეთე…' : 'Describe what you did…',
      photosLabel: isKa ? 'ფოტოები (მაქს. 6)' : 'Photos (max 6)',
      photosHint: isKa ? 'JPEG/PNG. ახალის დამატებისას ძველები არ იშლება.' : 'JPEG/PNG. New uploads are added, not replaced.',
      videoLabel: isKa ? 'ვიდეო (არასავალდებულო)' : 'Video (optional)',
      videoHint: isKa ? 'შეგიძლია ატვირთო ერთი ვიდეო (მაგ. პროცესის ჩანაწერი).' : 'You can upload a single video (e.g. screen recording).',
      filesLabel: isKa ? 'ZIP ფაილები (არასავალდებულო)' : 'ZIP files (optional)',
      filesHint: isKa ? 'სასურველია .zip არქივი (დოკუმენტები, წყარო კოდი და ა.შ.).' : 'Prefer a .zip archive with docs, source, etc.',
      errorEmpty: isKa ? 'მინიმუმ ერთი ველი უნდა იყოს შევსებული: ტექსტი, ფოტო, ვიდეო ან ZIP.' : 'Please provide at least one: text, photo, video or ZIP file.',
      errorNoTask: isKa ? 'დავალების ID ვერ მოიძებნა.' : 'Task ID is missing.',
      send: isKa ? 'მტკიცებულების გაგზავნა' : 'Send evidence',
      sending: isKa ? 'იგზავნება…' : 'Sending…',
      cancel: isKa ? 'გამოსვლა' : 'Back',
      fixesBlockTitle: isKa ? 'დამკვეთის წარდგენილი ხარვეზი:' : 'Client requested fixes:',
      noFixText: isKa ? 'ხარვეზის ტექსტი ვერ მოიძებნა.' : 'Fix reason not found.',
    }),
    [isKa],
  );

  const [fixInfo, setFixInfo] = useState<FixForInfo | null>(null);

  useEffect(() => {
    if (!fixFor) return;
    // We can get it by loading outgoing evidences and finding that id
    fetch('/api/my/evidences?tab=outgoing', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: EvidenceItemMini[]) => {
        const found = (arr as any[]).find((x) => x?.id === fixFor);
        const info: FixForInfo = {
          id: fixFor,
          needsFixesReason: found?.needsFixesReason ?? null,
          needsFixesAt: found?.needsFixesAt ?? null,
        };
        setFixInfo(info);
      })
      .catch(() => setFixInfo({ id: fixFor, needsFixesReason: null, needsFixesAt: null }));
  }, [fixFor]);

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const onSubmit = async () => {
    if (!taskId) {
      setError(t.errorNoTask);
      return;
    }

    const hasText = text.trim().length > 0;
    const hasPhotos = photos.length > 0;
    const hasVideo = !!video;
    const hasFiles = files.length > 0;

    if (!hasText && !hasPhotos && !hasVideo && !hasFiles) {
      setError(t.errorEmpty);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const folder = `tasky/evidences/${taskId}`;

      const photoUrls: string[] = [];
      for (const f of photos) photoUrls.push(await uploadToCloudinary(f, 'image', folder));

      let videoUrl: string | null = null;
      if (video) videoUrl = await uploadToCloudinary(video, 'video', folder);

      const fileUrls: string[] = [];
      for (const f of files) fileUrls.push(await uploadToCloudinary(f, 'raw', folder));

      const qs = new URLSearchParams();
      qs.set('fixFor', fixFor || '');
      const url = fixFor ? `/api/tasks/${taskId}/evidence?${qs.toString()}` : `/api/tasks/${taskId}/evidence`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          photos: photoUrls,
          videos: videoUrl ? [videoUrl] : [],
          files: fileUrls,
          fixForId: fixFor || null,
        }),
      });

      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setError(j?.error || 'Request failed');
        setBusy(false);
        return;
      }

      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`tasky:evidenceSent:${taskId}`, '1');
          window.localStorage.removeItem('tasky:evidenceTaskId');
        }
      } catch {}

      router.push(`/${locale}/mypage/proofs?tab=outgoing`);
    } catch (e: any) {
      setError(e?.message || 'Network error');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{fixFor ? t.titleFix : t.title}</h1>

      {fixFor && (
        <div className="rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/30 p-4">
          <div className="text-xs text-amber-200 mb-2">{t.fixesBlockTitle}</div>
          <div className="text-sm text-white/85 whitespace-pre-wrap">
            {fixInfo?.needsFixesReason?.trim() ? fixInfo.needsFixesReason : t.noFixText}
          </div>
        </div>
      )}

      {taskId && (
        <div className="text-sm text-white/60">
          Task ID: <span className="font-mono text-white/80">{taskId}</span>
        </div>
      )}

      <div className="card p-6 space-y-6">
        <div>
          <label className="block text-sm text-white/70 mb-1">{t.textLabel}</label>
          <textarea
            className="w-full px-3 py-2 rounded-lg bg-white/5 min-h-[140px] outline-none focus:ring-2 focus:ring-cyan/40"
            placeholder={t.textPh}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-cyan" />
            {t.photosLabel}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPhotosChange}
            className="block w-full text-sm text-white/80
                       file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                       file:bg-gradient-to-r file:from-cyan-400 file:via-sky-400 file:to-fuchsia-500
                       file:text-slate-900 file:font-semibold
                       hover:file:shadow-[0_0_18px_rgba(56,189,248,0.7)]
                       cursor-pointer bg-transparent"
          />
          <div className="text-xs text-white/50 mt-1">{t.photosHint}</div>

          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((f, i) => {
                const src = URL.createObjectURL(f);
                return (
                  <div key={i} className="relative rounded-lg bg-white/5 p-2 flex items-center justify-center" style={{ height: 120 }}>
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs px-2 py-1"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                    <img
                      src={src}
                      alt={f.name}
                      className="max-h-full max-w-full object-contain"
                      onLoad={() => URL.revokeObjectURL(src)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1 flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-400" />
            {t.videoLabel}
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={onVideoChange}
            className="block w-full text-sm text-white/80
                       file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                       file:bg-gradient-to-r file:from-cyan-400 file:via-sky-400 file:to-fuchsia-500
                       file:text-slate-900 file:font-semibold
                       hover:file:shadow-[0_0_18px_rgba(56,189,248,0.7)]
                       cursor-pointer bg-transparent"
          />
          <div className="text-xs text-white/50 mt-1">{t.videoHint}</div>

          {video && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
              <span className="truncate max-w-[70%]">{video.name}</span>
              <button type="button" onClick={clearVideo} className="text-xs text-red-300 hover:text-red-200">✕</button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-1 flex items-center gap-2">
            <FileArchive className="w-4 h-4 text-amber-400" />
            {t.filesLabel}
          </label>
          <input
            type="file"
            accept=".zip,.rar,.7z"
            multiple
            onChange={onFilesChange}
            className="block w-full text-sm text-white/80
                       file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                       file:bg-gradient-to-r file:from-cyan-400 file:via-sky-400 file:to-fuchsia-500
                       file:text-slate-900 file:font-semibold
                       hover:file:shadow-[0_0_18px_rgba(56,189,248,0.7)]
                       cursor-pointer bg-transparent"
          />
          <div className="text-xs text-white/50 mt-1">{t.filesHint}</div>

          {files.length > 0 && (
            <div className="mt-2 space-y-1 text-sm">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5">
                  <span className="truncate max-w-[70%]">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-xs text-red-300 hover:text-red-200">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-1 flex items-center gap-2 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-hero-secondary text-sm disabled:opacity-60"
            disabled={busy}
            data-text={t.cancel}
          >
            <span className="btn-text">{t.cancel}</span>
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className="btn-hero-primary text-sm disabled:opacity-60"
            disabled={busy}
            data-text={busy ? t.sending : t.send}
          >
            <span className="btn-text">{busy ? t.sending : t.send}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
