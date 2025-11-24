'use client';
import React, { CSSProperties, useEffect, useRef, useState } from 'react';

type HoloLogoProps = {
  src?: string;
  size?: number;
  spin?: boolean;
  spinSpeedSec?: number;
  maxMulHover?: number;
  accelPerSec?: number;
  decelPerSec?: number;
  onExplode?: () => void;   // გამოიძახება, როცა ნაწილაკები უკვე შეკრებილნი არიან ცენტრში
  resetOn?: number;
  fadeDelayMs?: number;     // ფეიდის დაყოვნება onExplode-ის შემდეგ (ნაგულისხმები 0)
  powered?: boolean;      // true => აჩქარება
  hoverAccel?: boolean;   // hover-ზე აჩქარების ჩართვა/გამორთვა

};

export default function TaskyLogoDraw({
  src = '/logo.svg',
  size = 280,
  spin = true,
  spinSpeedSec = 8,
  maxMulHover = 40,
  accelPerSec = 7,
  decelPerSec = 4,
  onExplode,
  resetOn = 0,
  fadeDelayMs = 0,
  powered,
  hoverAccel = true,
}: HoloLogoProps) {
  const style = { ['--size' as any]: `${size}px` } as CSSProperties;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef  = useRef<HTMLImageElement | null>(null);

  // ✅ cache-bust, რომ SVG *ყოველჯერ* თავიდან დაიხატოს
  const [srcBust, setSrcBust] = useState('');
  useEffect(() => {
    const makeBust = () => {
      const q = `${src.includes('?') ? '&' : '?'}t=${Date.now()}`;
      setSrcBust(`${src}${q}`);
    };
    makeBust();

    // BFCache-დან დაბრუნებისასაც განვაახლოთ (100% გარანტიად)
    const onPageShow = (e: PageTransitionEvent) => { if ((e as any).persisted) makeBust(); };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [src]);

  // body-ზე მიმაგრებული fullscreen canvas
  const bodyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef        = useRef<CanvasRenderingContext2D | null>(null);

  const rafId   = useRef<number | null>(null);
  const partRaf = useRef<number | null>(null);

  const [hovered, setHovered] = useState(false);
  const hoverRef = useRef(false);
  useEffect(() => { hoverRef.current = hovered; }, [hovered]);

  // Rotation
  const angleRef = useRef(0);
  const mulRef   = useRef(1);

  // Explosion state
  const [exploded, setExploded] = useState(false);
  const explodedRef = useRef(false);
  const dwellRef = useRef(0);

  type P = { x:number; y:number; vx:number; vy:number; r:number; color:string };
  const particlesRef = useRef<P[]>([]);

  // Phases
  const phaseRef  = useRef<'idle'|'out'|'in'>('idle');
  const phaseTRef = useRef(0);
  const inTimeRef = useRef(0); // IN-ფაზაში გატარებული დრო

  // ასამბლის ტრიგერი
  const assembledSignaledRef = useRef(false);
  const ASSEMBLE_RATIO = 0.85;     // 85% ცენტრში
  const ASSEMBLE_TIMEOUT = 0.9;    // IN-ფაზაში 0.9ს ფეილსეიფი

  // Fade-out
  const fadingRef = useRef(false);
  const fadeTRef  = useRef(0);
  const FADE_DUR  = 0.35;
  const fadeTimerRef = useRef<number | null>(null);

  // 🔒 BUGFIX: უსაფრთხო rAF ლუპის “ცოცხალი” ფლაგი (რესტარტზე/რაუტ-ჩეინჯზე გაჩერება)
  const aliveRef = useRef(false);

  const palette = ['#0CDFFA', '#05F2FA', '#705EF9', '#6843D1', '#a3f2ff'];

  // sound
  const boomRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    try { const a = new Audio('/sfx/logo-explosion.mp3'); a.preload='auto'; a.volume=0.7; a.load(); boomRef.current = a; } catch {}
  }, []);

  /* ---------------- Rotation loop (არ შევცვალე) ---------------- */
  useEffect(() => {
    if (!spin) return;
// ადრე გეწყებოდა .matches undefined-ზე
const reduce =
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;


    const el = imgRef.current;
    if (!el) return;

    let last = performance.now();
    const baseDegPerSec = 360 / spinSpeedSec;
    const eps = Math.max(0.02 * maxMulHover, 0.25);
    const DWELL_SEC = 1;

    const tick = () => {
      const now = performance.now();
      const dt  = Math.min((now - last) / 1000, 0.033);
      last = now;

        if (!explodedRef.current) {
        // effective „ON“ მდგომარეობა: ან hover (თუ ჩართულია), ან სვიჩიდან მიღებული powered
        const isOn = (hoverAccel && hoverRef.current) || !!powered;

        if (isOn) {
          mulRef.current = Math.min(maxMulHover, mulRef.current + accelPerSec * dt);
        } else {
          mulRef.current = Math.max(1, mulRef.current - decelPerSec * dt);
        }
        if (mulRef.current >= (maxMulHover - eps)) {
          dwellRef.current += dt;
          if (dwellRef.current >= DWELL_SEC && !explodedRef.current) {
            explodedRef.current = true;
            try { const boom = boomRef.current; if (boom) { boom.currentTime = 0; void boom.play(); } } catch {}
            setExploded(true);
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          }
        } else dwellRef.current = 0;

        angleRef.current += baseDegPerSec * mulRef.current * dt;
        if (angleRef.current > 360) angleRef.current -= 360 * Math.floor(angleRef.current / 360);
        el.style.transform = `rotateY(${angleRef.current}deg)`;
      }

      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); rafId.current = null; };
  }, [spin, spinSpeedSec, maxMulHover, accelPerSec, decelPerSec, powered, hoverAccel]);

  /* ---------------- Canvas helpers ---------------- */
  function ensureBodyCanvas() {
    // ძველი რომ არ დარჩეს (HMR/Reload)
    const old = document.getElementById('tasky-fx-canvas') as HTMLCanvasElement | null;
    if (old && old.parentNode) old.parentNode.removeChild(old);

    const cvs = document.createElement('canvas');
    cvs.id = 'tasky-fx-canvas';
    Object.assign(cvs.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '2147483646',
      background: 'transparent',
      willChange: 'opacity, transform',
    } as CSSStyleDeclaration);
    document.body.appendChild(cvs);
    bodyCanvasRef.current = cvs;
    const ctx = cvs.getContext('2d', { alpha: true });
    if (ctx) {
      ctxRef.current = ctx;
      fitCanvas();
    }
  }

  function effDpr() {
    const d = (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    return Math.min(d, 1.5);
  }

  function fitCanvas() {
    const cvs = bodyCanvasRef.current, ctx = ctxRef.current;
    if (!cvs || !ctx) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const dpr = effDpr();
    cvs.width  = Math.max(1, Math.floor(vw * dpr));
    cvs.height = Math.max(1, Math.floor(vh * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------- Explosion ---------------- */
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  function startExplosion() {
    const wrap = wrapRef.current, img = imgRef.current;
    if (!wrap || !img) return;

    ensureBodyCanvas();
    const cvs = bodyCanvasRef.current!, ctx = ctxRef.current!;
    fitCanvas();

    // 🔒 ჩავრთოთ rAF “ცოცხალი” ფლაგი
    aliveRef.current = true;

    const vw = window.innerWidth, vh = window.innerHeight;
    const viewCx = vw / 2, viewCy = vh / 2; // შეკრების წერტილი (მოდალის ცენტრი)

    // ლოგოს ცენტრი — საწყისი
    const r = wrap.getBoundingClientRect();
    const logoCx = r.left + r.width  / 2;
    const logoCy = r.top  + r.height / 2;

    const diag = Math.hypot(vw, vh);

    // ------- PERF & SMOOTH PARAMS -------
    const SPEED_MIN = diag * 0.85;
    const SPEED_MAX = diag * 1.55;
    const DRAG      = 0.945;
    const GLOW      = Math.min(11, Math.max(7, Math.round(diag / 170)));
    const TRAIL_FADE = 0.13;
    const dpr = effDpr();
    const COUNT = Math.min(240, Math.max(120, Math.floor((vw * vh) / 5600 / dpr)));

    // „ქარი“ ცენტრის საპირისპიროდ — სიმეტრიისთვის
    const dxC = viewCx - logoCx, dyC = viewCy - logoCy;
    const lenC = Math.hypot(dxC, dyC) || 1;
    const windX = -(dxC / lenC), windY = -(dyC / lenC);
    const WIND  = diag * 1.2;

    // ნაწილაკები
    const list: P[] = new Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
      list[i] = {
        x: logoCx, y: logoCy,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: 1.6 + Math.random() * 2.5,
        color: palette[(Math.random() * palette.length) | 0],
      };
    }
    particlesRef.current = list;

    // ფაზები
    phaseRef.current = 'out';
    phaseTRef.current = 0;
    inTimeRef.current = 0;
    assembledSignaledRef.current = false;
    fadingRef.current = false;
    fadeTRef.current  = 0;
    if (fadeTimerRef.current) { clearTimeout(fadeTimerRef.current); fadeTimerRef.current = null; }

    // Fixed-step physics (60Hz)
    const PHYS_DT = 1 / 60;
    let accumulator = 0;

    let radialOut   = diag * 4.2;
    const outDecay  = 0.90;
    const radialDecayPerStep = Math.pow(outDecay, PHYS_DT * 60);
    const EDGE_TARGET = Math.max(vw, vh) * 0.47;
    const ATTRACT   = diag * 7.0;
    const ARRIVE_R  = Math.max(20, Math.min(vw, vh) * 0.08);

    let last = performance.now();
    ctx.clearRect(0, 0, vw, vh);

    const step = () => {
      // 🔒 თუ იუნმაუნთი/რესტარტი მოხდა—ჩუმად გავჩერდეთ (white screen fix)
      if (!aliveRef.current || !ctxRef.current || !bodyCanvasRef.current) return;

      try {
        const now = performance.now();
        let frameDt  = (now - last) / 1000;
        last = now;
        frameDt = Math.min(frameDt, 0.06);
        accumulator += frameDt;

        while (accumulator >= PHYS_DT) {
          phaseTRef.current += PHYS_DT;
          if (phaseRef.current === 'in') inTimeRef.current += PHYS_DT;

          const dragPow = Math.pow(DRAG, PHYS_DT * 60);

          for (const p of particlesRef.current) {
            if (phaseRef.current === 'out') {
              const dx = p.x - logoCx, dy = p.y - logoCy;
              const len = Math.hypot(dx, dy) || 1; const nx = dx/len, ny = dy/len;
              p.vx += nx * radialOut * PHYS_DT + windX * WIND * PHYS_DT;
              p.vy += ny * radialOut * PHYS_DT + windY * WIND * PHYS_DT;
            } else {
              const dx = p.x - viewCx, dy = p.y - viewCy;
              const len = Math.hypot(dx, dy) || 1; const nx = dx/len, ny = dy/len;
              p.vx -= nx * ATTRACT * PHYS_DT;
              p.vy -= ny * ATTRACT * PHYS_DT;
            }
            p.vx *= dragPow;
            p.vy *= dragPow;
            p.x += p.vx * PHYS_DT;
            p.y += p.vy * PHYS_DT;
          }

          if (phaseRef.current === 'out') radialOut *= radialDecayPerStep;

          accumulator -= PHYS_DT;
        }

        if (fadingRef.current) {
          fadeTRef.current += frameDt;
          if (fadeTRef.current >= FADE_DUR) {
            aliveRef.current = false;
            setExploded(false);
            cleanupCanvas();
            return;
          }
        }
        const masterAlpha = fadingRef.current ? Math.max(0, 1 - (fadeTRef.current / FADE_DUR)) : 1;

        // trail
        const eraseAlpha = Math.min(1, TRAIL_FADE + (1 - masterAlpha) * 0.8);
        const ctx = ctxRef.current!;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = eraseAlpha;
        ctx.fillRect(0, 0, vw, vh);

        // draw
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = masterAlpha;
        ctx.shadowBlur  = GLOW;

        let alive = false;
        let arrived = 0;

        for (const p of particlesRef.current) {
          if (phaseRef.current === 'in' && Math.hypot(p.x - viewCx, p.y - viewCy) < ARRIVE_R) {
            arrived++; continue;
          }
          alive = true;
          ctx.shadowColor = p.color;
          ctx.fillStyle   = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }

        if (phaseRef.current === 'out') {
          let sumR = 0;
          for (const p of particlesRef.current) sumR += Math.hypot(p.x - logoCx, p.y - logoCy);
          const avgR = sumR / particlesRef.current.length;
          if (avgR >= EDGE_TARGET) {
            phaseRef.current = 'in';
            inTimeRef.current = 0;
          }
        }

        if (phaseRef.current === 'in' && !assembledSignaledRef.current) {
          const ratio = arrived / particlesRef.current.length;
          if (ratio >= ASSEMBLE_RATIO || inTimeRef.current >= ASSEMBLE_TIMEOUT) {
            assembledSignaledRef.current = true;
            onExplode?.();
            fadeTimerRef.current = window.setTimeout(() => {
              fadingRef.current = true; fadeTRef.current = 0;
            }, Math.max(0, fadeDelayMs || 0));
          }
        }

        if (phaseRef.current === 'in' && assembledSignaledRef.current && (!alive || arrived >= particlesRef.current.length)) {
          aliveRef.current = false;
          setExploded(false);
          cleanupCanvas();
          return;
        }

        partRaf.current = requestAnimationFrame(step);
      } catch {
        // რაიმე ერში—ჩუმი გაწმენდა (Next dev overlay/თეთრი ეკრანი აღარ)
        aliveRef.current = false;
        cleanupCanvas();
      }
    };

    partRaf.current = requestAnimationFrame(step);

    const onResize = () => fitCanvas();
    window.addEventListener('resize', onResize, { passive: true });
    resizeHandlerRef.current = () => window.removeEventListener('resize', onResize);
  }

  function cleanupCanvas() {
    // 🔒 ყველა ლუპის უსაფრთხო გაჩერება
    aliveRef.current = false;

    if (partRaf.current) cancelAnimationFrame(partRaf.current);
    partRaf.current = null;

    // rotation rAF არ ვხურავთ აქ, მხოლოდ აფეთქებისას გაჩაღებული rAF-ები
    // (თუმცა უნმაუნთზე ქვემოთ rafId-ც იკანცელდება)

    particlesRef.current = [];
    phaseRef.current = 'idle';
    phaseTRef.current = 0;
    inTimeRef.current = 0;
    assembledSignaledRef.current = false;
    fadingRef.current = false;
    fadeTRef.current = 0;
    if (fadeTimerRef.current) { clearTimeout(fadeTimerRef.current); fadeTimerRef.current = null; }

    if (resizeHandlerRef.current) { resizeHandlerRef.current(); resizeHandlerRef.current = null; }

    const cvs = document.getElementById('tasky-fx-canvas');
    if (cvs && cvs.parentNode) cvs.parentNode.removeChild(cvs);
    bodyCanvasRef.current = null;
    ctxRef.current = null;
  }

  function stopExplosion() {
    cleanupCanvas();
    setExploded(false);
    explodedRef.current = false;
    dwellRef.current = 0;
  }

  // 1) აფეთქების გაშვება/გაჩერება state-ის მიხედვით
  useEffect(() => {
    if (exploded) {
      startExplosion();
    } else {
      cleanupCanvas();
    }
  }, [exploded]);
useEffect(() => {
  const onErr = () => cleanupCanvas();
  window.addEventListener('error', onErr);
  window.addEventListener('unhandledrejection', onErr);
  return () => {
    window.removeEventListener('error', onErr);
    window.removeEventListener('unhandledrejection', onErr);
  };
}, []);

  // 2) გარედან reset — ლოგოს აღდგენა + სრული ტეარდაუნი
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';

    cleanupCanvas();
    explodedRef.current = false;
    dwellRef.current = 0;
    mulRef.current = Math.max(1, Math.min(mulRef.current, 2));
  }, [resetOn]);

  // 3) უნმაუნთი / გვერდის დამალვა / რეფრეში — აფეთქების გაწმენდა (როტაციას არ ეხება)
  useEffect(() => {
    const onPageHide = () => cleanupCanvas();
    const onBeforeUnload = () => cleanupCanvas();
    const onVis = () => { if (document.visibilityState !== 'visible') cleanupCanvas(); };

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVis);
      // უნმაუნთისას დავხუროთ აფეთქება და როტაციის rAF-იც
      cleanupCanvas();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="holo-wrap"
      style={style}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* ✅ ისევ <img> + cache-bust */}
      <img ref={imgRef} className="holo-img" src={srcBust} alt="Tasky logo" decoding="async" loading="eager" />
      <style jsx>{`
        .holo-wrap {
          width: var(--size);
          height: var(--size);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          perspective: 900px;
          position: relative;
          overflow: visible;
        }
        .holo-img {
          width: 100%; height: 100%;
          display: block;
          transform-style: preserve-3d;
          backface-visibility: visible;
          -webkit-backface-visibility: visible;
          will-change: transform, opacity;
          transition: opacity .25s ease;
          filter:
            drop-shadow(0 0 10px rgba(0,229,255,.24))
            drop-shadow(0 0 22px rgba(255,28,247,.16));
        }
        @media (prefers-reduced-motion: reduce) {
          .holo-img { transform: none !important; }
        }
      `}</style>
    </div>
  );
}
