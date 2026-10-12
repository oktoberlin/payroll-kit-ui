"use client";

import type { ReactNode } from "react";

import { useCompact } from "@/hooks/useCompact";
import { useFocusTrap } from "@/hooks/useFocusTrap";

/** Right-hand panel, 560px wide (full width under 760px). */
export function Drawer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const compact = useCompact();
  const ref = useFocusTrap<HTMLElement>(open, onClose);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-[var(--pk-overlay)]" onClick={onClose} />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ width: compact ? "100%" : 560 }}
        className="fixed bottom-0 right-0 top-0 z-[51] flex max-w-full animate-slide flex-col border-l border-line bg-surface shadow-3"
      >
        {children}
      </aside>
    </>
  );
}
