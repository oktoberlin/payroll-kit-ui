import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon, type IconName } from "./Icon";

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement> & { as?: "div" | "section" }) {
  return <section className={cn("rounded-lg border border-line bg-surface shadow-1", className)} {...rest} />;
}

export function StatCard({
  icon,
  label,
  children,
  hint,
}: {
  icon: IconName;
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-2">
        <Icon name={icon} />
        {label}
      </div>
      <div className="mt-2">{children}</div>
      {hint && <div className="mt-0.5 text-[12px] text-ink-3">{hint}</div>}
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="m-0 text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="m-0 mt-0.5 text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
