"use client";

import { useEffect, useRef, useState } from "react";
import { StageIcon } from "./StageIcon";

export type ComboboxOption = { value: string; label: string };

export function Combobox({ value, options, onChange, ariaLabel, className = "" }: {
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <div ref={rootRef} className={`system-combobox ${open ? "is-open" : ""} ${className}`}>
    <button type="button" className="system-combobox-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{selected?.label}</span><StageIcon name="chevron-down" />
    </button>
    {open && <div className="system-combobox-menu" role="listbox" aria-label={ariaLabel}>
      {options.map((option) => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? "selected" : ""} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value && <StageIcon name="check" />}</button>)}
    </div>}
  </div>;
}
