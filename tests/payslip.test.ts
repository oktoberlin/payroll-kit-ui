import { describe, expect, it } from "vitest";

import { describeAudit, diffLines } from "@/lib/audit";
import { equation, payslipGroups, rateLabel, reconciles } from "@/lib/payslip";
import { subMoney } from "@/lib/money";
import type { AuditLog, Payslip } from "@/lib/types";

const slip = {
  id: 1,
  run: 1,
  run_status: "draft",
  period: { start_date: "2026-09-01", end_date: "2026-09-30", pay_date: "2026-10-01" },
  employee: 1,
  employee_number: "E001",
  employee_name: "Ava Stone",
  pay_type: "salary",
  annual_salary: "72000.00",
  hourly_rate: "0.00",
  gross: "6000.00",
  pre_tax_deductions: "420.00",
  taxable: "5580.00",
  tax: "690.93",
  post_tax_deductions: "0.00",
  employer_benefits: "180.00",
  net: "4889.07",
  lines: [
    { kind: "earning", code: "SALARY", description: "Salary", amount: "6000.00" },
    { kind: "pre_tax", code: "RET", description: "Retirement 5%", amount: "300.00" },
    { kind: "pre_tax", code: "HEALTH", description: "Health plan", amount: "120.00" },
    { kind: "tax", code: "TAX", description: "Income tax (illustrative table)", amount: "690.93" },
    { kind: "benefit", code: "MATCH", description: "Employer retirement match", amount: "180.00" },
  ],
} as Payslip;

describe("payslip", () => {
  it("groups lines in order with API totals and the taxable step", () => {
    const groups = payslipGroups(slip);
    expect(groups.map((g) => g.key)).toEqual(["earning", "pre_tax", "tax", "post_tax", "benefit"]);
    expect(groups[1].lines.map((l) => l.code)).toEqual(["RET", "HEALTH"]);
    expect(groups[1].after).toEqual({ label: "Taxable pay", amount: "5580.00" });
    expect(groups[3].lines).toEqual([]); // no post-tax this period
    expect(groups[4]).toMatchObject({ muted: true, tag: "Not deducted", total: "180.00" });
  });
  it("reconciles to the cent, and notices when it does not", () => {
    expect(reconciles(slip)).toBe(true);
    expect(reconciles({ ...slip, net: "4889.08" })).toBe(false);
    expect(subMoney("6000.00", "420.00", "690.93", "0.00")).toBe("4889.07");
  });
  it("formats the equation and rate", () => {
    expect(equation(slip)).toBe("6,000.00 − 420.00 − 690.93 − 0.00 = 4,889.07");
    expect(rateLabel(slip)).toBe("Salary · 72,000.00 / yr");
    expect(rateLabel({ ...slip, pay_type: "hourly", hourly_rate: "22.50" })).toBe("Hourly · 22.50 / h");
  });
});

const entry = (over: Partial<AuditLog>): AuditLog =>
  ({ id: 1, actor: "demo_admin", action: "updated", object_type: "Employee", object_id: "2", object_label: "E002 Ben Carter", changes: {}, created_at: "", ...over }) as AuditLog;

describe("audit", () => {
  it("describes known and generic actions", () => {
    expect(describeAudit(entry({ action: "payroll_run.paid", object_label: "Aug 2026 run" }))).toMatchObject({ verb: "marked paid", object: "Aug 2026 run" });
    expect(describeAudit(entry({ action: "created", object_type: "EmployeeDeduction" })).verb).toBe("assigned");
    expect(describeAudit(entry({ action: "updated", object_type: "TimesheetEntry" })).verb).toBe("updated timesheet for");
    expect(describeAudit(entry({ object_label: "" })).object).toBe("Employee #2");
  });
  it("renders old/new, new-only and plain facts as +/- lines", () => {
    expect(diffLines({ email: { old: "a@x.co", new: "b@x.co" } })).toEqual([
      { sign: "-", key: "email", value: '"a@x.co"' },
      { sign: "+", key: "email", value: '"b@x.co"' },
    ]);
    expect(diffLines({ value: { new: null } })).toEqual([{ sign: "+", key: "value", value: "null" }]);
    expect(diffLines({ payslips: 6, input_hash: "abc" })).toEqual([
      { sign: "+", key: "payslips", value: "6" },
      { sign: "+", key: "input_hash", value: '"abc"' },
    ]);
    expect(diffLines(null)).toEqual([]);
  });
});
