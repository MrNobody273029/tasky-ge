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
  onExplode?: () => void;
  resetOn?: number;
  fadeDelayMs?: number; // ახლა აღარ გვჭირდება delay, მაგრამ ვტოვებთ prop-ს თავსებადობისთვის
  powered?: boolean;
  hoverAccel?: boolean;
  spinDelayMs?: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number; // 0..1
  color: string;
};

export default function TaskyLogoDraw({
  src = '/logo2.svg',
  size = 520, // ცოტა გაზრდილი
  spin = true,
  spinSpeedSec = 8,
  maxMulHover = 100,
  accelPerSec = 300,  // აჩქარებული
  decelPerSec = 4,
  onExplode,
  resetOn = 0,
  fadeDelayMs = 0,   // ვაიგნორებთ პრაქტიკულად
  powered,
  hoverAccel = true,
  spinDelayMs = 3000,
}: HoloLogoProps) {
  const style: CSSProperties = {
    width: `min(70vw, ${size}px)`,
    height: `min(70vw, ${size}px)`,
  };

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // cache-bust რომ SVG ყოველთვის თავიდან ჩაიტვირთოს (ანიმაცია თავიდან წავიდეს)
  const [srcBust, setSrcBust] = useState('');
  useEffect(() => {
    const makeBust = () => {
      const q = `${src.includes('?') ? '&' : '?'}t=${Date.now()}`;
      setSrcBust(`${src}${q}`);
    };
    makeBust();
    const onPageShow = (e: Event) => {
      const anyE = e as any;
      if (anyE.persisted) makeBust();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [src]);

  // rotation-ის raf
  const rafId = useRef<number | null>(null);

  // პატარა ლოკალური ნაპერწკლები – ლოგოს თავზე
  const sparksCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRafRef = useRef<number | null>(null);
  const sparksAliveRef = useRef(false);

  const [hovered, setHovered] = useState(false);
  const hoverRef = useRef(false);
  const [spinReady, setSpinReady] = useState(false);

  useEffect(() => {
    hoverRef.current = hovered;
  }, [hovered]);

  // spinReady – მხოლოდ mount-ზე / srcBust შეცვლაზე, resetOn-ზე აღარ ვაჭედებთ თავიდან delay-ს
  useEffect(() => {
    if (!spin) return;
    setSpinReady(false);
    const id = window.setTimeout(() => setSpinReady(true), spinDelayMs);
    return () => window.clearTimeout(id);
  }, [spin, spinDelayMs, srcBust]);

  const angleRef = useRef(0);
  const mulRef = useRef(1);

  const [exploded, setExploded] = useState(false);
  const explodedRef = useRef(false);
  const dwellRef = useRef(0);

  // sound
  const boomRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    try {
      const a = new Audio('/sfx/logo-explosion.mp3');
      a.preload = 'auto';
      a.volume = 0.7;
      a.load();
      boomRef.current = a;
    } catch {
      /* ignore */
    }
  }, []);

  /* -------- Rotation loop (ვატრიალებთ wrap-ს) -------- */
  useEffect(() => {
    if (!spin || !spinReady) return;

    const el = wrapRef.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      'matchMedia' in window &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      el.style.transform = 'none';
      return;
    }

    let last = performance.now();
    const baseDegPerSec = 360 / spinSpeedSec;
    const EXPLODE_AFTER = 5.0;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      if (!explodedRef.current) {
        const isOn = (hoverAccel && hoverRef.current) || !!powered;

        if (isOn) {
          // ვაჩქარებთ
          mulRef.current = Math.min(maxMulHover, mulRef.current + accelPerSec * dt);

          // დროის დათვლა რამდენ ხანს არის ჩართული
          dwellRef.current += dt;

          // 2 წამზე (EXPLODE_AFTER) მივალთ აფეთქებამდე
          if (dwellRef.current >= EXPLODE_AFTER && !explodedRef.current) {
            explodedRef.current = true;

            try {
              const boom = boomRef.current;
              if (boom) {
                boom.currentTime = 0;
                void boom.play();
              }
            } catch {
              /* ignore */
            }

            // ნაპერწკლები და მოდალი – ეგრევე
            setExploded(true);
            onExplode?.();

            const img = imgRef.current;
            if (img) {
              img.style.opacity = '0';
              img.style.pointerEvents = 'none';
            }
          }
        } else {
          // თუ სვიჩი გამოირთო / hover აღარ არის – მოვახმოთ უკან
          mulRef.current = Math.max(1, mulRef.current - decelPerSec * dt);
          dwellRef.current = 0;
        }

        angleRef.current += baseDegPerSec * mulRef.current * dt;
        if (angleRef.current > 360) {
          angleRef.current -= 360 * Math.floor(angleRef.current / 360);
        }
        el.style.transform = `rotateY(${angleRef.current}deg)`;
      }


      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
    };
  }, [
    spin,
    spinReady,
    spinSpeedSec,
    maxMulHover,
    accelPerSec,
    decelPerSec,
    powered,
    hoverAccel,
    onExplode, // dependency, რადგან ზემოთ გამოვიყენეთ
  ]);

  /* -------- მარტივი ლოკალური ნაპერწკლები -------- */

  const sparksRef = useRef<Spark[]>([]);
  const palette = ['#0CDFFA', '#05F2FA', '#705EF9', '#6843D1', '#a3f2ff'];

  const effDpr = () => {
    const d = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return Math.min(d, 1.5);
  };

  function stopSparks() {
    sparksAliveRef.current = false;
    if (sparksRafRef.current) cancelAnimationFrame(sparksRafRef.current);
    sparksRafRef.current = null;

    const cvs = sparksCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const dpr = effDpr();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    sparksRef.current = [];
  }

  function startSparks() {
    const wrap = wrapRef.current;
    const cvs = sparksCanvasRef.current;
    if (!wrap || !cvs) return;

    const rect = wrap.getBoundingClientRect();
    const dpr = effDpr();
    cvs.width = rect.width * dpr;
    cvs.height = rect.height * dpr;

    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const COUNT = 9; // 7–10 ძალიან პატარა ნაპერწკალი
    const baseSpeed = rect.width * 2;

    const sparks: Spark[] = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = baseSpeed * (0.4 + Math.random() * 0.6);
      sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2 + Math.random() * 1.5,
        life: 1,
        color: palette[(Math.random() * palette.length) | 0],
      });
    }

    sparksRef.current = sparks;
    sparksAliveRef.current = true;

    let last = performance.now();
    const GRAVITY = rect.height * 1.4;
    const FRICTION = 0.9;

    const step = () => {
      if (!sparksAliveRef.current) return;

      const now = performance.now();
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 0.05);

      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.globalCompositeOperation = 'lighter';

      let anyAlive = false;

      for (const s of sparksRef.current) {
        s.vy += GRAVITY * dt;
        s.vx *= FRICTION;
        s.vy *= FRICTION;

        s.x += s.vx * dt;
        s.y += s.vy * dt;

        s.life -= dt * 2; // სწრაფად ქრება
        if (s.life <= 0) continue;

        anyAlive = true;
        const alpha = Math.max(0, Math.min(1, s.life));
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.fillStyle = s.color;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!anyAlive) {
        stopSparks();
        return;
      }

      sparksRafRef.current = requestAnimationFrame(step);
    };

    sparksRafRef.current = requestAnimationFrame(step);
  }

  // reset გარედან – როცა parent ზრდის resetOn-ს (მაგ. მოდალის დახურვისას)
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    img.style.opacity = '1';
    img.style.pointerEvents = 'auto';

    stopSparks();
    explodedRef.current = false;
    setExploded(false); // ⚡️ state-იც დავაბრუნოთ, რომ შემდეგი აფეთქება ისევ იმუშაოს
    dwellRef.current = 0;
    // ცოტა მინიმუმზე დავუბრუნოთ სიჩქარე, მაგრამ არა 0-ზე
    mulRef.current = Math.max(1, Math.min(mulRef.current, 2));
  }, [resetOn]);

  // error / visibility cleanup
  useEffect(() => {
    const onErr = () => stopSparks();
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onErr);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onErr);
    };
  }, []);

  // უნმაუნთზე
  useEffect(() => {
    const onPageHide = () => stopSparks();
    const onBeforeUnload = () => stopSparks();
    const onVis = () => {
      if (document.visibilityState !== 'visible') stopSparks();
    };

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVis);
      stopSparks();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // explode watcher – პატარა ლოკალური ნაპერწკლები
  useEffect(() => {
    if (exploded) {
      startSparks();
    } else {
      stopSparks();
    }
  }, [exploded]);

  return (
    <div
      ref={wrapRef}
      className="holo-wrap"
      style={style}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <img
        ref={imgRef}
        className="holo-img"
        src={srcBust}
        alt="Tasky logo"
        decoding="async"
        loading="eager"
      />

      <canvas ref={sparksCanvasRef} className="holo-sparks" />

      <style jsx>{`
        .holo-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          perspective: 900px;
          position: relative;
          overflow: visible;
          max-width: none;
          max-height: none;
          flex-shrink: 0;
          will-change: transform;
        }

        .holo-img {
          width: 100%;
          height: 100%;
          display: block;
          transform-style: preserve-3d;
          backface-visibility: visible;
          -webkit-backface-visibility: visible;
          will-change: opacity;
          transition: opacity 0.25s ease;
          filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.24))
            drop-shadow(0 0 22px rgba(255, 28, 247, 0.16));
        }

        .holo-sparks {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .holo-wrap {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
