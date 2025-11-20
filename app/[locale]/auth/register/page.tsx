'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ka from '../../../../messages/ka.json';
import en from '../../../../messages/en.json';
import { useMemo, useState } from 'react';

/** International calling codes (short list; მარტივად შეzeriეთ მეტი) */
const COUNTRY_CODES: Array<{ code: string; label: string }> = [
  { code: '+995', label: 'Georgia (+995)' },
  { code: '+1', label: 'United States (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+7', label: 'Russia (+7)' },
  { code: '+90', label: 'Türkiye (+90)' },
  { code: '+380', label: 'Ukraine (+380)' },
  { code: '+48', label: 'Poland (+48)' },
  { code: '+40', label: 'Romania (+40)' },
  { code: '+972', label: 'Israel (+972)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+212', label: 'Morocco (+212)' },
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+27', label: 'South Africa (+27)' }
];

function PhoneCodeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = COUNTRY_CODES.find((c) => c.code === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-w-[220px] rounded-lg bg-black/70 text-white border border-white/10 px-3 py-2
                   flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current ? current.label : value}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
          <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-white/10
                     bg-black text-white shadow-lg"
          role="listbox"
        >
          {COUNTRY_CODES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-white/10"
              role="option"
              aria-selected={c.code === value}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-6 top-6 max-w-xl w-[92vw] card rounded-2xl p-6 shadow-neon">
        <div className="flex items-center justify_between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg_white/15"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="text-white/80 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function RegisterPage({
  params: { locale },
}: {
  params: { locale: 'ka' | 'en' };
}) {
  const m: any = locale === 'ka' ? ka : en;
  const t = useMemo(
    () => ({
      repeat: locale === 'ka' ? 'გაიმეორე პაროლი' : 'Repeat password',
      phoneLocal: locale === 'ka' ? 'მობილურის ნომერი' : 'Mobile number',
      phoneCode: locale === 'ka' ? 'ქვეყნის კოდი' : 'Country code',
      mismatch: locale === 'ka' ? 'პაროლები არ ემთხვევა' : 'Passwords do not match',
      emailTaken: locale === 'ka' ? 'Email უკვე გამოყენებულია.' : 'Email already in use.',
      phoneTaken: locale === 'ka' ? 'მობილურის ნომერი უკვე გამოიყენება.' : 'Mobile number already in use.',
      usernameTaken: locale === 'ka' ? 'მომხმარებლის სახელი უკვე გამოიყენება.' : 'Username already in use.',
      weakPwd: locale === 'ka' ? 'პაროლი ძალიან მოკლეა (მინ. 6).' : 'Password too short (min 6).',
      invalidEmail: locale === 'ka' ? 'ელფოსტა არასწორია.' : 'Invalid email.',
      genericErr: locale === 'ka' ? 'რეგისტრაციის შეცდომა.' : 'Registration error.',
      termsTitle: locale === 'ka' ? 'წესები და პირობები' : 'Terms & Conditions',
      privacyTitle: locale === 'ka' ? 'კონფიდენციალურობის პოლიტიკა' : 'Privacy Policy',
    }),
    [locale]
  );

  const r = useRouter();

  const [form, setForm] = useState({
    username: '',
    email: '',
    code: '+995',
    phone: '',
    pwd: '',
    pwd2: '',
    agree: false,
  });

  const [errors, setErrors] = useState<{ username?: string; email?: string; pwd2?: string; phone?: string }>({});
  const [serverErr, setServerErr] = useState<string>('');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const onChangePhone = (v: string) => {
    const onlyDigits = v.replace(/\D/g, '').slice(0, 9);
    setForm((f) => ({ ...f, phone: onlyDigits }));
  };

  function validate(): boolean {
    const newErr: typeof errors = {};
    if (form.pwd !== form.pwd2) newErr.pwd2 = t.mismatch;
    if (form.phone.length !== 9) newErr.phone = locale === 'ka' ? 'შეიყვანე 9 ციფრი' : 'Enter 9 digits';
    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerErr('');
    if (!validate()) return;

    const phoneFull = `${form.code}${form.phone}`;
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.pwd,
          name: form.username.trim(),   // username -> DB.name
          phone: phoneFull,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const code = j?.error;
        setServerErr(
          code === 'email_taken' ? t.emailTaken :
          code === 'phone_taken' ? t.phoneTaken :
          code === 'username_taken' ? t.usernameTaken :
          code === 'weak_password' ? t.weakPwd :
          code === 'invalid_email' ? t.invalidEmail :
          t.genericErr
        );
        return;
      }

      // წარმატებისას API დააყენებს ქუქებს; UI გადავიდეს mypage-ზე
      try {
        const j = await res.json().catch(() => null);
        localStorage.setItem('auth', '1');
        if (j?.id) localStorage.setItem('uid', j.id);
        if (j?.email) localStorage.setItem('email', j.email);
        window.dispatchEvent(new Event('auth-change'));
      } catch {}

      r.replace(`/${locale}/mypage`);
    } catch {
      setServerErr(t.genericErr);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card rounded-რ2xl p-8">
        <h1 className="text-center text-3xl font-extrabold mb-2">{m.auth.createTitle}</h1>
        <p className="text-center text-white/70 mb-8">{m.auth.createSubtitle}</p>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm mb-1">{m.auth.username}</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
              placeholder="your_username"
              required
            />
            {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text_sm mb-1">{m.auth.email}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
              placeholder="you@example.com"
              required
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone (country code + local) */}
          <div>
            <label className="block text-sm mb-1">{m.auth.mobile}</label>
            <div className="flex gap-2">
              <PhoneCodeSelect
                value={form.code}
                onChange={(v) => setForm({ ...form, code: v })}
              />
              <input
                value={form.phone}
                onChange={(e) => onChangePhone(e.target.value)}
                className="w-full rounded-lg bg-black/30 border border_white/10 px-3 py-2"
                placeholder="5XX XX XX XX"
                inputMode="numeric"
                pattern="[0-9]{9}"
                maxLength={9}
                required
              />
            </div>
            <p className="text-xs text-white/60 mt-1">
              <span className="text-white/80">{form.code}{form.phone || '5XX XX XX XX'}</span>
            </p>
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Password */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">{m.auth.password}</label>
              <input
                type="password"
                value={form.pwd}
                onChange={(e) => setForm({ ...form, pwd: e.target.value })}
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                placeholder={locale === 'ka' ? 'შექმენი პაროლი' : 'Create a password'}
                required
              />
              <div className="text-xs text-white/60 mt-1">
                {locale === 'ka'
                  ? 'გამოიყენე 6+ სიმბოლო ასოებისა და ციფრების კომბინაციით.'
                  : 'Use 6+ characters with a mix of letters & numbers.'}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">{t.repeat}</label>
              <input
                type="password"
                value={form.pwd2}
                onChange={(e) => setForm({ ...form, pwd2: e.target.value })}
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                placeholder={locale === 'ka' ? 'გაიმეორე პაროლი' : 'Repeat password'}
                required
              />
              {errors.pwd2 && <p className="text-red-400 text-xs mt-1">{errors.pwd2}</p>}
            </div>
          </div>

          {/* Agree */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => setForm({ ...form, agree: e.target.checked })}
              required
            />
            <span>
              {m.auth.agree}{' '}
              <button type="button" className="underline" onClick={() => setShowTerms(true)}>
                {m.auth.terms}
              </button>{' '}
              {m.auth.and}{' '}
              <button type="button" className="underline" onClick={() => setShowPrivacy(true)}>
                {m.auth.privacy}
              </button>
            </span>
          </label>

          {serverErr && <div className="text-red-400 text-sm">{serverErr}</div>}

          <button
            type="submit"
            className="w-full rounded-xl bg-cyan text-black font-semibold py-3 shadow-neონ"
          >
            {m.auth.createBtn}
          </button>
        </form>

        <div className="text-center mt-6 text-sm">
          {m.auth.haveAccount}{' '}
          <Link href={`/${locale}/auth/login`} className="text-cyan hover:underline">
            {m.auth.goLogin}
          </Link>
        </div>
      </div>

      {/* Modals */}
      <Modal open={showTerms} onClose={() => setShowTerms(false)} title={t.termsTitle}>
        {locale === 'ka'
          ? 'დროებითი ტექსტი: აქ გამოჩნდება წესები და პირობები. შეგიძლია ჩაანაცვლო რეალური დოკუმენტით.'
          : 'Temporary text: your Terms & Conditions will appear here. Replace with your real document.'}
      </Modal>
      <Modal open={showPrivacy} onClose={() => setShowPrivacy(false)} title={t.privacyTitle}>
        {locale === 'ka'
          ? 'დროებითი ტექსტი: აქ იქნება კონფიდენციალურობის პოლიტიკა. შეცვალე შემდგომში.'
          : 'Temporary text: your Privacy Policy goes here. Update with the real one later.'}
      </Modal>
    </div>
  );
}
