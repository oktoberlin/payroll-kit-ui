import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-separate border-spacing-0 text-base", className)} {...rest} />;
}

type Align = "left" | "right" | "center";
const ALIGN: Record<Align, string> = { left: "text-left", right: "text-right", center: "text-center" };

export function Th({
  align = "left",
  sticky = true,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: Align; sticky?: boolean }) {
  return (
    <th
      className={cn(
        "h-[34px] whitespace-nowrap border-b border-line bg-surface-2 px-3 text-xs font-semibold uppercase tracking-[.04em] text-ink-3",
        ALIGN[align],
        sticky && "sticky top-0 z-[2]",
        className,
      )}
      {...rest}
    />
  );
}

/** A 40px body cell. `money` makes it monospace, tabular and right aligned. */
export function Td({
  align = "left",
  money,
  mono,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: Align; money?: boolean; mono?: boolean }) {
  return (
    <td
      className={cn(
        "h-row border-b border-line px-3",
        money ? "pk-money" : ALIGN[align],
        mono && "font-mono",
        className,
      )}
      {...rest}
    />
  );
}

export function Tr({ clickable, selected, className, ...rest }: HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean; selected?: boolean }) {
  return (
    <tr
      className={cn(clickable && "cursor-pointer hover:bg-hover", selected && "bg-primary-soft hover:bg-primary-soft", className)}
      {...rest}
    />
  );
}

export function TableCard({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-hidden rounded-lg border border-line bg-surface shadow-1", className)} {...rest} />;
}
