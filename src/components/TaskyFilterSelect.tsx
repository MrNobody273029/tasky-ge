"use client";

import * as React from "react";

type Option = {
  value: string;
  label: string;
};

type Props = {
  name: string;                 // input name (cat, skill, ...)
  options: Option[];
  initialValue?: string;        // searchParams-დან
  placeholder: string;          // "ყველა კატეგორია" და სხვ.
  size?: "sm" | "md";
  className?: string;
};

export default function TaskyFilterSelect({
  name,
  options,
  initialValue = "",
  placeholder,
  size = "md",
  className = "",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(initialValue);

  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  // გარეთ დაკლიკებაზე დახურვა
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  const sizeClass = size === "sm" ? "tasky-neon-select-sm" : "";

  return (
    <div
      ref={wrapperRef}
      className={`tasky-neon-dropdown ${open ? "is-open" : ""} ${className}`}
    >
      {/* trigger ღილაკი */}
      <div
        className={`tasky-neon-select ${sizeClass}`}
        data-open={open ? "true" : "false"}
      >
        <button
          type="button"
          className="w-full text-sm text-left px-3 py-1 bg-transparent border-0 outline-none"
          onClick={() => setOpen((prev) => !prev)} // იგივე ღილაკზე დაჭერით ტოგლი
        >
          {selected?.label || placeholder}
        </button>
      </div>

      {/* რომ form-ს მაინც გაეგოს მნიშვნელობა */}
      <input type="hidden" name={name} value={value} />

      {/* ჩვენი საკუთარი dropdown-პანელი */}
      <div className="tasky-neon-dropdown-menu">
        {/* "ყველა ..." ვარიანტი */}
        <button
          type="button"
          className="tasky-neon-dropdown-item"
          onClick={() => {
            setValue("");
            setOpen(false);
          }}
        >
          {placeholder}
        </button>

        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="tasky-neon-dropdown-item"
            onClick={() => {
              setValue(opt.value);
              setOpen(false);
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
