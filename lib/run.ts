import { shortStamp } from "./format";
import type { PayrollRun } from "./types";

/** The three status lines under a run: who calculated, approved and paid it, and when. */
export function runLines(run: PayrollRun) {
  return {
    calc: run.calculated_at ? `Calculated by ${run.calculated_by ?? "system"}, ${shortStamp(run.calculated_at)}` : "Not calculated yet",
    approved: run.approved_at ? `Approved by ${run.approved_by}, ${shortStamp(run.approved_at)}` : "Needs an admin",
    paid: run.paid_at ? `Paid by ${run.paid_by}, ${shortStamp(run.paid_at)}` : `Pay date ${run.period.pay_date}`,
  };
}

/** The line that matches the run's current status. */
export function statusLine(run: PayrollRun): string {
  const lines = runLines(run);
  return run.status === "paid" ? lines.paid : run.status === "approved" ? lines.approved : lines.calc;
}
