"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { Icon, type IconName } from "./Icon";

export type RowMenuItem = {
  label: string;
  icon: IconName;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
  separatorBefore?: boolean;
};

/** A "..." button with a small action menu. Disabled items stay visible and explain themselves. */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative inline-block text-left" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-7 cursor-pointer place-items-center rounded-[5px] border border-transparent bg-transparent text-ink-2 hover:border-line hover:bg-surface-2"
      >
        <Icon name="ellipsis" size={15} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-20 w-[210px] animate-in rounded-lg border border-line bg-surface p-1 shadow-3">
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore && <div className="my-1 h-px bg-line" />}
              <button
                type="button"
                role="menuitem"
                title={item.title}
                aria-disabled={item.disabled ? "true" : undefined}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex h-[30px] w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-[5px] border-0 bg-transparent px-2 text-left",
                  item.danger ? "text-rose-fg hover:bg-rose-soft" : "hover:bg-hover",
                )}
              >
                <Icon name={item.icon} className={item.danger ? undefined : "text-ink-3"} />
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
