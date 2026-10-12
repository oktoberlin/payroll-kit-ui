"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { StatusPill } from "@/components/ui/StatusPill";
import { Table, TableCard, Td, Th, Tr } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, ApiError, json } from "@/lib/api";
import { FREQUENCIES, monthLabel } from "@/lib/format";
import { nextPeriodDefaults } from "@/lib/periods";
import { usePayPeriods, useRuns } from "@/lib/queries";
import type { PayPeriod } from "@/lib/types";

export default function PeriodsPage() {
  usePageTitle("Pay periods");
  const periods = usePayPeriods();
  const runs = useRuns();
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ start: "", end: "", pay: "", freq: "12" });
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState("");
  const [deleting, setDeleting] = useState<PayPeriod | null>(null);

  const list = periods.data ?? [];
  const runByPeriod = useMemo(() => new Map((runs.data ?? []).map((r) => [r.pay_period, r])), [runs.data]);

  const create = useMutation({
    mutationFn: () =>
      api<PayPeriod>("/pay-periods/", json("POST", { start_date: form.start, end_date: form.end, pay_date: form.pay, periods_per_year: Number(form.freq) })),
    onSuccess: (created) => {
      client.invalidateQueries({ queryKey: ["periods"] });
      setFormOpen(false);
      toast("success", `Pay period ${monthLabel(created.start_date)} created`);
    },
    onError: (e) => setFormError(e instanceof ApiError ? e.message : "Could not create the period."),
  });

  const remove = useMutation({
    mutationFn: (period: PayPeriod) => api<void>(`/pay-periods/${period.id}/`, json("DELETE")),
    onSuccess: (_, period) => {
      client.invalidateQueries({ queryKey: ["periods"] });
      setDeleting(null);
      toast("success", `Deleted pay period ${monthLabel(period.start_date)}`);
    },
    onError: (e, period) => {
      setDeleting(null);
      if (e instanceof ApiError && e.status === 409) {
        const run = runByPeriod.get(period.id);
        setConflict(`Pay period ${monthLabel(period.start_date)} is referenced by payroll run${run ? ` #${run.id}` : "s"}.`);
      } else toast("error", e instanceof ApiError ? e.message : "Could not delete the period");
    },
  });

  function openForm() {
    const d = nextPeriodDefaults(list);
    setForm({ start: d.start, end: d.end, pay: d.pay, freq: "12" });
    setFormError("");
    setFormOpen((open) => !open);
  }

  function submit() {
    if (!form.start || !form.end || !form.pay) return setFormError("Enter the start, end and pay dates.");
    if (form.end < form.start) return setFormError("end_date must be on or after start_date");
    setFormError("");
    create.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      {conflict && (
        <Banner
          tone="error"
          actions={
            <button type="button" aria-label="Dismiss" onClick={() => setConflict("")} className="cursor-pointer border-0 bg-transparent p-1 text-inherit">
              <Icon name="x" />
            </button>
          }
        >
          <strong className="font-semibold">Cannot delete, it is still in use.</strong> {conflict} <span className="font-mono text-[11.5px] opacity-85">409 Conflict</span>
        </Banner>
      )}
      <PageHeader
        title="Pay periods"
        subtitle="Each period can have one payroll run. Periods used by a run cannot be deleted."
        actions={
          <Button variant="primary" icon="plus" onClick={openForm}>
            New period
          </Button>
        }
      />
      {formOpen && (
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 shadow-1">
          <h2 className="m-0 text-lg font-semibold">New pay period</h2>
          <div className="grid items-start gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Field label="Start date">{({ id }) => <Input id={id} type="date" className="font-mono" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />}</Field>
            <Field label="End date" error={formError.includes("end_date") ? formError : undefined}>
              {({ id, invalid }) => <Input id={id} type="date" invalid={invalid} className="font-mono" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />}
            </Field>
            <Field label="Pay date">{({ id }) => <Input id={id} type="date" className="font-mono" value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })} />}</Field>
            <Field label="Frequency">
              {({ id }) => (
                <Select id={id} value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value })}>
                  {Object.entries(FREQUENCIES).map(([n, label]) => (
                    <option key={n} value={n}>
                      {label} ({n})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          {formError && !formError.includes("end_date") && <p role="alert" className="m-0 text-[12px] text-rose-fg">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={create.isPending} onClick={submit}>
              Create period
            </Button>
          </div>
        </section>
      )}
      <TableCard>
        {periods.isLoading && <SkeletonRows rows={4} cols={4} label="Loading pay periods" />}
        {periods.isError && <ErrorState message="The pay periods could not be loaded." onRetry={() => periods.refetch()} />}
        {periods.isSuccess && list.length === 0 && (
          <EmptyState icon="calendar-range" title="No pay periods" actions={<Button variant="primary" icon="plus" onClick={openForm}>New period</Button>}>
            Add your first pay period to start entering timesheets and running payroll.
          </EmptyState>
        )}
        {list.length > 0 && (
          <div className="overflow-auto">
            <Table>
              <thead>
                <tr>
                  {["Period", "Start", "End", "Pay date", "Frequency", "Payroll run"].map((label) => (
                    <Th key={label} sticky={false}>
                      {label}
                    </Th>
                  ))}
                  <Th sticky={false}>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {list.map((period) => {
                  const run = runByPeriod.get(period.id);
                  return (
                    <Tr key={period.id} className="hover:bg-hover">
                      <Td className="font-medium">{monthLabel(period.start_date)}</Td>
                      <Td mono className="whitespace-nowrap">{period.start_date}</Td>
                      <Td mono className="whitespace-nowrap">{period.end_date}</Td>
                      <Td mono className="whitespace-nowrap">{period.pay_date}</Td>
                      <Td className="text-ink-2">{FREQUENCIES[period.periods_per_year ?? 12]}</Td>
                      <Td>
                        {run ? (
                          <>
                            <StatusPill status={run.status} />
                            <span className="ml-2 font-mono text-[12px] text-ink-3">Run #{run.id}</span>
                          </>
                        ) : (
                          <span className="text-ink-3">No run yet</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-right">
                        <button
                          type="button"
                          title="Open timesheets"
                          aria-label={`Open timesheets for ${monthLabel(period.start_date)}`}
                          onClick={() => router.push(`/timesheets?period=${period.id}`)}
                          className="size-7 cursor-pointer rounded-[5px] border border-transparent bg-transparent text-ink-2 hover:border-line hover:bg-surface-2"
                        >
                          <Icon name="clock" />
                        </button>
                        <button
                          type="button"
                          title="Delete period"
                          aria-label={`Delete ${monthLabel(period.start_date)}`}
                          onClick={() => setDeleting(period)}
                          className="size-7 cursor-pointer rounded-[5px] border border-transparent bg-transparent text-rose-fg hover:bg-rose-soft"
                        >
                          <Icon name="trash-2" />
                        </button>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </TableCard>
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? `Delete ${monthLabel(deleting.start_date)}?` : ""}
        body="The pay period and its timesheets are removed."
        consequence="Periods used by a payroll run cannot be deleted."
        cta="Delete period"
        icon="trash-2"
        tone="rose"
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
