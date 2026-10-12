import type { IconName } from "@/components/ui/Icon";

import type { AuditLog } from "./types";

export type AuditDescription = { icon: IconName; verb: string; object: string };

const RUN_ACTIONS: Record<string, { icon: IconName; verb: string }> = {
  "payroll_run.calculated": { icon: "calculator", verb: "calculated" },
  "payroll_run.approved": { icon: "check", verb: "approved" },
  "payroll_run.reopened": { icon: "rotate-ccw", verb: "reopened" },
  "payroll_run.paid": { icon: "lock", verb: "marked paid" },
  "payroll_run.exported": { icon: "file-spreadsheet", verb: "exported the register of" },
  "employees.imported": { icon: "upload", verb: "imported" },
};

const TYPE_ICON: Record<string, IconName> = {
  Employee: "user-pen",
  TimesheetEntry: "clock",
  EmployeeDeduction: "percent",
  DeductionType: "percent",
  TaxTable: "landmark",
  PayPeriod: "calendar-range",
  PayrollRun: "wallet",
};

/** A sentence-ready description of an audit entry: "<actor> <verb> <object>". */
export function describeAudit(entry: AuditLog): AuditDescription {
  const object = entry.object_label || `${entry.object_type} #${entry.object_id}`;
  const known = RUN_ACTIONS[entry.action];
  if (known) return { ...known, object };

  const icon = TYPE_ICON[entry.object_type] ?? "scroll-text";
  if (entry.action === "created") {
    if (entry.object_type === "EmployeeDeduction") return { icon, verb: "assigned", object };
    return { icon: entry.object_type === "PayrollRun" ? "plus" : icon, verb: "created", object };
  }
  if (entry.action === "updated") {
    return { icon, verb: entry.object_type === "TimesheetEntry" ? "updated timesheet for" : "updated", object };
  }
  if (entry.action === "deleted") return { icon: "trash-2", verb: "deleted", object };
  return { icon, verb: entry.action, object };
}

export type DiffLine = { sign: "+" | "-"; key: string; value: string };

/** JSON-ish display of a stored value: strings quoted, null and numbers bare. */
export function showValue(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

/**
 * Turn an entry's `changes` into +/- lines. Updates store {old, new} per field; creates store {new};
 * service entries (calculated, imported) hold plain facts, shown as additions.
 */
export function diffLines(changes: unknown): DiffLine[] {
  if (!changes || typeof changes !== "object") return [];
  const lines: DiffLine[] = [];
  for (const [key, raw] of Object.entries(changes as Record<string, unknown>)) {
    const isDiff = !!raw && typeof raw === "object" && !Array.isArray(raw) && ("old" in raw || "new" in raw);
    if (isDiff) {
      const change = raw as { old?: unknown; new?: unknown };
      if ("old" in change) lines.push({ sign: "-", key, value: showValue(change.old) });
      if ("new" in change) lines.push({ sign: "+", key, value: showValue(change.new) });
    } else {
      lines.push({ sign: "+", key, value: showValue(raw) });
    }
  }
  return lines;
}
