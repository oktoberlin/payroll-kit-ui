import { describe, expect, it } from "vitest";

import { emptyEmployee, fromEmployee, toPayload, validateEmployee } from "@/lib/employee-form";
import type { Employee } from "@/lib/types";

const ok = { ...emptyEmployee(), number: "E010", first: "Ava", last: "Stone", email: "ava@example.com", salary: "72000.00" };

describe("validateEmployee", () => {
  it("accepts a complete salaried employee", () => {
    expect(validateEmployee(ok)).toEqual({});
  });
  it("requires the identity fields and a valid email", () => {
    const errors = validateEmployee({ ...emptyEmployee(), email: "ava@example" });
    expect(Object.keys(errors).sort()).toEqual(["amount", "email", "first", "last", "number"]);
  });
  it("names the person who already has the number", () => {
    const errors = validateEmployee(ok, [{ number: "E010", name: "Ben Carter" }]);
    expect(errors.number).toBe("E010 is already used by Ben Carter");
  });
  it("checks the amount for the chosen pay type", () => {
    expect(validateEmployee({ ...ok, salary: "0" }).amount).toContain("annual_salary must be > 0");
    expect(validateEmployee({ ...ok, pay: "hourly", rate: "12O" }).amount).toContain("decimal amount");
    expect(validateEmployee({ ...ok, pay: "hourly", rate: "22.50", salary: "" })).toEqual({});
  });
  it("checks the overtime multiplier and the dates", () => {
    expect(validateEmployee({ ...ok, ot: "0.5" }).ot).toContain("at least 1");
    expect(validateEmployee({ ...ok, ot: "x" }).ot).toContain("multiplier");
    expect(validateEmployee({ ...ok, hire: "2026-03-01", term: "2026-02-15" }).term).toContain("2026-03-01");
  });
});

describe("payload", () => {
  it("builds strings the API accepts and nulls for empty optionals", () => {
    expect(toPayload({ ...ok, salary: "72,000.00" })).toMatchObject({
      employee_number: "E010",
      pay_type: "salary",
      annual_salary: "72000.00",
      hourly_rate: "0",
      tax_table: null,
      hire_date: null,
      termination_date: null,
      is_active: true,
    });
  });
  it("round-trips an API employee", () => {
    const api = {
      id: 1,
      employee_number: "E001",
      first_name: "Ava",
      last_name: "Stone",
      email: "ava@example.com",
      pay_type: "salary",
      annual_salary: "72000.00",
      hourly_rate: "0.00",
      overtime_multiplier: "1.50",
      tax_table: 3,
      is_active: true,
      hire_date: null,
      termination_date: null,
      deductions: [],
      created_at: "",
    } as Employee;
    const values = fromEmployee(api);
    expect(values.taxTable).toBe("3");
    expect(toPayload(values).tax_table).toBe(3);
  });
});
