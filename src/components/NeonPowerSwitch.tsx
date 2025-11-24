'use client';

import React, { useId, useState } from 'react';

type NeonPowerSwitchProps = {
  label?: string;
  className?: string;
  checked?: boolean;                 // გარე კონტროლი (არ არის სავალდებულო)
  onChange?: (value: boolean) => void;
};

export default function NeonPowerSwitch({
  label = 'Power',
  className = '',
  checked,
  onChange,
}: NeonPowerSwitchProps) {
  const [innerChecked, setInnerChecked] = useState(false);
  const id = useId();

  const isControlled = checked !== undefined;
  const value = isControlled ? checked : innerChecked;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    if (!isControlled) {
      setInnerChecked(next);
    }
    onChange?.(next);
  };

  return (
    <label className={`power-switch ${className}`}>
      <input
        id={id}
        className="power-switch__input"
        type="checkbox"
        role="switch"
        checked={value}          // <-- მარტო ეს
        onChange={handleChange}  // <-- და ეს
        aria-label={label}
      />

      <span className="power-switch__base-outer" />
      <span className="power-switch__base-inner" />

      <svg
        className="power-switch__base-neon"
        viewBox="0 0 40 24"
        width="40"
        height="24"
        aria-hidden="true"
      >
        <defs>
          <filter id="power-switch-glow">
            <feGaussianBlur result="coloredBlur" stdDeviation="1" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="power-switch-gradient1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--on-hue1),90%,70%)" />
            <stop offset="100%" stopColor="hsl(var(--on-hue2),90%,70%)" />
          </linearGradient>
          <linearGradient id="power-switch-gradient2" x1="0.7" y1="0" x2="0.3" y2="1">
            <stop offset="25%" stopColor="hsla(var(--on-hue1),90%,70%,0)" />
            <stop offset="50%" stopColor="hsla(var(--on-hue1),90%,70%,0.3)" />
            <stop offset="100%" stopColor="hsla(var(--on-hue2),90%,70%,0.3)" />
          </linearGradient>
        </defs>
        <path
          fill="none"
          filter="url(#power-switch-glow)"
          stroke="url(#power-switch-gradient1)"
          strokeWidth="1"
          strokeDasharray="0 104.26 0"
          strokeDashoffset="0.01"
          strokeLinecap="round"
          d="M.5,12C.5,5.649,5.649.5,12,.5h16c6.351,0,11.5,5.149,11.5,11.5s-5.149,11.5-11.5,11.5H12C5.649,23.5.5,18.351.5,12Z"
        />
      </svg>

      <span className="power-switch__knob-shadow" />

      <span className="power-switch__knob-container">
        <span className="power-switch__knob">
          <svg
            className="power-switch__knob-neონ"
            viewBox="0 0 48 48"
            width="48"
            height="48"
            aria-hidden="true"
          >
            <circle
              fill="none"
              stroke="url(#power-switch-gradient2)"
              strokeDasharray="0 90.32 0 54.19"
              strokeLinecap="round"
              strokeWidth="1"
              r="23"
              cx="24"
              cy="24"
              transform="rotate(-112.5,24,24)"
            />
          </svg>
        </span>
      </span>

      <span className="power-switch__led" />
      <span className="power-switch__text">{label}</span>
    </label>
  );
}
