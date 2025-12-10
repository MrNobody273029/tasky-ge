'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type Option = {
  value: string;
  label: string;
};

type Props = {
  name: string;
  size?: 'sm' | 'md';
  initialValue?: string;
  placeholder: string;
  options: Option[];
};

export default function TaskyFilterSelect({
  name,
  size = 'md',
  initialValue = '',
  placeholder,
  options,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // outside-click close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  const handleSelect = (v: string) => {
    setValue(v);
    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={clsx(
        'tasky-neon-select relative inline-flex w-full',
        size === 'sm' && 'tasky-neon-select-sm'
      )}
      data-open={open ? 'true' : 'false'}
    >
      {/* რეალური value form-სთვის */}
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between"
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
      </button>

      {open && (
        <div
          className={clsx(
            // პოზიციონირება
            'absolute top-full mt-2 z-[60]',
            // მობილურზე: მთელ სიგანეზე, რომ არ გადახტეს ეკრანიდან
            'left-0 right-0',
            // დიდ ეკრანზე: ცენტრში პატარა ბოქსი
            'sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:transform',
            // ვიზუალი
            'rounded-2xl border border-white/15 bg-black/90 shadow-lg',
            'max-h-64 overflow-y-auto py-1',
            'w-full sm:w-[260px]'
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={clsx(
                'w-full text-left px-3 py-2 text-sm',
                'hover:bg-white/10',
                value === opt.value
                  ? 'text-cyan-300'
                  : 'text-white/80'
              )}
            >
              {opt.label}
            </button>
          ))}

          {/* clear option */}
          <button
            type="button"
            onClick={() => handleSelect('')}
            className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/5"
          >
            ✕ {placeholder}
          </button>
        </div>
      )}
    </div>
  );
}
