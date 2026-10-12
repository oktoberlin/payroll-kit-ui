import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon, type IconName } from "./Icon";

export function EmptyState({
  icon,
  title,
  children,
  actions,
  tone = "primary",
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: "primary" | "neutral";
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
      <span
        className={cn(
          "mb-1.5 grid size-11 place-items-center rounded-lg",
          tone === "primary" ? "bg-primary-soft text-primary-soft-fg" : "border border-line bg-surface-2 text-ink-2",
        )}
      >
        <Icon name={icon} size={20} />
      </span>
      <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
      {children && <p className="m-0 mb-2.5 max-w-[380px] text-ink-2 [text-wrap:pretty]">{children}</p>}
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

const WIDTHS = ["62%", "54%", "68%", "50%", "58%", "70%"];

/** Placeholder rows for a table that is loading. */
export function SkeletonRows({ rows = 5, cols = 4, label }: { rows?: number; cols?: number; label: string }) {
  return (
    <div aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="grid h-row items-center gap-4 border-b border-line px-4"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }, (_, col) => (
            <span
              key={col}
              className="h-2.5 animate-pulse rounded bg-skeleton"
              style={{ width: col === cols - 1 ? "40%" : WIDTHS[(row + col) % WIDTHS.length], justifySelf: col === cols - 1 ? "end" : "start" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="circle-alert"
      title={title}
      tone="neutral"
      actions={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="h-control cursor-pointer rounded border border-line-strong bg-surface px-3 font-medium hover:bg-hover"
          >
            Try again
          </button>
        ) : undefined
      }
    >
      {message}
    </EmptyState>
  );
}
