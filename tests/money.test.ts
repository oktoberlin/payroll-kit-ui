import { describe, expect, it } from "vitest";

import {
  addMoney,
  compareMoney,
  formatMoney,
  fractionToPercent,
  parseAmountInput,
  percentToFraction,
  ratio,
} from "@/lib/money";

describe("formatMoney", () => {
  it("groups thousands and keeps the API digits", () => {
    expect(formatMoney("6000.00")).toBe("6,000.00");
    expect(formatMoney("1234567.50")).toBe("1,234,567.50");
    expect(formatMoney("0.00")).toBe("0.00");
    expect(formatMoney("-1234.5")).toBe("-1,234.50");
  });
  it("shows a dash for missing values and leaves non-numbers alone", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney("n/a")).toBe("n/a");
  });
  it("is exact beyond float precision", () => {
    expect(formatMoney("9007199254740993.01")).toBe("9,007,199,254,740,993.01");
  });
});

describe("addMoney", () => {
  it("sums exactly (0.1 + 0.2 is 0.30)", () => {
    expect(addMoney("0.10", "0.20")).toBe("0.30");
    expect(addMoney("6000.00", "180.00")).toBe("6180.00");
  });
  it("ignores empty values and handles mixed scales", () => {
    expect(addMoney("1.005", null, "2")).toBe("3.005");
    expect(addMoney()).toBe("0.00");
  });
});

describe("percent conversion", () => {
  it("shows stored fractions as percentages", () => {
    expect(fractionToPercent("0.05")).toBe("5.00");
    expect(fractionToPercent("0.1250")).toBe("12.50");
    expect(fractionToPercent("1.0000")).toBe("100.00");
    expect(fractionToPercent("0")).toBe("0.00");
  });
  it("converts typed percentages to the stored fraction", () => {
    expect(percentToFraction("5", 2)).toBe("0.05");
    expect(percentToFraction("12.5", 4)).toBe("0.1250");
    expect(percentToFraction("12 %", 4)).toBe("0.1200");
    expect(percentToFraction("100", 4)).toBe("1.0000");
  });
  it("rejects what the API cannot store", () => {
    expect(percentToFraction("5.5", 2)).toBeNull(); // deductions keep 2 decimals: whole percents only
    expect(percentToFraction("12.345", 4)).toBeNull();
    expect(percentToFraction("abc", 4)).toBeNull();
    expect(percentToFraction("-1", 4)).toBeNull();
  });
});

describe("amount input", () => {
  it("accepts up to two decimals and strips separators", () => {
    expect(parseAmountInput("72,000.00")).toBe("72000.00");
    expect(parseAmountInput("54000")).toBe("54000");
    expect(parseAmountInput("1.234")).toBeNull();
    expect(parseAmountInput("12O")).toBeNull();
    expect(parseAmountInput("-5")).toBeNull();
  });
});

describe("comparisons", () => {
  it("compares and proportions without floats for money", () => {
    expect(compareMoney("10.00", "9.99")).toBe(1);
    expect(compareMoney("1.50", "1.5")).toBe(0);
    expect(ratio("6000.00", "8240")).toBeCloseTo(0.728, 3);
  });
});
