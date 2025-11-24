// app/loading.tsx
"use client";

import React, { useEffect, useRef } from "react";

export default function Loading() {
  const matrixRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const matrixEl = matrixRef.current;
    if (!matrixEl) return;

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
    const columns: HTMLDivElement[] = [];

    // შევქმნათ "წვიმის" სვეტები
    for (let i = 0; i < 50; i++) {
      const column = document.createElement("div");
      column.className = "matrix-column";
      column.style.left = `${i * 20}px`;
      column.style.animationDuration = `${Math.random() * 2 + 1}s`;

      let content = "";
      for (let j = 0; j < 50; j++) {
        content +=
          characters[Math.floor(Math.random() * characters.length)] + "\n";
      }
      column.innerText = content;
      matrixEl.appendChild(column);
      columns.push(column);
    }

    // progress ტექსტის წერტილები
    let dotIndex = 0;
    const dots = ["", ".", "..", "..."];
    const interval = setInterval(() => {
      if (!progressRef.current) return;
      progressRef.current.textContent =
        "QUANTUM CORE INITIALIZATION" + dots[dotIndex];
      dotIndex = (dotIndex + 1) % dots.length;
    }, 500);

    // cleanup
    return () => {
      clearInterval(interval);
      columns.forEach((c) => c.remove());
    };
  }, []);

  return (
    <div className="loader-screen">
      <div className="loader-container">
        {/* Matrix rain background */}
        <div className="matrix-bg" ref={matrixRef} />

        {/* Rotating hexagon container */}
        <div className="hexagon-container">
          <div className="hexagon"></div>
        </div>

        {/* Hologram effect */}
        <div className="hologram"></div>

        <div className="loader-wrapper">
          {/* Data streams */}
          <div
            className="data-stream"
            style={{ left: "-100px", animationDelay: "0s" }}
          />
          <div
            className="data-stream"
            style={{ left: "100px", animationDelay: "1s" }}
          />
          <div
            className="data-stream"
            style={{ right: "-100px", animationDelay: "0.5s" }}
          />

          {/* Status text */}
          <div className="status-text status-left">
            {"> INITIALIZING SYSTEMS"}
            <br />
            {"> SCANNING NETWORK"}
            <br />
            {"> ANALYZING DATA"}
            <br />
            {"> QUANTUM SYNC: ACTIVE"}
          </div>

          <div className="status-text status-right">
            STATUS: PROCESSING
            <br />
            BUFFER: 87%
            <br />
            UPLINK: STABLE
            <br />
            SECURITY: ENCRYPTED
          </div>

          {/* Scanner */}
          <div className="scanner" />

          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Outer ring */}
            <circle className="circle outer" cx="50" cy="50" r="45" />

            {/* Middle ring */}
            <circle className="circle middle" cx="50" cy="50" r="35" />

            {/* Inner ring */}
            <circle className="circle inner" cx="50" cy="50" r="25" />

            {/* Cross lines */}
            <path
              className="circle outer"
              d="M10,50 L90,50"
              style={{ opacity: 0.3 }}
            />
            <path
              className="circle outer"
              d="M50,10 L50,90"
              style={{ opacity: 0.3 }}
            />
          </svg>

          <div className="progress-text" ref={progressRef}>
            QUANTUM CORE INITIALIZATION...
          </div>
        </div>
      </div>
    </div>
  );
}
