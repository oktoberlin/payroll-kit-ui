/**
 * Money is a decimal string end to end. Nothing here ever goes through Number or floats:
 * values are parsed to BigInt units + a scale, so sums and conversions are exact.
 */

type Dec = { units: bigint; scale: number };

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

export function parseDecimal(value: string): Dec | null {
  const match = DECIMAL.exec(value.trim());
  if (!match) return null;
  const fraction = match[3] ?? "";
  const units = BigInt(match[2] + fraction) * (match[1] ? -1n : 1n);
  return { units, scale: fraction.length };
}

function rescale(d: Dec, scale: number): bigint {
  return d.units * 10n ** BigInt(scale - d.scale);
}

export function formatDec(d: Dec, minScale = 0): string {
  let { units, scale } = d;
  while (scale < minScale) {
    units *= 10n;
    scale += 1;
  }
  const negative = units < 0n;
  if (negative) units = -units;
  const digits = units.toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const fraction = scale ? digits.slice(-scale) : "";
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

/** "6000.00" -> "6,000.00". The digits are the API's; only grouping (and a 2-decimal floor) is added. */
export function formatMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = parseDecimal(value);
  if (!d) return value;
  const plain = formatDec(d, 2);
  const negative = plain.startsWith("-");
  const [whole, fraction] = plain.replace("-", "").split(".");
  return `${negative ? "-" : ""}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}

/** Exact sum of decimal strings, as a plain decimal string with at least 2 decimals. */
export function addMoney(...values: Array<string | null | undefined>): string {
  let total: Dec = { units: 0n, scale: 2 };
  for (const value of values) {
    if (!value) continue;
    const d = parseDecimal(value);
    if (!d) continue;
    const scale = Math.max(total.scale, d.scale);
    total = { units: rescale(total, scale) + rescale(d, scale), scale };
  }
  return formatDec(total, 2);
}

/** a / b as a plain number between 0 and 1+, for drawing proportional bars only (never for money). */
export function ratio(a: string, b: string): number {
  const x = parseDecimal(a);
  const y = parseDecimal(b);
  if (!x || !y || y.units === 0n) return 0;
  const scale = Math.max(x.scale, y.scale);
  return Number(rescale(x, scale)) / Number(rescale(y, scale));
}

/** "0.0500" -> "5.00": a stored fraction shown as a percentage. */
export function fractionToPercent(fraction: string): string {
  const d = parseDecimal(fraction);
  if (!d) return fraction;
  return formatDec({ units: d.units, scale: Math.max(d.scale - 2, 0) }, 2).replace(/^(-?)(\d+)$/, "$1$2.00");
}

/**
 * "12.5" -> "0.1250": a typed percentage as the API's fraction with `decimals` places.
 * Returns null when the input is not a number or is more precise than the API can store.
 */
export function percentToFraction(percent: string, decimals: 2 | 4): string | null {
  const d = parseDecimal(percent.replace(/\s*%$/, ""));
  if (!d || d.units < 0n) return null;
  let { units, scale } = { units: d.units, scale: d.scale + 2 };
  while (scale > decimals && units % 10n === 0n) {
    units /= 10n;
    scale -= 1;
  }
  if (scale > decimals) return null;
  return formatDec({ units, scale }, decimals);
}

/** A typed amount: digits with up to `decimals` places, optional thousands separators. */
export function parseAmountInput(input: string, decimals = 2): string | null {
  const clean = input.replace(/,/g, "").trim();
  const d = parseDecimal(clean);
  if (!d || d.scale > decimals || d.units < 0n) return null; // amounts are never negative
  return formatDec(d, 0);
}

export function isPositive(value: string): boolean {
  const d = parseDecimal(value);
  return !!d && d.units > 0n;
}

export function compareMoney(a: string, b: string): number {
  const x = parseDecimal(a);
  const y = parseDecimal(b);
  if (!x || !y) return 0;
  const scale = Math.max(x.scale, y.scale);
  const diff = rescale(x, scale) - rescale(y, scale);
  return diff === 0n ? 0 : diff < 0n ? -1 : 1;
}

/** a - b - c ... exactly, as a plain decimal string with at least 2 decimals. */
export function subMoney(first: string, ...rest: Array<string | null | undefined>): string {
  const head = parseDecimal(first);
  if (!head) return first;
  let total: Dec = head;
  for (const value of rest) {
    const d = value ? parseDecimal(value) : null;
    if (!d) continue;
    const scale = Math.max(total.scale, d.scale);
    total = { units: rescale(total, scale) - rescale(d, scale), scale };
  }
  return formatDec(total, 2);
}
