"use client";

import { useEffect } from "react";

import { Button, IconButton } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { ApiError, download } from "@/lib/api";
import { initials, monthLabel } from "@/lib/format";
import { usePayslip } from "@/lib/queries";
import { rateLabel } from "@/lib/payslip";
import type { Payslip } from "@/lib/types";

import { PayslipView } from "./PayslipView";

export function payslipFileName(slip: Payslip): string {
  return `payslip-${slip.employee_number}-${slip.period.start_date.slice(0, 7)}.pdf`;
}

export function useDownloadPayslip() {
  const toast = useToast();
  return async (slip: Pick<Payslip, "id" | "employee_number" | "period">) => {
    try {
      await download(`/payslips/${slip.id}/pdf/`, payslipFileName(slip as Payslip));
      toast("success", "Payslip PDF downloaded", `GET /api/payslips/${slip.id}/pdf/`);
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "Download failed");
    }
  };
}

/** One employee's payslip in a right-hand drawer. Up/down moves between employees, Esc closes. */
export function PayslipDrawer({
  payslips,
  selectedId,
  onSelect,
  onClose,
}: {
  payslips: Payslip[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const detail = usePayslip(selectedId);
  const download = useDownloadPayslip();
  const listed = payslips.find((p) => p.id === selectedId) ?? null;
  const slip = detail.data ?? listed;

  useEffect(() => {
    if (selectedId === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const i = payslips.findIndex((p) => p.id === selectedId);
      const next = event.key === "ArrowDown" ? Math.min(payslips.length - 1, i + 1) : Math.max(0, i - 1);
      if (payslips[next] && next !== i) onSelect(payslips[next].id);
      event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [payslips, selectedId, onSelect]);

  return (
    <Drawer open={selectedId !== null && !!slip} onClose={onClose} label="Payslip">
      {slip && (
        <>
          <div className="flex items-start gap-3 border-b border-line py-3.5 pl-5 pr-4">
            <span className="grid size-10 flex-none place-items-center rounded-full bg-primary-soft font-semibold text-primary-soft-fg">
              {initials(slip.employee_name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-xl font-semibold">{slip.employee_name}</h2>
                <span className="font-mono text-[12px] text-ink-3">{slip.employee_number}</span>
              </div>
              <div className="text-[12px] text-ink-2">
                {rateLabel(slip)} · {monthLabel(slip.period.start_date)} · pay date <span className="font-mono">{slip.period.pay_date}</span>
              </div>
            </div>
            <StatusPill status={slip.run_status as "draft" | "approved" | "paid"} />
            <IconButton icon="x" label="Close payslip" onClick={onClose} />
          </div>
          <div tabIndex={0} role="region" aria-label="Payslip details" className="flex-1 overflow-auto p-5">
            {detail.isError ? (
              <p className="m-0 text-ink-2">This payslip could not be loaded.</p>
            ) : (
              <PayslipView slip={slip} ytdLoading={detail.isLoading} />
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-line px-5 py-3">
            <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <Icon name="keyboard" />
              <span className="font-mono">↑ ↓</span> next employee · <span className="font-mono">Esc</span> close
            </span>
            <Button className="ml-auto" variant="primary" icon="download" onClick={() => download(slip)}>
              Download PDF
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}
