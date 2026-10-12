import { formatMoney, fractionToPercent, parseAmountInput, percentToFraction } from "./money";
import type { DeductionType, EmployeeDeduction } from "./types";

type Method = DeductionType["method"];

/** A stored value for display: percentages as "5.00 %", fixed amounts as money. */
export function displayValue(method: Method | undefined, value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return method === "percent" ? `${fractionToPercent(value)} %` : formatMoney(value);
}

/**
 * A typed value -> what the API stores. Percentages are stored as fractions with 2 decimals
 * (whole percents); fixed amounts as plain decimals. Null means "not a valid value".
 */
export function parseDeductionValue(method: Method, input: string): string | null {
  return method === "percent" ? percentToFraction(input, 2) : parseAmountInput(input);
}

export function valueHint(method: Method): string {
  return method === "percent" ? "Whole percent of gross, e.g. 5" : "Amount per period, e.g. 120.00";
}

export type Desired = { typeId: number; on: boolean; override: string };
export type AssignmentPlan = {
  create: Array<{ deduction_type: number; value: string | null }>;
  update: Array<{ id: number; value: string | null }>;
  remove: number[];
  invalid: number[]; // type ids whose override could not be parsed
};

/** What must change on the server to turn an employee's current assignments into the desired ones. */
export function planAssignments(existing: EmployeeDeduction[], desired: Desired[], types: DeductionType[]): AssignmentPlan {
  const plan: AssignmentPlan = { create: [], update: [], remove: [], invalid: [] };
  for (const want of desired) {
    const type = types.find((t) => t.id === want.typeId);
    const current = existing.find((e) => e.deduction_type === want.typeId);
    if (!type) continue;
    if (!want.on) {
      if (current) plan.remove.push(current.id);
      continue;
    }
    const raw = want.override.trim();
    const value = raw === "" ? null : parseDeductionValue(type.method, raw);
    if (raw !== "" && value === null) {
      plan.invalid.push(want.typeId);
      continue;
    }
    if (!current) plan.create.push({ deduction_type: want.typeId, value });
    else if ((current.value ?? null) !== value && !sameNumber(current.value ?? null, value)) plan.update.push({ id: current.id, value });
  }
  return plan;
}

function sameNumber(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return Number(a) === Number(b); // only for deciding "did the stored value change": 0.08 vs 0.0800
}

/** The override text to show in an edit box: a stored fraction as a percent, or an amount. */
export function overrideText(method: Method, stored: string | null | undefined): string {
  if (stored === null || stored === undefined) return "";
  return method === "percent" ? fractionToPercent(stored).replace(/\.00$/, "") : formatMoney(stored).replace(/,/g, "");
}
