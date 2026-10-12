import { describe, expect, it } from "vitest";

import { displayValue, overrideText, parseDeductionValue, planAssignments } from "@/lib/deductions";
import { toBrackets, toRows, validateBrackets, type BracketRow } from "@/lib/tax";
import type { DeductionType, EmployeeDeduction, TaxBracket } from "@/lib/types";

const RET = { id: 1, code: "RET", name: "Retirement", kind: "deduction", method: "percent", default_value: "0.05", pre_tax: true } as DeductionType;
const HEALTH = { id: 2, code: "HEALTH", name: "Health", kind: "deduction", method: "fixed", default_value: "120.00", pre_tax: true } as DeductionType;
const types = [RET, HEALTH];

describe("deductions", () => {
  it("shows percent fractions as percentages and fixed amounts as money", () => {
    expect(displayValue("percent", "0.05")).toBe("5.00 %");
    expect(displayValue("fixed", "1200.5")).toBe("1,200.50");
    expect(displayValue("fixed", null)).toBe("—");
  });
  it("parses typed values for each method (percent in whole steps)", () => {
    expect(parseDeductionValue("percent", "8")).toBe("0.08");
    expect(parseDeductionValue("percent", "5.5")).toBeNull();
    expect(parseDeductionValue("fixed", "120.50")).toBe("120.50");
    expect(parseDeductionValue("fixed", "abc")).toBeNull();
  });
  it("round-trips an override into an edit box", () => {
    expect(overrideText("percent", "0.08")).toBe("8");
    expect(overrideText("fixed", "1200.00")).toBe("1200.00");
    expect(overrideText("fixed", null)).toBe("");
  });

  const have: EmployeeDeduction[] = [{ id: 10, deduction_type: 1, value: null }, { id: 11, deduction_type: 2, value: "100.00" }];
  it("plans creates, updates and removals", () => {
    const plan = planAssignments(
      have,
      [
        { typeId: 1, on: true, override: "8" }, // new override on RET
        { typeId: 2, on: false, override: "" }, // HEALTH removed
      ],
      types,
    );
    expect(plan).toEqual({ create: [], update: [{ id: 10, value: "0.08" }], remove: [11], invalid: [] });
  });
  it("creates missing assignments and ignores unchanged ones", () => {
    expect(planAssignments([], [{ typeId: 2, on: true, override: "" }], types).create).toEqual([{ deduction_type: 2, value: null }]);
    expect(planAssignments(have, [{ typeId: 2, on: true, override: "100" }], types)).toMatchObject({ create: [], update: [], remove: [] });
  });
  it("flags overrides that cannot be stored", () => {
    expect(planAssignments(have, [{ typeId: 1, on: true, override: "5.5" }], types).invalid).toEqual([1]);
  });
});

const api: TaxBracket[] = [
  { id: 1, lower: "0.00", upper: "12000.00", rate: "0.0000" },
  { id: 2, lower: "12000.00", upper: "50000.00", rate: "0.1200" },
  { id: 3, lower: "50000.00", upper: "100000.00", rate: "0.2200" },
  { id: 4, lower: "100000.00", upper: null, rate: "0.3000" },
];

describe("tax brackets", () => {
  it("converts to editable rows and back without changing the numbers", () => {
    const rows = toRows(api);
    expect(rows[1]).toEqual({ lower: "12,000.00", upper: "50,000.00", noCap: false, rate: "12.00" });
    expect(rows[3]).toMatchObject({ noCap: true, upper: "" });
    expect(toBrackets(rows)).toEqual([
      { lower: "0.00", upper: "12000.00", rate: "0.0000" },
      { lower: "12000.00", upper: "50000.00", rate: "0.1200" },
      { lower: "50000.00", upper: "100000.00", rate: "0.2200" },
      { lower: "100000.00", upper: null, rate: "0.3000" },
    ]);
  });
  it("accepts the seeded table", () => {
    expect(validateBrackets(toRows(api)).list).toEqual([]);
  });
  it("finds the design's invalid example: a gap and a rate of 130", () => {
    const rows: BracketRow[] = toRows(api);
    rows[2].lower = "48,000.00";
    rows[3].rate = "130";
    const { errors, list } = validateBrackets(rows);
    expect(errors[2].lower).toBe("Should be 50,000.00");
    expect(errors[3].rate).toBe("Between 0 and 100");
    expect(list).toHaveLength(2);
  });
  it("enforces the first bracket, upper > lower, and a single open top bracket", () => {
    const base = toRows(api);
    expect(validateBrackets([{ ...base[0], lower: "10" }, ...base.slice(1)]).errors[0].lower).toContain("starts at 0.00");
    expect(validateBrackets([{ ...base[0], upper: "0.00" }, ...base.slice(1)]).errors[0].upper).toContain("greater");
    expect(validateBrackets([{ ...base[0], noCap: true }, ...base.slice(1)]).errors[0].upper).toContain("Only the last");
    expect(validateBrackets(base.slice(0, 3)).errors[2].upper).toContain("No cap");
    expect(validateBrackets([]).list).toEqual(["Add at least one bracket."]);
  });
});
