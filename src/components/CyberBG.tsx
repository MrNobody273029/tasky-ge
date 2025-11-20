'use client';

import { useEffect, useRef } from 'react';

/**
 * CyberBG — ნეონ-გრიდი + მსუბუქი პიქსელების ანიმაცია
 * - სწორი cleanup (resize/rAF/visibility)
 * - DPR scaling სწორი clearRect-ით
 * - pointer-events:none + zIndex:-1, რომ არასდროს ფაროს კონტენტი
 */
export default function CyberBG() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let disposed = false;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReduced = media.matches;

    // dpr
    const getDpr = () => Math.min(window.devicePixelRatio || 1, 1.8);
    let dpr = getDpr();

    // ---- resize (დებაუნსით) ----
    let resizeScheduled = false;
    const doResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      // coordinate space -> CSS პიქსელებში
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onResize = () => {
      if (resizeScheduled) return;
      resizeScheduled = true;
      requestAnimationFrame(() => {
        dpr = getDpr();
        doResize();
        makeParts(); // რაოდენობა მოერგოს ახალ ზომას
        resizeScheduled = false;
      });
    };

    type P = { x: number; y: number; vx: number; vy: number; s: number; a: number; hue: number; t: number };
    let parts: P[] = [];

    const spawn = (): P => {
      const w = window.innerWidth, h = window.innerHeight;
      const speed = 0.15 + Math.random() * 0.45;
      const hues = [182, 270, 47]; // cyan, violet, yellow
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        s: 1 + Math.random() * 1.5,
        a: 0.35 + Math.random() * 0.4,
        hue: hues[(Math.random() * hues.length) | 0],
        t: Math.random() * Math.PI * 2,
      };
    };

    const makeParts = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const target = Math.min(110, Math.max(40, Math.floor((w * h) / 26000)));
      parts = Array.from({ length: target }, () => spawn());
    };

    const clearAll = () => {
      // როცა transform დგას dpr-ზე, სწორი clear არის width/height reset ან transform-ის დროებითი აღდგენა:
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const tick = () => {
      if (!running || disposed) return;

      try {
        clearAll();

        const w = window.innerWidth, h = window.innerHeight;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.t += 0.02;
          p.x += p.vx + Math.sin(p.t) * 0.05;
          p.y += p.vy + Math.cos(p.t * 0.9) * 0.05;

          // კიდეებზე „გადახვევა“
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          if (p.y > h + 10) p.y = -10;

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.shadowBlur = 12;
          const col = `hsla(${p.hue} 100% 60% / ${p.a})`;
          ctx.shadowColor = col;
          ctx.fillStyle = col;
          ctx.fillRect(p.x, p.y, p.s, p.s);
          ctx.restore();
        }
      } catch (e) {
        // რომ არ ჩააშავოს მთელი აპი უცნაურ ერორზე
        // eslint-disable-next-line no-console
        console.error('CyberBG tick error:', e);
        running = false;
      }

      raf = requestAnimationFrame(tick);
    };

    const onVis = () => {
      const visible = document.visibilityState !== 'hidden';
      running = visible && !prefersReduced && !disposed;
      if (running) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    // --- init ---
    doResize();
    makeParts();
    if (!prefersReduced) raf = requestAnimationFrame(tick);

    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVis);

    // cleanup
    return () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: -1 }}>
      {/* 1) ნეონ-გრადიენტების ვიგნეტი */}
      <div className="absolute inset-0 cyberbg_vignette" />
      {/* 2) მოძრავი გრიდი */}
      <div className="absolute inset-0 cyberbg_grid" />
      {/* 3) მსუბუქი ნეონ-პარტიკლები */}
      <canvas ref={canvasRef} className="absolute inset-0" />
      <style jsx global>{`
        .cyberbg_vignette {
          background:
            radial-gradient(900px 600px at 15% 20%, rgba(0,255,255,0.20), transparent 60%),
            radial-gradient(700px 500px at 85% 70%, rgba(124,58,237,0.18), transparent 55%),
            radial-gradient(500px 400px at 50% 10%, rgba(245,158,11,0.14), transparent 60%),
            radial-gradient(1200px 800px at 50% 50%, rgba(0,0,0,0.4), rgba(0,0,0,0.6));
          filter: saturate(1.05);
        }
        .cyberbg_grid {
          background-image:
            linear-gradient(transparent 95%, rgba(255,255,255,0.07) 96%),
            linear-gradient(90deg, transparent 95%, rgba(255,255,255,0.07) 96%);
          background-size: 36px 36px, 36px 36px;
          mask-image: radial-gradient(1200px 800px at 50% 50%, black 60%, transparent 100%);
          animation: cyberbg_pan 22s linear infinite;
          box-shadow: inset 0 0 120px rgba(0, 255, 255, 0.06);
        }
        @keyframes cyberbg_pan {
          0%   { background-position: 0px 0px, 0px 0px; }
          100% { background-position: 36px 36px, 36px 36px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cyberbg_grid { animation: none; }
        }
      `}</style>
    </div>
  );
}
