'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ka from '../../messages/ka.json';
import en from '../../messages/en.json';
import { ShoppingBag, ShieldCheck, ClipboardList } from 'lucide-react';
import NeonPowerSwitch from '@/components/NeonPowerSwitch';

import TaskyLogoDraw from '@/components/TaskyLogoDraw';
import TaskModal from '@/components/task/TaskModal';

type Locale = 'ka' | 'en';

// უსაფრთხოდ ამოიღე იუზერის იდენტიფიკატორი (თუ არსებობს)
function getUidSafe(): string | null {
  try {
    const email = localStorage.getItem('email');
    const uid = localStorage.getItem('uid');
    const token = localStorage.getItem('token');
    const val = (email || uid || token || '').trim();
    return val || null;
  } catch {
    return null;
  }
}

export default function Home({ params }: { params: { locale: Locale } }) {
  const m: any = params.locale === 'ka' ? ka : en;

  // Sound
  const navRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = new Audio('/sfx/nav.mp3');
    a.preload = 'auto';
    a.volume = 0.55;
    a.load();
    navRef.current = a;
  }, []);
  const playNav = () => {
    const a = navRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      void a.play();
    } catch {}
  };

  // Auth flag
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    try {
      setAuthed(Boolean(localStorage.getItem('auth') || localStorage.getItem('token')));
    } catch {
      setAuthed(false);
    }
  }, []);
  const startHref = authed ? `/${params.locale}/tasky` : `/${params.locale}/auth/register`;

  // Modal control
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resetTick, setResetTick] = useState(0);

  // Power switch -> ლოგოს აჩქარება
  const [powerOn, setPowerOn] = useState(false);

  // ზარი TaskyLogoDraw-დან — როცა ნაწილაკები უკვე შეკრებილნი არიან ცენტრში
  const handleExplode = useCallback(async () => {
    let id: string | null = null;

    try {
      const uid = getUidSafe();

      if (uid) {
        // ავტორიზებული: მხოლოდ რეკომენდებული, თვითონ დადებული და უკვე აღებული გამოირიცხება სერვერზე
        const r = await fetch('/api/tasks/recomend', {
          cache: 'no-store',
          headers: { 'x-user-id': uid },
        });
        if (r.ok) {
          const j = (await r.json().catch(() => ({}))) as any;
          id = j?.id ?? null;
        } else {
          // ავტორიზებულზე არ ვფოლბექდებით random-published-ზე — თუ არ არის აღარ ვხსნით მოდალს
          id = null;
        }
      } else {
        // სტუმარი: რენდომად გამოქვეყნებული
        const r = await fetch('/api/tasks/random-published', { cache: 'no-store' });
        if (r.ok) {
          const j = (await r.json().catch(() => ({}))) as any;
          id = j?.id ?? null;
        }
      }
    } catch {
      id = null;
    }

    if (!id) {
      // თუ შესაფერისი ტასკი ვერ მოიძებნა, მოდალი არ გაიხსნას, სვიჩი მაინც OFF-ზე გადავიყვანოთ
      setTaskId(null);
      setPowerOn(false);
      return;
    }

    setTaskId(id);
    setOpen(true); // ნაწილაკები უკვე შეკრებილია — პირდაპირ ვხსნით მოდალს
    setPowerOn(false); // აფეთქების შემდეგ სვიჩი ავტომატურად გათიშულზე გადადის
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setResetTick((v) => v + 1); // ლოგო აღდგება და კვლავ იტრიალებს
  }, []);

  return (
    <div className="space-y-12">
      {/* HERO */}
      <section className="grid md:grid-cols-[1.1fr,0.9fr] gap-10 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">{m.home.title}</h1>
          <p className="text-white/80 text-lg max-w-prose">{m.home.subtitle}</p>
<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-sm">
            <Link
              href={startHref}
              onClick={playNav}
              className="btn-hero-primary w-full sm:w-auto"
              data-text={m.cta.getStarted} // <<< გლიჩისთვის
            >
              <span className="btn-text">{m.cta.getStarted}</span>
            </Link>

            <Link
              href={`/${params.locale}/tasky`}
              onClick={playNav}
              className="btn-hero-secondary w-full sm:w-auto"
              data-text={m.cta.browseTasks} // <<< გლიჩისთვის
            >
              <span className="btn-text">{m.cta.browseTasks}</span>
            </Link>
          </div>
        </div>

        {/* Logo + Power switch */}
<div className="relative w-full h-auto min-h-[260px] md:h-[min(42vw,420px)] flex flex-col items-center justify-center gap-4">
          <TaskyLogoDraw
            size={400}
            spin
            spinSpeedSec={8}
            maxMulHover={40}
            accelPerSec={7}
            decelPerSec={4}
            fadeDelayMs={0}
            onExplode={handleExplode}
            resetOn={resetTick}
            powered={powerOn}      // სვიჩი ამარაგებს „ძალს“
            hoverAccel={false}     // მაუსის მიტანა აღარ ასწრაფებს
          />

          <NeonPowerSwitch
            
            checked={powerOn}
            onChange={setPowerOn}
          />
        </div>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-4">
        {[
          { Icon: ShoppingBag, t: m.home.features[0] },
          { Icon: ShieldCheck, t: m.home.features[1] },
          { Icon: ClipboardList, t: m.home.features[2] },
        ].map(({ Icon, t }: any, i: number) => (
          <div
            key={i}
            className="card p-5 rounded-2xl border border-white/10 bg-gradient-to-tr from-cyan/10 to-transparent hover:from-cyan/15 transition"
          >
            <div className="mb-3 w-9 h-9 rounded-xl bg-cyan/25 text-cyan flex items-center justify-center shadow-neon">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-1">{t.title}</h3>
            <p className="text-white/75 text-sm leading-relaxed">{t.body}</p>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-center">{m.home.howItWorks.title}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {m.home.howItWorks.steps.map((s: any, i: number) => {
            const colorClass =
              i === 0
                ? 'text-emerald-400 ring-emerald-500/60'
                : i === 1
                ? 'text-violet-400 ring-violet-500/60'
                : 'text-yellow-400 ring-yellow-500/60';
            return (
              <div key={i} className="flex flex-col items-center text-center gap-3">
                <div className={`w-14 h-14 rounded-full ring-2 ${colorClass} flex items-center justify-center`}>
                  <span className="text-lg font-semibold">{i + 1}</span>
                </div>
                <div className="font-semibold">{s.t}</div>
                <div className="text-white/75 text-sm max-w-[260px]">{s.d}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal */}
      <TaskModal open={open} taskId={taskId} onClose={handleClose} />

      {/* Modal grow animation — პირდაპირ დაიფარება თვითონ მოდალს */}
      <style jsx global>{`
        /* თვითონ მოდალის კონტენტი – პატარა იბადება ცენტრში და იზრდება */
        .tasky-modal {
          animation: tasky-modal-seed 0.36s cubic-bezier(0.2, 0.8, 0.2, 1) both;
          transform-origin: 50% 50%;
          will-change: transform, opacity, filter;
          backface-visibility: hidden;
        }
        @keyframes tasky-modal-seed {
          0% {
            transform: scale(0.6);
            opacity: 0;
            filter: blur(6px);
          }
          40% {
            opacity: 1;
            filter: blur(0);
          }
          72% {
            transform: scale(1.03);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* overlay-ის რბილი ფეიდი */
        .modal-overlay {
          animation: tasky-overlay-fade 0.36s ease-out both;
        }
        @keyframes tasky-overlay-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tasky-modal,
          .modal-overlay {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
