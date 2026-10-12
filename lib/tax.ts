import { compareMoney, formatMoney, fractionToPercent, parseAmountInput, percentToFraction } from "./money";
import type { TaxBracket, TaxTable } from "./types";

export type BracketRow = { lower: string; upper: string; noCap: boolean; rate: string };
export type BracketErrors = Array<{ lower?: string; upper?: string; rate?: string }>;

/** API brackets -> editable rows (amounts grouped, rates as percentages). */
export function toRows(brackets: TaxBracket[]): BracketRow[] {
  return [...brackets]
    .sort((a, b) => compareMoney(a.lower, b.lower))
    .map((b) => ({
      lower: formatMoney(b.lower),
      upper: b.upper === null || b.upper === undefined ? "" : formatMoney(b.upper),
      noCap: b.upper === null || b.upper === undefined,
      rate: fractionToPercent(b.rate),
    }));
}

const amount = (s: string) => parseAmountInput(s);

/** The rules from the design: start at 0, contiguous, upper > lower, only the last uncapped, rate 0-100. */
export function validateBrackets(rows: BracketRow[]): { errors: BracketErrors; list: string[] } {
  const errors: BracketErrors = rows.map(() => ({}));
  const list: string[] = [];
  rows.forEach((row, i) => {
    const lower = amount(row.lower);
    const upper = row.noCap ? null : amount(row.upper);
    if (lower === null) {
      errors[i].lower = "Enter an amount";
      list.push(`Bracket ${i + 1}: lower must be an amount with up to 2 decimals.`);
    } else if (i === 0 && compareMoney(lower, "0") !== 0) {
      errors[i].lower = "First bracket starts at 0.00";
      list.push("Bracket 1 must start at 0.00.");
    } else if (i > 0) {
      const previous = rows[i - 1];
      const previousUpper = previous.noCap ? null : amount(previous.upper);
      if (previousUpper !== null && compareMoney(previousUpper, lower) !== 0) {
        errors[i].lower = `Should be ${formatMoney(previousUpper)}`;
        list.push(`Bracket ${i + 1} starts at ${formatMoney(lower)} but bracket ${i} ends at ${formatMoney(previousUpper)}. Brackets must be contiguous.`);
      }
    }
    if (!row.noCap) {
      if (upper === null) {
        errors[i].upper = "Enter an amount or tick No cap";
        list.push(`Bracket ${i + 1}: upper is missing.`);
      } else if (lower !== null && compareMoney(upper, lower) <= 0) {
        errors[i].upper = "Must be greater than lower";
        list.push(`Bracket ${i + 1}: upper must be greater than lower.`);
      }
    } else if (i !== rows.length - 1) {
      errors[i].upper = "Only the last bracket can have no cap";
      list.push(`Bracket ${i + 1}: only the last bracket can have no cap.`);
    }
    if (i === rows.length - 1 && !row.noCap) {
      errors[i].upper ||= "Last bracket needs No cap";
      list.push("The last bracket must have no cap so every income is covered.");
    }
    const fraction = percentToFraction(row.rate, 4);
    if (fraction === null || compareMoney(fraction, "1") > 0) {
      errors[i].rate = "Between 0 and 100";
      list.push(`Bracket ${i + 1}: rate must be between 0 and 100 %.`);
    }
  });
  if (rows.length === 0) list.push("Add at least one bracket.");
  return { errors, list: [...new Set(list)] };
}

/** Editable rows -> the API's nested brackets. Call only when validateBrackets finds nothing. */
export function toBrackets(rows: BracketRow[]) {
  return rows.map((row) => ({
    lower: amount(row.lower) as string,
    upper: row.noCap ? null : (amount(row.upper) as string),
    rate: percentToFraction(row.rate, 4) as string,
  }));
}

export function newTable(): Pick<TaxTable, "name"> & { brackets: Array<{ lower: string; upper: null; rate: string }> } {
  return { name: "New tax table", brackets: [{ lower: "0.00", upper: null, rate: "0.0000" }] };
}
