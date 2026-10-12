import { compareMoney, parseAmountInput } from "./money";

export type Hours = { reg: string; ot: string };

/** Hours: a non-negative decimal with up to 2 places (the API stores 6 digits, 2 decimals). */
export function validHours(value: string): boolean {
  const parsed = parseAmountInput(value, 2);
  return parsed !== null && parsed.replace(".", "").length <= 6;
}

export function sameHours(a: Hours, b: Hours): boolean {
  const eq = (x: string, y: string) => validHours(x) && validHours(y) && compareMoney(parseAmountInput(x)!, parseAmountInput(y)!) === 0;
  return eq(a.reg, b.reg) && eq(a.ot, b.ot);
}

export type RowState = "saved" | "edited" | "invalid";

export function rowState(current: Hours, saved: Hours): RowState {
  if (!validHours(current.reg) || !validHours(current.ot)) return "invalid";
  return sameHours(current, saved) ? "saved" : "edited";
}
