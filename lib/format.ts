const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "2026-09-01" -> "Sep 2026". Pure string work: no timezone surprises. */
export function monthLabel(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function weekday(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function dateRange(start: string, end: string): string {
  return `${start} → ${end}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-12T09:58:03Z" -> "2026-10-12 09:58" (UTC, the zone the audit log is shown in). */
export function utcStamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "2026-10-12T10:42:00Z" -> "12 Oct 10:42" (UTC). */
export function shortStamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function initials(name: string): string {
  return name
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export const FREQUENCIES: Record<number, string> = {
  12: "Monthly",
  24: "Semi-monthly",
  26: "Bi-weekly",
  52: "Weekly",
};

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
