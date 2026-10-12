"use client";

import { useRouter } from "next/navigation";

import { useDownloadPayslip } from "@/components/payslip/PayslipDrawer";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { StatusPill } from "@/components/ui/StatusPill";
import { usePageTitle } from "@/hooks/usePageTitle";
import { monthLabel } from "@/lib/format";
import { addMoney } from "@/lib/money";
import { useMe, useMyPayslips } from "@/lib/queries";
import type { Payslip } from "@/lib/types";

const status = (slip: Payslip) => (slip.run_status === "paid" ? "paid" : "approved");
const sub = (slip: Payslip) => (slip.run_status === "paid" ? `Paid ${slip.period.pay_date}` : `Approved · pay date ${slip.period.pay_date}`);

export default function MyPayslipsPage() {
  usePageTitle("My payslips");
  const me = useMe();
  const isEmployee = me.data?.role === "employee";
  const slips = useMyPayslips(isEmployee);
  const router = useRouter();
  const download = useDownloadPayslip();
  const list = slips.data ?? [];
  const latest = list[0];

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <div>
        <h1 className="m-0 text-3xl font-semibold tracking-[-0.01em]">Hi {me.data?.employee?.first_name ?? "there"}</h1>
        <p className="m-0 mt-0.5 text-ink-2">Your payslips from {me.data?.company.name}.</p>
      </div>

      {slips.isError && <ErrorState message="Your payslips could not be loaded." onRetry={() => slips.refetch()} />}
      {slips.isLoading && <SkeletonRows rows={4} cols={3} label="Loading payslips" />}

      {latest && (
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Latest payslip · {monthLabel(latest.period.start_date)}</span>
              <StatusPill status={status(latest)} />
            </div>
            <span className="text-[12px] text-ink-3">
              {latest.run_status === "paid" ? "Paid on" : "Pay date"} <span className="font-mono">{latest.period.pay_date}</span>
            </span>
          </div>
          <div>
            <div className="text-[12px] text-ink-2">Net pay ($)</div>
            <Money value={latest.net} className="block text-left text-[36px] font-medium leading-[44px] tracking-[-0.02em]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["Gross", latest.gross],
                ["Tax", latest.tax],
                ["Deductions", addMoney(latest.pre_tax_deductions, latest.post_tax_deductions)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-[8px] bg-surface-2 p-2.5">
                <div className="text-[12px] text-ink-2">{label}</div>
                <Money value={value} className="block text-left" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="lg" icon="download" className="flex-[1_1_160px]" onClick={() => download(latest)}>
              Download PDF
            </Button>
            <Button size="lg" className="flex-[1_1_160px]" onClick={() => router.push(`/my-payslips/${latest.id}`)}>
              View details
            </Button>
          </div>
        </section>
      )}

      {slips.isSuccess && (
        <section>
          <h2 className="m-0 mb-2 text-lg font-semibold">All payslips</h2>
          {list.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface">
              <EmptyState icon="file-text" title="No payslips yet">
                Your first payslip appears here once a payroll run that includes you is approved.
              </EmptyState>
            </div>
          ) : (
            <ul className="m-0 list-none overflow-hidden rounded-xl border border-line bg-surface p-0">
              {list.map((slip) => (
                <li key={slip.id} className="border-b border-line last:border-b-0">
                  <div className="flex min-h-14 items-center gap-3 py-2 pl-4 pr-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/my-payslips/${slip.id}`)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 py-1 text-left"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-medium">{monthLabel(slip.period.start_date)}</span>
                        <span className="text-[12px] text-ink-3">{sub(slip)}</span>
                      </span>
                      <StatusPill status={status(slip)} />
                      <Money value={slip.net} className="min-w-[72px] font-medium" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Download ${monthLabel(slip.period.start_date)} payslip PDF`}
                      title={`Download ${monthLabel(slip.period.start_date)} payslip PDF`}
                      onClick={() => download(slip)}
                      className="grid size-11 flex-none cursor-pointer place-items-center rounded-[8px] border border-line bg-surface text-ink-2 hover:bg-hover"
                    >
                      <Icon name="file-down" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
