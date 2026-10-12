import { describe, expect, it } from "vitest";

import { nextPeriodDefaults } from "@/lib/periods";
import { rowState, sameHours, validHours } from "@/lib/timesheets";

describe("nextPeriodDefaults", () => {
  it("continues after the latest period, to month end, paid on the next weekday", () => {
    expect(nextPeriodDefaults([{ start_date: "2026-09-01", end_date: "2026-09-30" }])).toEqual({
      start: "2026-10-01",
      end: "2026-10-31",
      pay: "2026-11-02", // 1 Nov 2026 is a Sunday
    });
  });
  it("handles year end and February", () => {
    expect(nextPeriodDefaults([{ start_date: "2026-11-01", end_date: "2026-11-30" }])).toMatchObject({ start: "2026-12-01", end: "2026-12-31", pay: "2027-01-01" });
    expect(nextPeriodDefaults([{ start_date: "2027-01-01", end_date: "2027-01-31" }])).toMatchObject({ start: "2027-02-01", end: "2027-02-28" });
  });
});

describe("timesheet hours", () => {
  it("accepts non-negative decimals with up to 2 places", () => {
    expect(validHours("160")).toBe(true);
    expect(validHours("6.50")).toBe(true);
    expect(validHours("0")).toBe(true);
    expect(validHours("12O")).toBe(false);
    expect(validHours("1.234")).toBe(false);
    expect(validHours("-1")).toBe(false);
    expect(validHours("")).toBe(false);
  });
  it("treats 160 and 160.00 as the same value", () => {
    expect(sameHours({ reg: "160", ot: "12" }, { reg: "160.00", ot: "12.00" })).toBe(true);
    expect(sameHours({ reg: "160", ot: "8" }, { reg: "160.00", ot: "12.00" })).toBe(false);
  });
  it("classifies rows", () => {
    const saved = { reg: "120.00", ot: "0.00" };
    expect(rowState({ reg: "120", ot: "0" }, saved)).toBe("saved");
    expect(rowState({ reg: "168", ot: "0" }, saved)).toBe("edited");
    expect(rowState({ reg: "12O", ot: "0" }, saved)).toBe("invalid");
  });
});
