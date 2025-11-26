'use client';

export default function CyberBG() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 cyberbg_vignette" />
      <div className="absolute inset-0 cyberbg_grid" />

      <style jsx global>{`
        .cyberbg_vignette {
          background:
            radial-gradient(
              900px 600px at 15% 20%,
              rgba(0, 255, 255, 0.2),
              transparent 60%
            ),
            radial-gradient(
              700px 500px at 85% 70%,
              rgba(124, 58, 237, 0.18),
              transparent 55%
            ),
            radial-gradient(
              500px 400px at 50% 10%,
              rgba(245, 158, 11, 0.14),
              transparent 60%
            ),
            radial-gradient(
              1200px 800px at 50% 50%,
              rgba(0, 0, 0, 0.4),
              rgba(0, 0, 0, 0.6)
            );
          filter: saturate(1.05);
        }

        .cyberbg_grid {
          background-image:
            linear-gradient(
              transparent 95%,
              rgba(255, 255, 255, 0.07) 96%
            ),
            linear-gradient(
              90deg,
              transparent 95%,
              rgba(255, 255, 255, 0.07) 96%
            );
          background-size: 36px 36px, 36px 36px;
          mask-image: radial-gradient(
            1200px 800px at 50% 50%,
            black 60%,
            transparent 100%
          );
          box-shadow: inset 0 0 120px rgba(0, 255, 255, 0.06);
        }
      `}</style>
    </div>
  );
}
