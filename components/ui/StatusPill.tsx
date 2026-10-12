import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

const STYLES = {
  draft: { label: "Draft", box: "bg-amber-soft text-amber-fg", dot: "bg-amber", lock: false },
  approved: { label: "Approved", box: "bg-primary-soft text-primary-soft-fg", dot: "bg-primary-fg", lock: false },
  paid: { label: "Paid", box: "bg-emerald-soft text-emerald-fg", dot: "bg-emerald", lock: true },
  notFinal: { label: "Not final yet", box: "bg-amber-soft text-amber-fg", dot: "bg-amber", lock: false },
  active: { label: "Active", box: "border border-line bg-surface-2 text-ink-2", dot: "bg-ink-2", lock: false },
  inactive: { label: "Inactive", box: "border border-line bg-surface-2 text-ink-3", dot: "bg-ink-3", lock: false },
} as const;

export type PillKind = keyof typeof STYLES;

/** Status = dot + word (+ lock for Paid). Colour is never the only signal. */
export function StatusPill({ status, className }: { status: PillKind; className?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full pl-[7px] pr-2 text-[12px] font-medium",
        style.box,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
      {style.lock && <Icon name="lock" size={11} />}
    </span>
  );
}

export function IllustrativeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border pk-bd-amber bg-amber-soft px-[9px] text-[12px] font-semibold text-amber-fg",
        className,
      )}
    >
      <Icon name="flask-conical" />
      Illustrative only
    </span>
  );
}
