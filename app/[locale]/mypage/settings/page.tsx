'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Trash2, X, Star } from 'lucide-react';
import clsx from 'clsx';

type Role = 'client' | 'worker';
type Review = { role: Role; stars: number; text: string; date: string };

type Me = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  image: string | null;
};

export default function SettingsPage({
  params: { locale },
}: {
  params: { locale: 'ka' | 'en' };
}) {
  /* ---------------- i18n ---------------- */
  const t = useMemo(() => {
    const KA = {
      pageTitle: 'პარამეტრები',
      profile: 'პროფილი',
      uploadNew: 'ახლის ატვირთვა',
      remove: 'წაშლა',
      username: 'მომხმარებელი',
      email: 'მეილი',
      mobile: 'მობილური',
      reviewsTitle: 'შეფასებები და კომენტარები',
      tabClient: 'დამკვეთი',
      tabWorker: 'შემსრულებელი',
      avg: 'საშ.',
      reviews: 'შეფასება',
      noReviews: 'ჯერჯერობით არცერთი შეფასება.',
      pwdTitle: 'პაროლის შეცვლა',
      pwdCurrent: 'მიმდინარე პაროლი',
      pwdNew: 'ახალი პაროლი',
      pwdConfirm: 'გაიმეორე ახალი პაროლი',
      pwdUpdate: 'პაროლის განახლება',
      pwdNoteNoCurrent:
        'ამჟამად პაროლი არ გაქვს დაყენებული — შეგიძლია ახალი დააყენო.',
      pwdErrCurrent: 'მიმდინარე პაროლი არასწორია.',
      pwdErrLen: 'ახალი პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.',
      pwdErrMatch: 'ახალი პაროლები ერთმანეთს არ ემთხვევა.',
      pwdOk: 'პაროლი განახლდა.',
      modalRemoveTitle: 'ავატარის წაშლა',
      modalRemoveText: 'დარწმუნებული ხარ რომ გინდა პროფილის სურათის წაშლა?',
      cancel: 'გაუქმება',
      remove2: 'წაშლა',
      loading: 'იტვირთება…',
      notAuth: 'ავტორიზაციაა საჭირო.',
      saveError: 'შენახვის შეცდომა.',
    };
    const EN = {
      pageTitle: 'Settings',
      profile: 'Profile',
      uploadNew: 'Upload new',
      remove: 'Remove',
      username: 'Username',
      email: 'Email',
      mobile: 'Mobile',
      reviewsTitle: 'Reviews & comments',
      tabClient: 'Client',
      tabWorker: 'Worker',
      avg: 'Avg',
      reviews: 'reviews',
      noReviews: 'No reviews yet.',
      pwdTitle: 'Change password',
      pwdCurrent: 'Current password',
      pwdNew: 'New password',
      pwdConfirm: 'Confirm new password',
      pwdUpdate: 'Update password',
      pwdNoteNoCurrent:
        'No current password set — you can set a new one now.',
      pwdErrCurrent: 'Current password is incorrect.',
      pwdErrLen: 'New password must be at least 6 characters.',
      pwdErrMatch: 'New passwords do not match.',
      pwdOk: 'Password updated.',
      modalRemoveTitle: 'Remove avatar',
      modalRemoveText:
        'Are you sure you want to remove your profile picture?',
      cancel: 'Cancel',
      remove2: 'Remove',
      loading: 'Loading…',
      notAuth: 'Authentication required.',
      saveError: 'Save error.',
    };
    return locale === 'ka' ? KA : EN;
  }, [locale]);

  /* ---------------- Profile data (DB) ---------------- */
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('User');
  const [phone, setPhone] = useState<string>('');
  const [avatar, setAvatar] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [authErr, setAuthErr] = useState<string>('');

  // მხოლოდ password demo-სთვის გვჭირდება localStorage key
  const emailKey = (email || 'guest').toLowerCase();
  const pwdKey = `password:${emailKey}`;

  const [hasPwd, setHasPwd] = useState<boolean>(false);

  // DB-დან ამოღება
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setAuthErr('');
    fetch('/api/me', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) {
          throw new Error('unauth');
        }
        if (!r.ok) throw new Error('fetch_failed');
        return (await r.json()) as Me;
      })
      .then((u) => {
        if (!alive) return;
        const em = u.email || '';
        setEmail(em);
        setUsername(u.name || (em ? em.split('@')[0] : 'User'));
        setPhone(u.phone || '');
        setAvatar(u.image || null);
      })
      .catch((e) => {
        if (!alive) return;
        setAuthErr(e?.message === 'unauth' ? t.notAuth : '');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ლოკალური demo password ქეში (არ ეხება სერვერულ პაროლს)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(pwdKey) || '';
      setHasPwd(!!saved);
    } catch {}
  }, [pwdKey]);

  /* ---------------- Avatar upload / remove ---------------- */
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [askRemove, setAskRemove] = useState(false);

  const onPick = () => fileRef.current?.click();

  const patchMe = async (body: Partial<Pick<Me, 'image'>>) => {
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('patch_failed');
    return (await res.json()) as Me;
  };

  // Cloudinary upload for avatar
  async function uploadAvatarToCloudinary(file: File): Promise<string> {
    // მოვითხოვოთ ხელმოწერა
    const signRes = await fetch('/api/upload/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'avatar' }),
    });
    if (!signRes.ok) {
      const j = await signRes.json().catch(() => ({}));
      throw new Error(j?.error || 'sign_failed');
    }
    const raw = await signRes.json();
    const signature = raw.signature;
    const timestamp = raw.timestamp;
    const folder = raw.folder;
    const cloudName = raw?.cloud?.cloudName ?? raw?.cloudName;
    const apiKey = raw?.cloud?.apiKey ?? raw?.apiKey;
    if (!cloudName || !apiKey) throw new Error('cloud_conf_missing');

    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', String(apiKey));
    fd.append('timestamp', String(timestamp));
    fd.append('signature', String(signature));
    fd.append('folder', folder);

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const r = await fetch(endpoint, { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error?.message || 'upload_failed');
    return String(j.secure_url);
  }

  const onFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;

    // ოპტიმისტური thumbnail preview
    const tempUrl = URL.createObjectURL(f);
    setAvatar(tempUrl);

    try {
      const url = await uploadAvatarToCloudinary(f);
      const u = await patchMe({ image: url });
      setAvatar(u.image || url);
    } catch {
      alert(t.saveError);
      // თუ ჩაინგრა, ძველს ვტოვებთ (თუ იყო), თორემ გავთიშოთ დროებითი
      setAvatar((prev) => (prev === tempUrl ? null : prev));
    } finally {
      ev.target.value = '';
      URL.revokeObjectURL(tempUrl);
    }
  };

  const onRemoveAvatar = async () => {
    setAskRemove(false);
    try {
      const u = await patchMe({ image: null });
      setAvatar(u.image || null);
    } catch {
      alert(t.saveError);
    }
  };

  /* ---------------- Reviews (read-only feed for this user) ---------------- */

  const [tab, setTab] = useState<Role>('client');
  const [reviews, setReviews] = useState<Review[]>([]);

  // ახალი: ვკითხულობთ რეიტინგებს ბექიდან, აღარ ვიყენებთ localStorage-ს
  useEffect(() => {
    let alive = true;

    async function loadReviews() {
      try {
        const res = await fetch('/api/me/reviews', { cache: 'no-store' });
        if (!res.ok) throw new Error('fetch_failed');
        const data = (await res.json()) as Review[];
        if (!alive) return;
        setReviews(data);
      } catch {
        if (!alive) return;
        setReviews([]);
      }
    }

    loadReviews();
    return () => {
      alive = false;
    };
  }, []);

  const roleReviews = useMemo(
    () => reviews.filter((r) => r.role === tab),
    [reviews, tab],
  );
  const stats = useMemo(() => {
    const count = roleReviews.length;
    const avg = count
      ? roleReviews.reduce((s, r) => s + r.stars, 0) / count
      : 0;
    return { count, avg: Math.round(avg * 10) / 10 };
  }, [roleReviews]);

  /* ---------------- Password (demo/local only) ---------------- */
  const [pwdNow, setPwdNow] = useState('');
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ ok?: string; err?: string }>({});

  const onChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = localStorage.getItem(pwdKey) || '';
      if (saved && pwdNow !== saved) {
        setPwdMsg({ err: t.pwdErrCurrent });
        return;
      }
      if (pwd1.length < 6) {
        setPwdMsg({ err: t.pwdErrLen });
        return;
      }
      if (pwd1 !== pwd2) {
        setPwdMsg({ err: t.pwdErrMatch });
        return;
      }
      localStorage.setItem(pwdKey, pwd1);
      setHasPwd(true);
      setPwdMsg({ ok: t.pwdOk });
      setPwdNow('');
      setPwd1('');
      setPwd2('');
    } catch {
      setPwdMsg({ err: t.pwdErrCurrent });
    }
  };

  /* ---------------- Helpers ---------------- */
  const uploadLabel = t.uploadNew;
  const pwdUpdateLabel = t.pwdUpdate;

  const StarRowCmp = ({ value }: { value: number }) => (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = n <= Math.round(value);
        return (
          <div
            key={n}
            className="w-6 h-6 rounded-md flex items-center justify-center"
            aria-label={`star-${n}`}
          >
            <Star
              className={clsx(
                'w-4 h-4',
                filled ? 'fill-yellow-400 text-yellow-400' : 'text-white/40',
              )}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t.pageTitle}</h1>

      {/* Loading / auth error */}
      {loading ? (
        <div className="text-white/60">{t.loading}</div>
      ) : authErr ? (
        <div className="text-red-400">{authErr}</div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* PROFILE */}
        <div className="card p-6 space-y-4">
          <div className="font-semibold">{t.profile}</div>

          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10"
              style={
                avatar
                  ? {
                      backgroundImage: `url(${avatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : {}
              }
            />

            <div className="space-x-3">
              {/* ახლის ატვირთვა – გლიჩი */}
       <button
  onClick={onPick}
  className="btn-hero-secondary btn-no-glitch text-sm inline-flex items-center gap-2 disabled:opacity-60"
>
  <Upload className="w-4 h-4" />
  <span>{t.uploadNew}</span>
</button>


              {/* წაშლა – წითელი, უგლიჩოდ */}
              <button
                onClick={() => setAskRemove(true)}
                className="btn-logout text-sm inline-flex items-center gap-2 disabled:opacity-60"
                disabled={!avatar}
                aria-disabled={!avatar}
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.remove}</span>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div>
              <div className="text-xs text-white/60">{t.username}</div>
              <div className="font-medium">{username || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-white/60">{t.email}</div>
              <div className="font-medium break-all">{email || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-white/60">{t.mobile}</div>
              <div className="font-medium">{phone || '—'}</div>
            </div>
          </div>
        </div>

        {/* REVIEWS (read-only list) */}
        <div className="card p-6 space-y-4">
          <div className="font-semibold">{t.reviewsTitle}</div>


          <div className="flex items-center gap-2">
            {[
              { k: 'client', label: t.tabClient },
              { k: 'worker', label: t.tabWorker },
            ].map((tt) => {
              const isActive = tab === (tt.k as Role);
              return (
                <button
                  key={tt.k}
                  onClick={() => setTab(tt.k as Role)}
                  className={clsx(
                    'text-sm',
                    isActive ? 'btn-tab-active' : 'btn-hero-ghost',
                  )}
                  data-text={tt.label}
                >
                  <span className="btn-text">{tt.label}</span>
                </button>
              );
            })}

            <div className="ml-auto" />
            <div className="flex items-center gap-3 text-sm">
              <StarRowCmp value={stats.avg || 0} />
              <div className="text-white/80">
                {stats.avg || 0}/5 • {stats.count} {t.reviews}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {roleReviews.length === 0 ? (
              <div className="text-white/60 text-sm">{t.noReviews}</div>
            ) : (
              roleReviews.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/10 p-3 bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between">
                    <StarRowCmp value={r.stars} />
                    <div className="text-xs text-white/50">
                      {new Date(r.date).toLocaleDateString(
                        locale === 'ka' ? 'ka-GE' : 'en-US',
                      )}
                    </div>
                  </div>
                  {r.text && (
                    <div className="mt-2 text-sm text-white/90">
                      {r.text}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PASSWORD (local-only demo; სერვერზე_PARოლი ცალკე API-სით გავაკეთებთ) */}
      <form
        onSubmit={onChangePassword}
        className="card p-6 space-y-4 max-w-3xl"
      >
        <div className="font-semibold">{t.pwdTitle}</div>
        {!hasPwd && (
          <div className="text-xs text-white/60">
            {t.pwdNoteNoCurrent}
          </div>
        )}

        <input
          placeholder={t.pwdCurrent}
          type="password"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          value={pwdNow}
          onChange={(e) => setPwdNow(e.target.value)}
        />
        <input
          placeholder={t.pwdNew}
          type="password"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          value={pwd1}
          onChange={(e) => setPwd1(e.target.value)}
        />
        <input
          placeholder={t.pwdConfirm}
          type="password"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
        />
        {pwdMsg.err && (
          <div className="text-red-400 text-sm">{pwdMsg.err}</div>
        )}
        {pwdMsg.ok && (
          <div className="text-green-400 text-sm">{pwdMsg.ok}</div>
        )}

        <button
          className="btn-hero-secondary text-sm"
          type="submit"
          data-text={pwdUpdateLabel}
        >
          <span className="btn-text">{pwdUpdateLabel}</span>
        </button>

      </form>

      {/* REMOVE AVATAR MODAL */}
      {askRemove && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setAskRemove(false)}
          />
          <div className="card rounded-2xl p-6 max-w-md w-[92vw] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{t.modalRemoveTitle}</div>
              <button
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15"
                onClick={() => setAskRemove(false)}
              >
                <X className="w-4 h-4 m-auto" />
              </button>
            </div>
            <div className="text-white/80 text-sm mb-4">
              {t.modalRemoveText}
            </div>

            <div className="flex justify-end gap-2">
              {/* Cancel – გლიჩი */}
              <button
                className="btn-modal-close text-sm"
                onClick={() => setAskRemove(false)}
                data-text={t.cancel}
              >
                <span className="btn-text">{t.cancel}</span>
              </button>

              {/* Remove – წითელი, უგლიჩოდ */}
              <button
                className="btn-logout text-sm"
                onClick={onRemoveAvatar}
              >
                <span>{t.remove2}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
