"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, json } from "@/lib/api";
import { FREQUENCIES, dateRange, monthLabel } from "@/lib/format";
import { invalidateRun } from "@/lib/queries";
import type { PayPeriod, PayrollRun } from "@/lib/types";

export function NewRunDialog({
  open,
  onClose,
  periods,
  runs,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  periods: PayPeriod[];
  runs: PayrollRun[];
  onCreated?: (run: PayrollRun) => void;
}) {
  const titleId = useId();
  const toast = useToast();
  const client = useQueryClient();
  const taken = useMemo(() => new Set(runs.map((run) => run.pay_period)), [runs]);
  const choices = useMemo(() => [...periods].sort((a, b) => b.start_date.localeCompare(a.start_date)), [periods]);
  const firstFree = choices.find((p) => !taken.has(p.id))?.id ?? null;
  const [pick, setPick] = useState<number | null>(firstFree);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPick(firstFree);
      setError("");
    }
  }, [open, firstFree]);

  const create = useMutation({
    mutationFn: (period: number) => api<PayrollRun>("/payroll-runs/", json("POST", { pay_period: period })),
    onSuccess: (run, period) => {
      invalidateRun(client);
      const chosen = periods.find((p) => p.id === period);
      toast("success", `Draft run created for ${chosen ? monthLabel(chosen.start_date) : "the period"}`, "Calculate it to generate payslips");
      onClose();
      onCreated?.(run);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not create the run."),
  });

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} width={420}>
      <div className="px-5 pb-1.5 pt-[18px]">
        <h2 id={titleId} className="m-0 text-xl font-semibold">
          New payroll run
        </h2>
        <p className="m-0 mt-1 text-ink-2">Pick the pay period. The run starts as a draft with no payslips.</p>
      </div>
      <div className="flex max-h-[50vh] flex-col gap-2 overflow-auto px-5 pb-[18px] pt-3">
        {choices.length === 0 && <p className="m-0 text-ink-2">There are no pay periods yet. Create one first under Pay periods.</p>}
        {choices.map((period) => {
          const isTaken = taken.has(period.id);
          const checked = !isTaken && pick === period.id;
          return (
            <label
              key={period.id}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${checked ? "border-primary-fg bg-surface" : "border-line"} ${isTaken ? "cursor-not-allowed bg-surface-2" : "cursor-pointer bg-surface"}`}
            >
              <input
                type="radio"
                name="pk-period"
                checked={checked}
                disabled={isTaken}
                onChange={() => setPick(period.id)}
                className="accent-[var(--pk-primary)]"
              />
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{monthLabel(period.start_date)}</span>
                <span className="font-mono text-[12px] text-ink-3">
                  {dateRange(period.start_date, period.end_date)} · pay {period.pay_date}
                </span>
              </span>
              <span className="text-[12px] text-ink-3">{isTaken ? "Run exists" : (FREQUENCIES[period.periods_per_year ?? 12] ?? "")}</span>
            </label>
          );
        })}
        {error && (
          <p role="alert" className="m-0 text-[12px] text-rose-fg">
            {error}
          </p>
        )}
      </div>
      <ModalFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={pick === null || create.isPending} onClick={() => pick !== null && create.mutate(pick)}>
          Create draft run
        </Button>
      </ModalFooter>
    </Modal>
  );
}
