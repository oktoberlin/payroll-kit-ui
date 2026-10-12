import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

export type Step = { label: string; sub: string };

/** Draft -> Approved -> Paid. `index` is the current step (0-2). */
export function Stepper({ steps, index, compact }: { steps: Step[]; index: number; compact: boolean }) {
  const paid = index === 2;
  return (
    <ol
      aria-label="Run status"
      className="m-0 grid list-none rounded-lg border border-line bg-surface px-4 py-3.5 shadow-1"
      style={{ gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: compact ? 10 : 0 }}
    >
      {steps.map((step, i) => {
        const done = i < index || (i === 2 && paid);
        const current = i === index && !done;
        const emerald = i === 2 && paid;
        return (
          <li key={step.label} aria-current={current ? "step" : undefined} className="flex min-w-0 items-start gap-2.5">
            <span
              className={cn(
                "grid size-[26px] flex-none place-items-center rounded-full border-[1.5px] font-mono text-sm font-semibold",
                done && (emerald ? "border-transparent bg-emerald text-white" : "border-transparent bg-primary text-white"),
                current && "border-primary-fg bg-primary-soft text-primary-soft-fg",
                !done && !current && "border-line-strong bg-surface text-ink-3",
              )}
            >
              {done ? <Icon name={emerald ? "lock" : "check"} size={13} /> : i + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2">
                <span className="font-semibold">{step.label}</span>
                <span
                  className={cn(
                    "text-[10.5px] font-semibold uppercase tracking-[.06em]",
                    done ? (emerald ? "text-emerald-fg" : "text-primary-fg") : current ? "text-amber-fg" : "text-ink-3",
                  )}
                >
                  {done ? "Done" : current ? "Current" : "Next"}
                </span>
              </span>
              <span className="text-[12px] text-ink-3 [text-wrap:pretty]">{step.sub}</span>
            </span>
            {!compact && i < 2 && (
              <span
                aria-hidden="true"
                className={cn("mr-1.5 h-0.5 min-w-4 flex-[0_1_56px] self-center rounded-sm", i < index ? "bg-primary" : "bg-line")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
