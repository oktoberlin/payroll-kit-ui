"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useCrumbLabel } from "@/components/shell/crumbs";
import { useDownloadPayslip } from "@/components/payslip/PayslipDrawer";
import { PayslipView } from "@/components/payslip/PayslipView";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { monthLabel } from "@/lib/format";
import { usePayslip } from "@/lib/queries";

export default function MyPayslipPage() {
  const id = Number(useParams<{ id: string }>().id);
  const slip = usePayslip(id);
  const download = useDownloadPayslip();
  const label = slip.data ? monthLabel(slip.data.period.start_date) : null;
  useCrumbLabel(label);
  usePageTitle(label ? `${label} payslip` : "Payslip");

  if (slip.isError) {
    const missing = slip.error instanceof ApiError && slip.error.status === 404;
    return <ErrorState title={missing ? "Payslip not found" : undefined} message={missing ? "This payslip does not exist, or is not available yet." : "The payslip could not be loaded."} onRetry={() => slip.refetch()} />;
  }
  if (!slip.data) return <SkeletonRows rows={6} cols={3} label="Loading payslip" />;
  const data = slip.data;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <Link href="/my-payslips" className="inline-flex h-control items-center gap-1.5 self-start rounded pl-1.5 pr-2.5 !text-ink-2 no-underline hover:bg-hover">
        <Icon name="arrow-left" />
        All payslips
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold">{label} payslip</h1>
          <p className="m-0 mt-0.5 text-ink-2">
            {data.run_status === "paid" ? "Paid" : "Pay date"} <span className="font-mono">{data.period.pay_date}</span> · <span className="font-mono">{data.employee_number}</span> {data.employee_name}
          </p>
        </div>
        <Button variant="primary" size="lg" icon="download" onClick={() => download(data)}>
          Download PDF
        </Button>
      </div>
      <div className="rounded-xl border border-line bg-surface p-5">
        <PayslipView slip={data} />
      </div>
    </div>
  );
}
