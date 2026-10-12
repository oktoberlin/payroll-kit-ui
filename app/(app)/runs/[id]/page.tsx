"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useCrumbLabel } from "@/components/shell/crumbs";
import { PayslipDrawer } from "@/components/payslip/PayslipDrawer";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { Money } from "@/components/ui/Money";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { StatusPill } from "@/components/ui/StatusPill";
import { Stepper } from "@/components/ui/Stepper";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useCompact } from "@/hooks/useCompact";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiRaw, ApiError, download, json } from "@/lib/api";
import { FREQUENCIES, monthLabel, shortStamp } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { invalidateRun, useRole, useRun, useRunPayslips } from "@/lib/queries";
import { runLines } from "@/lib/run";
import type { PayrollRun, Payslip } from "@/lib/types";

type Confirm = "approve" | "paid" | "reopen" | null;

const COLUMNS = ["Gross ($)", "Pre-tax ($)", "Taxable ($)", "Tax ($)", "Post-tax ($)", "Net ($)", "Employer benefits ($)"];

export default function RunPage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const compact = useCompact();
  const toast = useToast();
  const client = useQueryClient();
  const role = useRole();
  const isAdmin = role === "admin";

  const run = useRun(id);
  const payslips = useRunPayslips(id);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const label = run.data ? monthLabel(run.data.period.start_date) : null;
  useCrumbLabel(label);
  usePageTitle(label ? `${label} payroll` : "Payroll run");

  const slipId = Number(search.get("slip")) || null;
  const openSlip = useCallback((next: number | null) => router.replace(next ? `${pathname}?slip=${next}` : pathname, { scroll: false }), [router, pathname]);

  const fail = (e: unknown) => toast("error", e instanceof ApiError ? e.message : "Something went wrong");

  const calculate = useMutation({
    mutationFn: () => apiRaw<PayrollRun>(`/payroll-runs/${id}/calculate/`, json("POST")),
    onSuccess: ({ data, headers }) => {
      invalidateRun(client, id);
      const changed = headers.get("x-recalculated") === "true";
      toast(
        changed ? "success" : "info",
        changed ? `Recalculated ${data.payslip_count} payslips` : "Nothing changed, no recalculation needed",
        `X-Recalculated: ${changed}`,
      );
    },
    onError: fail,
  });

  const transition = useMutation({
    mutationFn: (action: "approve" | "reopen" | "mark-paid") => apiRaw<PayrollRun>(`/payroll-runs/${id}/${action}/`, json("POST")),
    onSuccess: ({ data }, action) => {
      invalidateRun(client, id);
      setConfirm(null);
      if (action === "approve") toast("success", "Run approved", `Approved by ${data.approved_by}, ${data.approved_at ? shortStamp(data.approved_at) : ""}`);
      if (action === "mark-paid") toast("success", "Run marked paid and locked", `Paid by ${data.paid_by}, ${data.paid_at ? shortStamp(data.paid_at) : ""}`);
      if (action === "reopen") toast("info", "Run reopened as draft", "Approval cleared");
    },
    onError: (e) => {
      setConfirm(null);
      fail(e);
    },
  });

  async function exportCsv() {
    if (!run.data) return;
    const name = `payroll-register-${run.data.period.start_date.slice(0, 7)}.csv`;
    try {
      await download(`/payroll-runs/${id}/export/`, name);
      toast("success", `Exported ${name}`, `${run.data.payslip_count} rows · formula-safe CSV`);
    } catch (e) {
      fail(e);
    }
  }

  const data = run.data;
  const draft = data?.status === "draft";
  const approved = data?.status === "approved";
  const paid = data?.status === "paid";
  const stale = !!data?.is_stale;
  const calculated = (data?.payslip_count ?? 0) > 0;

  // "C" calculates, like the shortcut hint on the button.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (event.key.toLowerCase() !== "c" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || confirm || slipId) return;
      if (draft && !calculate.isPending) calculate.mutate();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, confirm, slipId, calculate]);

  if (run.isError) {
    const notFound = run.error instanceof ApiError && run.error.status === 404;
    return <ErrorState title={notFound ? "Run not found" : undefined} message={notFound ? "This payroll run does not exist, or belongs to another company." : "The run could not be loaded."} onRetry={() => run.refetch()} />;
  }
  if (!data) return <SkeletonRows rows={6} cols={5} label="Loading run" />;

  const { calc: calcLine, approved: approvedLine, paid: paidLine } = runLines(data);
  const stepIndex = paid ? 2 : approved ? 1 : 0;
  const slips = payslips.data ?? [];

  const gate = (enabled: boolean, reason: string, adminOnly = true) => ({
    disabled: !enabled,
    disabledReason: !enabled ? (adminOnly && !isAdmin ? "Admin only" : reason) : undefined,
  });

  const dialogs = {
    approve: {
      title: `Approve ${label} payroll?`,
      body: `${data.payslip_count} payslips totalling $${formatMoney(data.totals.net)} net will be frozen for payment. Timesheets and deductions can still change, but this run will not pick them up unless an admin reopens it.`,
      consequence: "Approved runs are read-only until reopened.",
      cta: "Approve run",
      icon: "check" as const,
      tone: "primary" as const,
      action: "approve" as const,
    },
    paid: {
      title: `Mark ${label} as paid?`,
      body: `This records that $${formatMoney(data.totals.net)} was paid to ${data.payslip_count} employees on ${data.period.pay_date}.`,
      consequence: "Paid runs cannot be changed. Not even by an admin.",
      cta: "Mark paid",
      icon: "lock" as const,
      tone: "emerald" as const,
      action: "mark-paid" as const,
    },
    reopen: {
      title: "Reopen as draft?",
      body: `The approval by ${data.approved_by ?? "an admin"} will be cleared. The run can then be recalculated and must be approved again before payment.`,
      consequence: "Payslips stay as they are until you recalculate.",
      cta: "Reopen run",
      icon: "rotate-ccw" as const,
      tone: "amber" as const,
      action: "reopen" as const,
    },
  };
  const dialog = confirm ? dialogs[confirm] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="m-0 text-2xl font-semibold tracking-[-0.01em]">{label} payroll</h1>
          <StatusPill status={data.status} />
          {paid && (
            <span className="inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full border border-line-strong px-2 text-[12px] text-ink-2">
              <Icon name="eye" size={12} />
              Read-only
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-sm text-ink-2">
          <span>
            Period <span className="font-mono text-ink">{data.period.start_date} → {data.period.end_date}</span>
          </span>
          <span>
            Pay date <span className="font-mono text-ink">{data.period.pay_date}</span>
          </span>
          <span>{FREQUENCIES[data.period.periods_per_year ?? 12]}</span>
          <span>
            Run <span className="font-mono">#{data.id}</span>
          </span>
        </div>
      </div>

      <Stepper
        compact={compact}
        index={stepIndex}
        steps={[
          { label: "Draft", sub: calcLine },
          { label: "Approved", sub: approvedLine },
          { label: "Paid", sub: paidLine },
        ]}
      />

      {paid ? (
        <Banner tone="success" icon="lock" className="!border-line !bg-surface !text-ink shadow-1" actions={<Button icon="file-spreadsheet" onClick={exportCsv}>Export CSV register</Button>}>
          <div className="font-semibold">This run is paid and locked</div>
          <div className="text-sm text-ink-2">{paidLine}. Payslips are immutable; nothing on this page can be edited.</div>
        </Banner>
      ) : (
        <div role="toolbar" aria-label="Run actions" className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 shadow-1">
          <Button icon="calculator" {...gate(draft, "Only draft runs can be calculated", false)} onClick={() => calculate.mutate()}>
            Calculate
            <span className="ml-0.5 rounded-[3px] border border-line px-1 font-mono text-[11px] text-ink-3">C</span>
          </Button>
          <Button
            variant="primary"
            icon="check"
            trailingIcon={!isAdmin ? "lock" : undefined}
            {...gate(draft && isAdmin && !stale && calculated, stale ? "Recalculate first: inputs changed" : !calculated && draft ? "Calculate the run first" : "Only draft runs can be approved")}
            onClick={() => setConfirm("approve")}
          >
            Approve
          </Button>
          <Button
            icon="rotate-ccw"
            trailingIcon={!isAdmin ? "lock" : undefined}
            {...gate(approved && isAdmin, "Only approved runs can be reopened")}
            onClick={() => setConfirm("reopen")}
          >
            Reopen
          </Button>
          <Button
            variant="primary"
            icon="banknote"
            trailingIcon={!isAdmin ? "lock" : undefined}
            {...gate(approved && isAdmin, "Approve the run first")}
            onClick={() => setConfirm("paid")}
          >
            Mark paid
          </Button>
          {role === "payroll_manager" && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
              <Icon name="info" />
              Approve, Reopen and Mark paid are admin only
            </span>
          )}
          <span className="flex-1" />
          <Button variant="ghost" icon="file-spreadsheet" onClick={exportCsv} disabled={!calculated} disabledReason="Calculate the run first">
            Export CSV register
          </Button>
        </div>
      )}

      {stale && draft && (
        <Banner
          tone="warning"
          actions={
            <Button size="sm" icon="refresh-cw" className="!border-current !bg-transparent !text-inherit font-semibold" onClick={() => calculate.mutate()}>
              Recalculate
            </Button>
          }
        >
          <strong className="font-semibold">Inputs changed since the last calculation.</strong> Recalculate before approving.{" "}
          <span className="opacity-85">{calcLine}.</span>
        </Banner>
      )}

      <section aria-label="Payslips" className="overflow-hidden rounded-lg border border-line bg-surface shadow-1">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <h2 className="m-0 text-lg font-semibold">Payslips</h2>
          <span className="font-mono text-[12px] text-ink-3">{data.payslip_count}</span>
          <span className="ml-auto text-[12px] text-ink-3">
            {paid ? "Read-only · click a row to view the payslip" : "Click a row or press Enter to open the payslip"}
          </span>
        </div>
        {payslips.isLoading && <SkeletonRows rows={6} cols={5} label="Loading payslips" />}
        {payslips.isSuccess && slips.length === 0 && (
          <div className="px-6 py-10 text-center text-ink-2">
            {draft ? "Nothing calculated yet. Press Calculate to create a payslip for every active employee." : "This run has no payslips."}
          </div>
        )}
        {slips.length > 0 && !compact && <PayslipsTable slips={slips} run={data} selected={slipId} onOpen={openSlip} />}
        {slips.length > 0 && compact && <PayslipCards slips={slips} run={data} onOpen={openSlip} />}
      </section>

      <PayslipDrawer payslips={slips} selectedId={slipId} onSelect={openSlip} onClose={() => openSlip(null)} />

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.title ?? ""}
        body={dialog?.body ?? ""}
        consequence={dialog?.consequence ?? ""}
        cta={dialog?.cta ?? ""}
        icon={dialog?.icon ?? "check"}
        tone={dialog?.tone}
        requireCheck={confirm === "paid" ? <>I have confirmed the bank transfer for <span className="font-mono">${formatMoney(data.totals.net)}</span></> : undefined}
        busy={transition.isPending}
        onConfirm={() => dialog && transition.mutate(dialog.action)}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function PayslipsTable({ slips, run, selected, onOpen }: { slips: Payslip[]; run: PayrollRun; selected: number | null; onOpen: (id: number) => void }) {
  const t = run.totals;
  const values = (s: Payslip | typeof t) => [s.gross, s.pre_tax_deductions, s.taxable, s.tax, s.post_tax_deductions, s.net, s.employer_benefits];
  const tone = ["", "text-ink-2", "", "text-ink-2", "text-ink-2", "font-semibold", "text-ink-3"];
  return (
    <div className="max-h-[520px] overflow-auto">
      <Table>
        <thead>
          <tr>
            <Th className="pl-4">Employee</Th>
            {COLUMNS.map((column, i) => (
              <Th key={column} align="right" className={i === 6 ? "border-l border-dashed border-line pr-4" : ""}>
                {column}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slips.map((slip) => (
            <Tr
              key={slip.id}
              clickable
              selected={selected === slip.id}
              tabIndex={0}
              aria-selected={selected === slip.id}
              onClick={() => onOpen(slip.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(slip.id);
                }
              }}
            >
              <Td className="whitespace-nowrap pl-4">
                <span className="flex items-center gap-2.5">
                  <span className="font-mono text-[12px] text-ink-3">{slip.employee_number}</span>
                  <span className="font-medium">{slip.employee_name}</span>
                  <span className="text-[11.5px] text-ink-3">{slip.pay_type === "salary" ? "Salary" : "Hourly"}</span>
                </span>
              </Td>
              {values(slip).map((value, i) => (
                <Td key={i} money className={`whitespace-nowrap ${tone[i]} ${i === 6 ? "border-l border-dashed border-line pr-4" : ""}`}>
                  <Money value={value} />
                </Td>
              ))}
            </Tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="sticky bottom-0 h-row border-t border-line-strong bg-surface-2 pl-4 pr-3 font-semibold">Totals ($)</td>
            {values(t).map((value, i) => (
              <td
                key={i}
                className={`pk-money sticky bottom-0 h-row whitespace-nowrap border-t border-line-strong bg-surface-2 px-3 ${i === 5 ? "font-bold text-primary-fg" : i === 6 ? "border-l border-dashed border-l-line pr-4 text-ink-3" : "font-semibold"}`}
              >
                <Money value={value} />
              </td>
            ))}
          </tr>
        </tfoot>
      </Table>
    </div>
  );
}

function PayslipCards({ slips, run, onOpen }: { slips: Payslip[]; run: PayrollRun; onOpen: (id: number) => void }) {
  return (
    <ul className="m-0 list-none p-0">
      {slips.map((slip) => (
        <li key={slip.id} className="border-b border-line">
          <button type="button" onClick={() => onOpen(slip.id)} className="flex w-full cursor-pointer flex-col gap-2 border-0 bg-transparent px-3.5 py-3 text-left">
            <span className="flex w-full items-baseline gap-2">
              <span className="font-mono text-[12px] text-ink-3">{slip.employee_number}</span>
              <span className="min-w-0 flex-1 font-semibold">{slip.employee_name}</span>
              <Money value={slip.net} className="text-[15px] font-semibold" />
            </span>
            <span className="grid w-full grid-cols-4 gap-1.5 text-[11px] text-ink-3">
              {(
                [
                  ["Gross", slip.gross],
                  ["Pre-tax", slip.pre_tax_deductions],
                  ["Tax", slip.tax],
                  ["Post-tax", slip.post_tax_deductions],
                ] as const
              ).map(([label, value], i) => (
                <span key={label} className={`flex flex-col ${i === 3 ? "text-right" : ""}`}>
                  {label}
                  <Money value={value} className={`text-[12px] ${i === 0 ? "text-ink" : "text-ink-2"} ${i === 3 ? "text-right" : "text-left"}`} />
                </span>
              ))}
            </span>
            <span className="text-[11.5px] text-ink-3">
              Employer benefits <Money value={slip.employer_benefits} className="font-mono" /> · not deducted
            </span>
          </button>
        </li>
      ))}
      <li className="flex flex-col gap-1 bg-surface-2 px-3.5 py-3">
        <span className="flex justify-between font-semibold">
          <span>Total net ($)</span>
          <Money value={run.totals.net} className="text-primary-fg" />
        </span>
        <span className="flex justify-between text-[12px] text-ink-2">
          <span>Total gross ($)</span>
          <Money value={run.totals.gross} />
        </span>
        <span className="flex justify-between text-[12px] text-ink-2">
          <span>Total tax ($)</span>
          <Money value={run.totals.tax} />
        </span>
      </li>
    </ul>
  );
}
