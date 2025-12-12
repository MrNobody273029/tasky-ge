'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ka from '../../messages/ka.json';
import en from '../../messages/en.json';
import { ShoppingBag, ShieldCheck, ClipboardList } from 'lucide-react';
import NeonPowerSwitch from '@/components/NeonPowerSwitch';
import TaskyLogoDraw from '@/components/TaskyLogoDraw';
import TaskModal from '@/components/task/TaskModal';
import Image from "next/image";

type Locale = 'ka' | 'en';
type InfoKey = 'payments' | 'clarity';

// ინფო-მოდალის ტექსტები ორივე ენაზე
const INFO_MODAL_CONTENT: Record<
  Locale,
  Record<
    InfoKey,
    {
      title: string;
      paragraphs: string[];
    }
  >
> = {
  ka: {
    payments: {
      title: 'უსაფრთხო გადახდები Tasky-ზე',
      paragraphs: [
        'Tasky-ზე თანხა იბლოკება ე.წ. ესკროუში, სანამ დამკვეთი არ დაადასტურებს, რომ შესრულებული ტასკი სრულად შეესაბამება შეთანხმებულ პირობებს.',
        'თუ რაღაც არასწორად წავა, მხარდაჭერის გუნდს შეუძლია გადახედოს საქმეს და გადახდა სამართლიანად გადანაწილდეს დამკვეთსა და შემსრულებელს შორის.',
        'გარდა ამისა, შეგიძლია ნახო დამკვეთის რეიტინგები და წინა თანამშრომლობების ისტორია, სანამ გადაწყვეტ, რომელ ტასკს დაეთანხმო.'
      ]
    },
    clarity: {
      title: 'ცხადი მოთხოვნები და შედეგი',
      paragraphs: [
        'ყოველ ტასკს ახლავს დეტალური აღწერა: რა უნდა გაკეთდეს, რა ფორმატში უნდა ჩაბარდეს შედეგი, რა ვადებში და რა ბიუჯეტით.',
        'დამკვეთს შეუძლია წინასწარ მიუთითოს საჭირო უნარები, ფაილები და მაგალითები, რათა თავიდან აიცილოთ გაუგებრობა შესრულების პროცესში.',
        'თუ რაიმე არ არის საკმარისად გასაგები, შეგიძლია დასვა შეკითხვები ჩატში მანამდე, სანამ ტასკს ოფიციალურად დაიტოვებ – ასე ორივე მხარე ზუსტად იცის, რას ელოდება.'
      ]
    }
  },
  en: {
    payments: {
      title: 'Secure payments on Tasky',
      paragraphs: [
        'On Tasky, the payment is held in an escrow-like balance until the client confirms that the delivered work matches the agreed requirements.',
        'If something goes wrong, our support team can review the case and make a fair decision on how the payment should be split between client and freelancer.',
        'You can also see the client’s rating and past collaboration history before you decide whether to accept a task.'
      ]
    },
    clarity: {
      title: 'Clear requirements & outcomes',
      paragraphs: [
        'Every task comes with a detailed description: what exactly needs to be done, in what format the result should be delivered, the deadline, and the budget.',
        'Clients can attach examples, files, and required skills up front so you avoid confusion during the work process.',
        'If something is not clear enough, you can ask questions in chat before you officially accept the task, so both sides know exactly what to expect.'
      ]
    }
  }
};

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
  const router = useRouter();
  const m: any = params.locale === 'ka' ? ka : en;
  const infoTexts = INFO_MODAL_CONTENT[params.locale];

  // Install app ტექსტები
  const installCopy =
    params.locale === 'ka'
      ? {
          button: 'დააინსტალირე Tasky აპი',
          title: 'Tasky როგორც აპლიკაცია',
          lines: [
            'თუ შენი ბრაუზერი უშვებს აპის დაყენებას, ზუსტად ამ ღილაკიდან გამოგიტანს სისტემურ ფანჯარას „Install app“. უბრალოდ დაადასტურე.',
            'თუ iOS / Safari-ს იყენებ: დააჭირე Share ღილაკს (ზედა ან ქვედა პანელზე) და შემდეგ აირჩიე „Add to Home Screen“.',
            'ამის შემდეგ Tasky გაჩნდება ჰომსქრინზე როგორც ჩვეულებრივი აპლიკაცია და გაიხსნება ბრაუზერის ზოლის გარეშე.'
          ],
          close: 'კარგი, გასაგებია'
        }
      : {
          button: 'Install Tasky app',
          title: 'Use Tasky as an app',
          lines: [
            'If your browser supports installation, this button will trigger the native “Install app” dialog. Just confirm it.',
            'If you are on iOS / Safari: tap the Share button (top or bottom toolbar) and choose “Add to Home Screen”.',
            'After that, Tasky will appear on your home screen like a normal app and open without the browser URL bar.'
          ],
          close: 'Got it'
        };

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

  // Task modal control
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resetTick, setResetTick] = useState(0);

  // Info modal control (2-ე და 3-ე ბარათისთვის)
  const [infoOpen, setInfoOpen] = useState<InfoKey | null>(null);

  // Power switch -> ლოგოს აჩქარება
  const [powerOn, setPowerOn] = useState(false);

  // Install app state
  const [canInstall, setCanInstall] = useState(false);
  const installPromptRef = useRef<any | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  // beforeinstallprompt event पकड़ვა
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      installPromptRef.current = e;
      setCanInstall(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handler as any);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handler as any);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    playNav();

    const promptEvent = installPromptRef.current;

    if (promptEvent) {
      try {
        promptEvent.prompt();
        await promptEvent.userChoice?.catch(() => null);
      } catch {
        /* ignore */
      }
      // ერთხელ რომ გააკეთებს, event აღარ იმუშავებს
      installPromptRef.current = null;
      setCanInstall(false);
    } else {
      // სადაც პროგრამული install არ მუშაობს (მაგ. iOS) – ვაჩვენოთ ინსტრუქციის მოდალი
      setShowInstallHelp(true);
    }
  };

  // ზარი TaskyLogoDraw-დან — როცა ნაწილაკები უკვე შეკრებილნი არიან ცენტრში
  const handleExplode = useCallback(async () => {
    let id: string | null = null;

    try {
      const uid = getUidSafe();

      if (uid) {
        // ავტორიზებული: მხოლოდ რეკომენდებული, თვითონ დადებული და უკვე აღებული გამოირიცხება სერვერზე
        const r = await fetch('/api/tasks/recomend', {
          cache: 'no-store',
          headers: { 'x-user-id': uid }
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

  const closeLabel = params.locale === 'ka' ? 'დახურვა' : 'Close';

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

          <button
            type="button"
            onClick={handleInstallClick}
            className="btn-hero-secondary w-full sm:w-auto"
            data-text={params.locale === "ka" ? "დააინსტალირე Tasky" : "Install Tasky"}
          >
            <span className="btn-text">
              {params.locale === "ka" ? "დააინსტალირე Tasky" : "Install Tasky"}
            </span>
          </button>

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
            powered={powerOn} // სვიჩი ამარაგებს „ძალს“
            hoverAccel={false} // მაუსის მიტანა აღარ ასწრაფებს
          />

          <NeonPowerSwitch checked={powerOn} onChange={setPowerOn} />
        </div>
      </section>

      {/* FEATURES როგორც ბუტონები */}
      <section className="grid md:grid-cols-3 gap-4">
        {[
          { Icon: ShoppingBag, t: m.home.features[0] },
          { Icon: ShieldCheck, t: m.home.features[1] },
          { Icon: ClipboardList, t: m.home.features[2] }
        ].map(({ Icon, t }: any, i: number) => {
          const clickHandler =
            i === 0
              ? () => {
                  playNav();
                  router.push(`/${params.locale}/tasky`);
                }
              : i === 1
              ? () => {
                  playNav();
                  setInfoOpen('payments');
                }
              : () => {
                  playNav();
                  setInfoOpen('clarity');
                };

          return (
            <button
              key={i}
              type="button"
              onClick={clickHandler}
              className="feature-btn text-left"
            >
              <div className="feature-icon mb-3 w-9 h-9 rounded-xl bg-cyan/25 flex items-center justify-center shadow-neon">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="feature-title font-semibold text-lg mb-1">{t.title}</h3>
              <p className="feature-body text-sm leading-relaxed">{t.body}</p>
            </button>
          );
        })}
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-8 mt-16 md:mt-24">
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

      {/* Task Modal */}
      <TaskModal open={open} taskId={taskId} onClose={handleClose} />

      {/* Info Modal (უსაფრთხო გადახდები / ცხადი მოთხოვნები) */}
      {infoOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center modal-overlay bg-black/70">
          <div className="tasky-modal max-w-md w-[90%] rounded-2xl bg-slate-950/95 border border-cyan-500/40 p-6 shadow-2xl">
            <h3 className="text-xl font-semibold mb-3">{infoTexts[infoOpen].title}</h3>
            {infoTexts[infoOpen].paragraphs.map((p, idx) => (
              <p key={idx} className="text-sm text-white/80 mb-2">
                {p}
              </p>
            ))}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoOpen(null)}
                className="px-4 py-2 text-sm font-medium border border-white/25 rounded-lg hover:bg_WHITE/10 transition"
              >
                {closeLabel}
              </button>
            </div>
          </div>
        </div>
      )}

{/* Install helper modal (iOS guide with images) */}
{showInstallHelp && (
  <div
    className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-3 py-6"
    onClick={() => setShowInstallHelp(false)}
    role="dialog"
    aria-modal="true"
  >
    <div
      className="w-[94vw] max-w-md rounded-2xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl
                 max-h-[85vh] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 shrink-0 border-b border-white/10">
        <h3 className="text-lg font-semibold">
          {params.locale === "ka" ? "Tasky-ის ინსტალაცია iPhone-ზე" : "Install Tasky on iPhone"}
        </h3>
        <p className="text-xs text-white/60 mt-1">
          {params.locale === "ka"
            ? "Safari-დან დაამატე ჰომსქრინზე — 3 ნაბიჯში."
            : "Add it from Safari to your Home Screen in 3 steps."}
        </p>
      </div>

      {/* Scrollable content */}
      <div
        className="px-5 py-4 flex-1 overflow-y-auto space-y-4 text-sm text-white/80 leading-relaxed"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Step 1 */}
        <div className="space-y-2">
          <div>
            {params.locale === "ka" ? (
              <>
                როგორც ჩანს <b>iOS</b> მომხმარებელი ხარ, ამიტომ სისტემა ავტომატურად ვერ აინსტალირებს აპს.
                Tasky-ის ინსტალაციისთვის დააჭირე ბრაუზერის ქვედა მხარეს, ცენტრში <b>Share</b> ღილაკს.
              </>
            ) : (
              <>
                It looks like you’re on <b>iOS</b>, so the system won’t install the app automatically.
                To install Tasky, tap the <b>Share</b> button at the bottom center of Safari.
              </>
            )}
          </div>

          <div className="rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
  src="/install/1.png"
  alt="Step 1 - Share"
  className="w-full h-auto max-h-[45vh] object-contain"
/>


          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <div>
            {params.locale === "ka" ? (
              <>შემდეგ ჩამოსქროლე და დააჭირე <b>Add to Home Screen</b>-ს.</>
            ) : (
              <>Then scroll down and tap <b>Add to Home Screen</b>.</>
            )}
          </div>

          <div className="rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
  src="/install/2.png"
  alt="Step 2 - Add to Home Screen"
  className="w-full h-auto max-h-[45vh] object-contain"
/>

          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-2">
          <div>
            {params.locale === "ka" ? (
              <>
                ბოლოს დააჭირე <b>Add</b>-ს.
                <br />
                Tasky უკვე შენს მობილურშია — წარმატებები!
              </>
            ) : (
              <>
                Finally, tap <b>Add</b>.
                <br />
                Tasky is now on your phone — enjoy!
              </>
            )}
          </div>

          <div className="rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
  src="/install/3.png"
  alt="Step 3 - Add"
  className="w-full h-auto max-h-[45vh] object-contain"
/>

          </div>
        </div>

        {/* tiny bottom spacer so last image isn't hidden behind footer while scrolling */}
        <div className="h-2" />
      </div>

      {/* Footer */}
      <div className="px-5 py-4 shrink-0 border-t border-white/10 bg-slate-950/95">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowInstallHelp(false)}
            className="btn-hero-secondary text-sm"
            data-text={params.locale === "ka" ? "გასაგებია" : "Got it"}
          >
            <span className="btn-text">{params.locale === "ka" ? "გასაგებია" : "Got it"}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
)}



      {/* Modal grow animation + feature button სტილები */}
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
            animation: none !IMPORTANT;
          }
        }

        /* From Uiverse.io სტილის ადაპტაცია feature ბარათებისთვის */
        .feature-btn {
          font-size: 1.05rem;
          padding: 1.4rem 1.6rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          outline: none;
          border-radius: 0.9rem;
          cursor: pointer;
          /* default – პრაქტიკულად გამჭვირვალე */
          background-color: rgba(15, 23, 42, 0.12);
          color: rgb(234, 234, 234);
          font-weight: 500;
          transition: 0.6s;
          box-shadow: 0px 0px 60px #1f4c65;
          -webkit-box-reflect: below 10px
            linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.4));
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          gap: 0.35rem;
          text-align: left;
          background-image: radial-gradient(
            circle at top left,
            rgba(56, 189, 248, 0.16),
            transparent
          );
        }

        .feature-btn:active {
          scale: 0.92;
        }

        .feature-btn:hover {
          background: linear-gradient(
            270deg,
            rgba(2, 29, 78, 0.45) 0%,
            rgba(31, 215, 232, 0.65) 60%
          );
          color: rgb(4, 4, 38);
        }

        .feature-icon {
          color: #22d3ee; /* ნორმალურ მდგომარეობაში ცისფერი აიკონი */
          transition: color 0.3s ease;
        }

        .feature-title,
        .feature-body {
          transition: color 0.3s ease;
        }

        /* ჰოუვერზე – ყველაფერს ვაშავებთ: აიკონს, სათაურს, ტექსტს */
        .feature-btn:hover .feature-icon,
        .feature-btn:hover .feature-title,
        .feature-btn:hover .feature-body {
          color: rgb(4, 4, 38);
        }

        /* პატარა ეკრანზე ... – ანარეკლი ითიშება */
        @media (max-width: 767px) {
          .feature-btn {
            -webkit-box-reflect: initial !important; /* ანარეკლის სრულად გამორთვა */
            box-shadow: 0px 0px 30px #1f4c65;
          }
        }
      `}</style>
    </div>
  );
}
