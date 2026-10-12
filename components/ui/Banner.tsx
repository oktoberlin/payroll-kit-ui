import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon, type IconName } from "./Icon";

const TONES = {
  warning: { box: "pk-bd-amber bg-amber-soft text-amber-fg", icon: "triangle-alert" as IconName },
  error: { box: "pk-bd-rose bg-rose-soft text-rose-fg", icon: "octagon-x" as IconName },
  info: { box: "border-line bg-surface text-ink", icon: "info" as IconName },
  accent: { box: "border-transparent bg-primary-soft text-primary-soft-fg", icon: "info" as IconName },
  success: { box: "pk-bd-emerald bg-emerald-soft text-emerald-fg", icon: "circle-check" as IconName },
};

export function Banner({
  tone,
  icon,
  children,
  actions,
  role,
  className,
}: {
  tone: keyof typeof TONES;
  icon?: IconName;
  children: ReactNode;
  actions?: ReactNode;
  role?: "alert" | "status";
  className?: string;
}) {
  const style = TONES[tone];
  return (
    <div
      role={role ?? (tone === "error" || tone === "warning" ? "alert" : undefined)}
      className={cn("flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5", style.box, className)}
    >
      <Icon name={icon ?? style.icon} size={16} className="shrink-0" />
      <div className="min-w-[220px] flex-1">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
