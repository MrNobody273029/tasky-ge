"use client";

import { useEffect, useState } from "react";

export default function FullScreenLoader() {
  const [visible, setVisible] = useState(true);

  // ვადგინებთ არის თუ არა PWA standalone რეჟიმში
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true);

  useEffect(() => {
    if (!isStandalone) {
      setVisible(false);
      return;
    }

    // 1.5 წამი და ქრება
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [isStandalone]);

  if (!visible) return null;

  return (
    <div className="full-loader-bg">
      <div className="full-loader-content">
        <img src="/full-load.png" className="full-loader-logo" />
        <div className="full-loader-text">Tasky</div>
      </div>
    </div>
  );
}
