"use client";

import { useId, useState, type ReactNode } from "react";

/** Shows `text` above its child on hover and keyboard focus (used to explain disabled actions). */
export function Tooltip({ text, children, enabled = true }: { text?: string; children: ReactNode; enabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const show = enabled && !!text;
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={show && open ? id : undefined}
    >
      {children}
      {show && open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[5px] bg-inverse px-2 py-[5px] text-[12px] text-inverse-fg shadow-2"
        >
          {text}
        </span>
      )}
    </span>
  );
}
