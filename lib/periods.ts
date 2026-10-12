const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const utc = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

function firstWeekdayOnOrAfter(date: Date): Date {
  const d = new Date(date);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** Suggested dates for the next monthly period: the day after the latest one, to month end, paid on the first weekday after. */
export function nextPeriodDefaults(existing: Array<{ start_date: string; end_date: string }>) {
  const last = existing.reduce<string | null>((max, p) => (max === null || p.end_date > max ? p.end_date : max), null);
  const start = last ? new Date(utc(last).getTime() + 86_400_000) : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  const pay = firstWeekdayOnOrAfter(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)));
  return { start: iso(start), end: iso(end), pay: iso(pay) };
}
