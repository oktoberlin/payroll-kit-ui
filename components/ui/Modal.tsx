"use client";

import type { ReactNode } from "react";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  labelledBy,
  role = "dialog",
  width = 440,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  role?: "dialog" | "alertdialog";
  width?: number;
  children: ReactNode;
}) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[var(--pk-overlay)] p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={{ maxWidth: width }}
        className="w-full animate-in rounded-xl border border-line bg-surface shadow-3"
      >
        {children}
      </div>
    </div>
  );
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex justify-end gap-2 rounded-b-xl border-t border-line bg-surface-2 px-5 py-3", className)}>
      {children}
    </div>
  );
}
