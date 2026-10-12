"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { ErrorState, SkeletonRows } from "@/components/ui/States";
import { Table, TableCard, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, ApiError, json } from "@/lib/api";
import { monthLabel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { invalidateRunInputs, useEmployees, usePayPeriods, useRuns, useTimesheets } from "@/lib/queries";
import { rowState, validHours, type Hours } from "@/lib/timesheets";
import { parseAmountInput } from "@/lib/money";
import type { TimesheetEntry } from "@/lib/types";

function TimesheetsView() {
  usePageTitle("Timesheets");
  const search = useSearchParams();
  const periods = usePayPeriods();
  const runs = useRuns();
  const employees = useEmployees();
  const toast = useToast();
  const client = useQueryClient();

  const list = useMemo(() => periods.data ?? [], [periods.data]);
  const runByPeriod = useMemo(() => new Map((runs.data ?? []).map((r) => [r.pay_period, r])), [runs.data]);
  const fromUrl = Number(search.get("period")) || null;
  const fallback = useMemo(() => {
    const open = list.find((p) => runByPeriod.get(p.id)?.status === "draft");
    return (open ?? list[0])?.id ?? null;
  }, [list, runByPeriod]);
  const [chosen, setChosen] = useState<number | null>(null);
  const periodId = chosen ?? fromUrl ?? fallback;

  const entries = useTimesheets(periodId);
  const run = periodId ? runByPeriod.get(periodId) : undefined;
  const locked = run?.status === "paid";
  const period = list.find((p) => p.id === periodId);

  const staff = (employees.data ?? []).filter((e) => e.is_active !== false);
  const entryByEmployee = useMemo(() => new Map((entries.data ?? []).map((t) => [t.employee, t])), [entries.data]);
  const savedFor = (employeeId: number): Hours => {
    const entry = entryByEmployee.get(employeeId);
    return { reg: entry?.regular_hours ?? "0.00", ot: entry?.overtime_hours ?? "0.00" };
  };

  const [values, setValues] = useState<Record<number, Hours>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  useEffect(() => {
    const next: Record<number, Hours> = {};
    for (const e of staff) if (e.pay_type === "hourly") next[e.id] = savedFor(e.id);
    setValues(next);
    setRowErrors({});
    // reset the editable copy whenever the saved data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.dataUpdatedAt, employees.dataUpdatedAt, periodId]);

  const hourly = staff.filter((e) => e.pay_type === "hourly");
  const states = hourly.map((e) => (values[e.id] ? rowState(values[e.id], savedFor(e.id)) : "saved"));
  const dirty = states.filter((s) => s === "edited").length;
  const bad = states.filter((s) => s === "invalid").length;

  const save = useMutation({
    mutationFn: async () => {
      const failures: Record<number, string> = {};
      for (const employee of hourly) {
        const current = values[employee.id];
        if (!current || rowState(current, savedFor(employee.id)) !== "edited") continue;
        const body = { regular_hours: parseAmountInput(current.reg), overtime_hours: parseAmountInput(current.ot) };
        const existing = entryByEmployee.get(employee.id);
        try {
          await api<TimesheetEntry>(
            existing ? `/timesheets/${existing.id}/` : "/timesheets/",
            json(existing ? "PATCH" : "POST", existing ? body : { employee: employee.id, pay_period: periodId, ...body }),
          );
        } catch (e) {
          failures[employee.id] = e instanceof ApiError ? e.message : "Could not save";
        }
      }
      return failures;
    },
    onSuccess: (failures) => {
      client.invalidateQueries({ queryKey: ["timesheets"] });
      invalidateRunInputs(client);
      setRowErrors(failures);
      if (Object.keys(failures).length) toast("error", "Some rows could not be saved", "Fix them and save again");
      else toast("success", "Timesheets saved", run?.status === "draft" ? `${monthLabel(period!.start_date)} run needs recalculation` : "PATCH /api/timesheets/ · 200");
    },
  });

  const setHours = (employeeId: number, key: keyof Hours, value: string) =>
    setValues((v) => ({ ...v, [employeeId]: { ...v[employeeId], [key]: value } }));

  const input = (employeeId: number, key: keyof Hours, label: string) => {
    const current = values[employeeId]?.[key] ?? "";
    const invalid = !validHours(current);
    const changed = values[employeeId] && current !== savedFor(employeeId)[key] && !invalid && rowState(values[employeeId], savedFor(employeeId)) === "edited";
    return (
      <input
        value={current}
        onChange={(e) => setHours(employeeId, key, e.target.value)}
        readOnly={locked}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={invalid || undefined}
        className={cn(
          "pk-money h-control w-full rounded-[5px] border px-2",
          invalid ? "border-rose" : changed ? "border-amber" : "border-line-strong",
          locked ? "bg-surface-2" : "bg-surface",
        )}
      />
    );
  };

  if (periods.isError) return <ErrorState message="The pay periods could not be loaded." onRetry={() => periods.refetch()} />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Timesheets"
        subtitle="Hours for hourly employees. Salaried employees are paid from their annual salary."
        actions={
          <label className="flex items-center gap-2 text-ink-2">
            Pay period
            <Select value={periodId ?? ""} onChange={(e) => setChosen(Number(e.target.value))} className="!w-auto">
              {list.map((p) => {
                const r = runByPeriod.get(p.id);
                return (
                  <option key={p.id} value={p.id}>
                    {monthLabel(p.start_date)} · {r ? `${r.status} run` : "no run"}
                  </option>
                );
              })}
            </Select>
          </label>
        }
      />
      {locked && period && (
        <Banner tone="info" icon="lock" className="!border-line">
          <strong className="font-semibold">{monthLabel(period.start_date)} is paid.</strong> <span className="text-ink-2">Its timesheets are locked and shown read-only.</span>
        </Banner>
      )}
      {run?.status === "approved" && period && (
        <Banner tone="accent">The {monthLabel(period.start_date)} run is approved. Changes here only take effect if an admin reopens and recalculates it.</Banner>
      )}
      <TableCard>
        {(employees.isLoading || entries.isLoading || periods.isLoading) && <SkeletonRows rows={6} cols={5} label="Loading timesheets" />}
        {periodId !== null && employees.isSuccess && entries.isSuccess && (
          <>
            <div className="overflow-auto">
              <Table>
                <thead>
                  <tr>
                    <Th sticky={false} className="pl-4">Employee</Th>
                    <Th sticky={false} align="right">Rate ($ / h)</Th>
                    <Th sticky={false} align="right" className="w-[150px]">Regular hours</Th>
                    <Th sticky={false} align="right" className="w-[150px]">Overtime hours</Th>
                    <Th sticky={false} align="right">OT ×</Th>
                    <Th sticky={false} className="pr-4">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((e) => {
                    const i = hourly.findIndex((h) => h.id === e.id);
                    const state = i >= 0 ? states[i] : "saved";
                    return (
                      <tr key={e.id}>
                        <Td className="whitespace-nowrap pl-4">
                          <span className="mr-2 font-mono text-[12px] text-ink-3">{e.employee_number}</span>
                          <span className="font-medium">
                            {e.first_name} {e.last_name}
                          </span>
                        </Td>
                        {e.pay_type === "salary" ? (
                          <td colSpan={4} className="h-row border-b border-line bg-surface-2 px-3 text-center text-ink-3">
                            Salaried · no timesheet needed
                          </td>
                        ) : (
                          <>
                            <Td money>
                              <Money value={e.hourly_rate} />
                            </Td>
                            <td className="h-row border-b border-line px-2 py-[3px] align-top">{input(e.id, "reg", `${e.first_name} ${e.last_name} regular hours`)}</td>
                            <td className="h-row border-b border-line px-2 py-[3px] align-top">{input(e.id, "ot", `${e.first_name} ${e.last_name} overtime hours`)}</td>
                            <Td money className="text-ink-2">
                              {e.overtime_multiplier}
                            </Td>
                          </>
                        )}
                        <Td className="whitespace-nowrap pr-4">
                          {rowErrors[e.id] && (
                            <span className="inline-flex items-center gap-[5px] text-[12px] text-rose-fg">
                              <Icon name="circle-alert" />
                              {rowErrors[e.id]}
                            </span>
                          )}
                          {!rowErrors[e.id] && e.pay_type === "hourly" && state === "invalid" && (
                            <span className="inline-flex items-center gap-[5px] text-[12px] text-rose-fg">
                              <Icon name="circle-alert" />
                              Hours ≥ 0, max 2 decimals
                            </span>
                          )}
                          {!rowErrors[e.id] && e.pay_type === "hourly" && state === "edited" && (
                            <span className="inline-flex items-center gap-[5px] text-[12px] text-amber-fg">
                              <Icon name="pencil" />
                              Edited, not saved
                            </span>
                          )}
                          {!rowErrors[e.id] && e.pay_type === "hourly" && state === "saved" && <span className="text-[12px] text-ink-3">{locked ? "Locked" : "Saved"}</span>}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-surface-2 py-2.5 pl-4 pr-3">
              <span className="text-sm text-ink-2">
                {locked ? "Read-only" : bad ? `${bad} row${bad > 1 ? "s" : ""} with invalid hours` : dirty ? `${dirty} unsaved change${dirty > 1 ? "s" : ""}` : "All changes saved"}
              </span>
              <span className="flex-1" />
              <Button
                disabled={!dirty || locked}
                onClick={() => {
                  const reset: Record<number, Hours> = {};
                  for (const e of hourly) reset[e.id] = savedFor(e.id);
                  setValues(reset);
                  setRowErrors({});
                }}
              >
                Discard
              </Button>
              <Button variant="primary" icon="check" disabled={!dirty || !!bad || locked || save.isPending} onClick={() => save.mutate()}>
                Save timesheets
              </Button>
            </div>
          </>
        )}
      </TableCard>
    </div>
  );
}

export default function TimesheetsPage() {
  return (
    <Suspense>
      <TimesheetsView />
    </Suspense>
  );
}
