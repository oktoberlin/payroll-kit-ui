import { Icon } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { cn } from "@/lib/cn";
import { equation, payslipGroups, reconciles } from "@/lib/payslip";
import type { Payslip, PayslipDetail } from "@/lib/types";

const SECTION_TITLE = "m-0 text-xs font-semibold uppercase tracking-[.05em] text-ink-3";

/** An itemised payslip: sections, then the proof that it adds up, then year to date. */
export function PayslipView({ slip, ytdLoading }: { slip: Payslip | PayslipDetail; ytdLoading?: boolean }) {
  const ytd = "ytd" in slip ? slip.ytd : null;
  const ok = reconciles(slip);

  return (
    <div className="flex flex-col gap-[18px] text-base">
      {payslipGroups(slip).map((group) => (
        <section key={group.key} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h3 className={SECTION_TITLE}>{group.title}</h3>
            {group.tag && (
              <span className="inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-line-strong px-[7px] text-[11px] text-ink-2">
                <Icon name="circle-slash" size={11} />
                {group.tag}
              </span>
            )}
          </div>
          <div className={cn("overflow-hidden rounded-[8px] border border-line", group.muted ? "text-ink-3" : "text-ink")}>
            {group.lines.map((line) => (
              <div key={`${line.code}-${line.description}`} className="grid min-h-[34px] grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-line px-3">
                <span className="font-mono text-[11.5px] text-ink-3">{line.code}</span>
                <span className="min-w-0">{line.description}</span>
                <Money value={line.amount} />
              </div>
            ))}
            {group.lines.length === 0 && group.key !== "earning" && (
              <div className="flex min-h-[34px] items-center border-b border-line px-3 text-ink-3">None this period</div>
            )}
            <div className="flex min-h-[34px] items-center justify-between bg-surface-2 px-3 font-semibold">
              <span>{group.totalLabel}</span>
              <Money value={group.total} />
            </div>
            {group.after && (
              <div className="flex min-h-[34px] items-center justify-between border-t border-line px-3 text-ink-2">
                <span>{group.after.label}</span>
                <Money value={group.after.amount} />
              </div>
            )}
          </div>
        </section>
      ))}

      <section aria-label="Reconciliation" className="overflow-hidden rounded-[10px] border border-line-strong">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2.5">
          <Icon name="scale" className="text-ink-3" />
          <span className="font-semibold">Reconciliation</span>
          <span className={cn("ml-auto inline-flex items-center gap-1 text-[12px]", ok ? "text-emerald-fg" : "text-rose-fg")}>
            <Icon name={ok ? "circle-check" : "circle-alert"} />
            {ok ? "Adds up to the cent" : "Does not add up"}
          </span>
        </div>
        <div className="px-3 py-1.5">
          {(
            [
              ["", "Gross pay", slip.gross],
              ["−", "Pre-tax deductions", slip.pre_tax_deductions],
              ["−", "Tax", slip.tax],
              ["−", "Post-tax deductions", slip.post_tax_deductions],
            ] as const
          ).map(([op, label, amount]) => (
            <div key={label} className="grid min-h-[30px] grid-cols-[20px_minmax(0,1fr)_auto] items-center">
              <span className="font-mono text-ink-3">{op}</span>
              <span className="text-ink-2">{label}</span>
              <Money value={amount} />
            </div>
          ))}
          <div className="mt-1 grid min-h-10 grid-cols-[20px_minmax(0,1fr)_auto] items-center border-t border-line-strong">
            <span className="font-mono text-ink-3">=</span>
            <span className="text-lg font-semibold">Net pay ($)</span>
            <Money value={slip.net} className="text-[17px] font-semibold text-primary-fg" />
          </div>
        </div>
        <div className="overflow-x-auto whitespace-nowrap border-t border-line px-3 py-2 font-mono text-[11.5px] text-ink-3">{equation(slip)}</div>
      </section>

      <section aria-label="Year to date" className="flex flex-col gap-1.5">
        <h3 className={SECTION_TITLE}>Year to date ($)</h3>
        <div className="grid grid-cols-3 overflow-hidden rounded-[8px] border border-line">
          {(["gross", "tax", "net"] as const).map((key) => (
            <div key={key} className="border-r border-line px-3 py-2.5 last:border-r-0">
              <div className="text-[12px] capitalize text-ink-2">{key}</div>
              {ytd ? (
                <Money value={ytd[key]} className="block text-right text-lg font-medium" />
              ) : (
                <span aria-busy={ytdLoading} className="mt-1 block h-3.5 w-16 animate-pulse rounded bg-skeleton" />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
